import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { requireViewerApi, UnauthorizedError } from "@/server/auth/session";
import { db, schema } from "@/server/db";

/** Status-Polling für laufende Verarbeitungen (nur eigene Dokumente). */
export async function GET(req: NextRequest) {
  try {
    const viewer = await requireViewerApi();
    const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
    if (!ids.length) return NextResponse.json({ items: [] });
    const rows = await db
      .select({ documentId: schema.documentVersion.documentId, versionNo: schema.documentVersion.versionNo, status: schema.documentVersion.status, statusMessage: schema.documentVersion.statusMessage, error: schema.documentVersion.error })
      .from(schema.documentVersion)
      .where(and(eq(schema.documentVersion.householdId, viewer.householdId), inArray(schema.documentVersion.documentId, ids)));
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.documentId) || latest.get(r.documentId)!.versionNo < r.versionNo) latest.set(r.documentId, r);
    return NextResponse.json({ items: [...latest.values()] }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    throw err;
  }
}
