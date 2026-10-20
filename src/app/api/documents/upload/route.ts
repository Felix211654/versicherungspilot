import { NextResponse, type NextRequest } from "next/server";
import { requireViewerApi, UnauthorizedError } from "@/server/auth/session";
import { uploadDocument, UserFacingError } from "@/server/services/documents";
import { rateLimit } from "@/server/lib/rate-limit";
import { env } from "@/server/env";
import { logger, safeErrorMessage } from "@/server/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const viewer = await requireViewerApi();
    const rl = await rateLimit(`upload:${viewer.userId}`, 60, 3600);
    if (!rl.ok) return NextResponse.json({ error: `Zu viele Uploads. Bitte in ${rl.retryAfterSec} s erneut versuchen.` }, { status: 429 });
    const maxBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > maxBytes * 10 + 1024 * 1024) return NextResponse.json({ error: "Anfrage zu groß." }, { status: 413 });
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
    if (files.length > 10) return NextResponse.json({ error: "Maximal 10 Dateien pro Upload." }, { status: 400 });
    const policyId = (form.get("policyId") as string) || null;
    const claimId = (form.get("claimId") as string) || null;
    const replaceDocumentId = (form.get("replaceDocumentId") as string) || null;
    const results = [];
    for (const f of files) {
      if (f.size > maxBytes) {
        results.push({ name: f.name, ok: false, error: `Datei größer als ${env().MAX_UPLOAD_MB} MB.` });
        continue;
      }
      const data = Buffer.from(await f.arrayBuffer());
      const r = await uploadDocument(viewer, { name: f.name, data }, { policyId, claimId, replaceDocumentId });
      results.push({ name: f.name, ...r });
    }
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: 400 });
    logger.error("upload.failed", { error: safeErrorMessage(err) });
    return NextResponse.json({ error: "Upload fehlgeschlagen. Bitte erneut versuchen." }, { status: 500 });
  }
}
