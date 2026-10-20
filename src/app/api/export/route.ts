import { NextResponse } from "next/server";
import { requireViewerApi, UnauthorizedError } from "@/server/auth/session";
import { buildExport } from "@/server/services/privacy";
import { rateLimit } from "@/server/lib/rate-limit";

export async function GET() {
  try {
    const viewer = await requireViewerApi();
    const rl = await rateLimit(`export:${viewer.userId}`, 5, 3600);
    if (!rl.ok) return NextResponse.json({ error: "Zu viele Exporte – bitte später erneut versuchen." }, { status: 429 });
    const zip = await buildExport(viewer);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="versicherungspilot-export-${date}.zip"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    throw err;
  }
}
