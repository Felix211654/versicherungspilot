import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getViewer } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { verifyDownloadToken } from "@/server/storage/crypto";
import { getDecrypted } from "@/server/storage/storage";
import { audit } from "@/server/services/audit";

/**
 * Auslieferung privater Dateien. Doppelte Prüfung:
 * 1. kurzlebiges, signiertes Token (max. wenige Minuten gültig)
 * 2. aktive Sitzung, deren Haushalt dem Token und der Datei entspricht (Schutz vor IDOR/Link-Weitergabe)
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const claims = verifyDownloadToken(env().DOWNLOAD_SIGNING_SECRET, token);
  if (!claims) return new NextResponse("Link ungültig oder abgelaufen", { status: 403 });
  const viewer = await getViewer();
  if (!viewer || viewer.householdId !== claims.h) return new NextResponse("Kein Zugriff", { status: 403 });
  const [v] = await db
    .select()
    .from(schema.documentVersion)
    .where(and(eq(schema.documentVersion.id, claims.v), eq(schema.documentVersion.householdId, viewer.householdId)));
  if (!v) return new NextResponse("Nicht gefunden", { status: 404 });
  const data = await getDecrypted(v.storageKey, v.wrappedKey);
  if (claims.d === "attachment") await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "document.downloaded", entityType: "document", entityId: v.documentId });
  const name = encodeURIComponent(v.fileName);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": v.mimeType,
      "content-length": String(data.length),
      "content-disposition": `${claims.d}; filename*=UTF-8''${name}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      // Vorschau abschotten. PDFs ohne "sandbox", da Browser-PDF-Viewer in Sandbox-Dokumenten blockiert werden.
      "content-security-policy": v.mimeType === "application/pdf" ? "default-src 'none'; object-src 'self'" : "sandbox; default-src 'none'; img-src 'self' data:",
    },
  });
}
