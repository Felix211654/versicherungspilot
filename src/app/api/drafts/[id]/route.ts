import { NextResponse, type NextRequest } from "next/server";
import { requireViewerApi, UnauthorizedError } from "@/server/auth/session";
import { getDraft } from "@/server/services/claims";

/** Download eines Entwurfs als Textdatei (UTF-8). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireViewerApi();
    const { id } = await ctx.params;
    const d = await getDraft(viewer.householdId, id);
    if (!d) return new NextResponse("Nicht gefunden", { status: 404 });
    const name = `${d.title.replace(/[^\wäöüÄÖÜß -]/g, "").slice(0, 80)}.txt`;
    return new NextResponse("﻿" + d.content.replace(/\n/g, "\r\n"), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    throw err;
  }
}
