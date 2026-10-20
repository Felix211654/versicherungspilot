import { fileTypeFromBuffer } from "file-type";

export const ALLOWED_MIME = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
} as const;

export type AllowedMime = keyof typeof ALLOWED_MIME;

export type ValidationResult =
  | { ok: true; mime: AllowedMime; warnings: string[] }
  | { ok: false; reason: string };

/**
 * Prüft Größe und den TATSÄCHLICHEN Dateiinhalt (Magic Bytes), nicht nur Endung/Content-Type.
 */
export async function validateUpload(buf: Buffer, maxBytes: number): Promise<ValidationResult> {
  if (buf.length === 0) return { ok: false, reason: "Die Datei ist leer." };
  if (buf.length > maxBytes)
    return { ok: false, reason: `Die Datei ist größer als ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  const ft = await fileTypeFromBuffer(buf);
  if (!ft || !(ft.mime in ALLOWED_MIME)) {
    return {
      ok: false,
      reason: `Dateiformat nicht unterstützt${ft ? ` (${ft.mime})` : ""}. Erlaubt sind PDF, JPG, PNG und DOCX.`,
    };
  }
  const warnings: string[] = [];
  if (ft.mime === "application/pdf") {
    const head = buf.subarray(0, Math.min(buf.length, 4 * 1024 * 1024)).toString("latin1");
    if (/\/Encrypt\b/.test(head)) {
      return { ok: false, reason: "Die PDF-Datei ist passwortgeschützt bzw. verschlüsselt. Bitte ungeschützte Fassung hochladen." };
    }
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction\s*<<[^>]*\/JS)\b/.test(head)) {
      warnings.push("Die PDF enthält aktive Inhalte (Skripte/Anhänge). Diese werden nicht ausgeführt; die Vorschau erfolgt in einer abgeschotteten Ansicht.");
    }
  }
  return { ok: true, mime: ft.mime as AllowedMime, warnings };
}
