import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mammoth from "mammoth";
import { run } from "./exec";
import type { AllowedMime } from "./validate";

export type PageText = {
  pageNo: number;
  text: string;
  method: "pdf_text" | "ocr" | "docx";
  ocrConfidence?: number;
};

export type ExtractionResult = {
  pages: PageText[];
  method: "pdf_text" | "ocr" | "mixed" | "docx";
  warnings: string[];
};

/** Unterhalb dieser Zahl sichtbarer Zeichen gilt eine PDF-Seite als Scan → OCR. */
const MIN_CHARS_FOR_TEXT_PAGE = 40;
/** Mittlere Tesseract-Konfidenz, unterhalb der wir eine Warnung ausgeben. */
const LOW_OCR_CONFIDENCE = 60;

export function normalizeText(t: string): string {
  return t
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "") // weiche Trennstriche
    .replace(/[ \t ]+/g, " ")
    .replace(/(\w)-\n(\p{Ll})/gu, "$1$2") // Silbentrennung am Zeilenende
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const visibleChars = (t: string) => t.replace(/\s/g, "").length;

async function ocrImage(imagePath: string, langs: string, workDir: string): Promise<{ text: string; confidence: number }> {
  const base = path.join(workDir, `ocr-${path.basename(imagePath)}`);
  await run("tesseract", [imagePath, base, "-l", langs, "--psm", "3", "txt", "tsv"], { timeoutMs: 180_000 });
  const text = await readFile(`${base}.txt`, "utf8");
  const tsv = await readFile(`${base}.tsv`, "utf8");
  const confs = tsv
    .split("\n")
    .slice(1)
    .map((l) => l.split("\t"))
    .filter((c) => c.length >= 12 && c[11]?.trim())
    .map((c) => Number(c[10]))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const confidence = confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 0;
  return { text, confidence };
}

async function pdfPageCount(file: string): Promise<number> {
  const { stdout } = await run("pdfinfo", [file], { timeoutMs: 30_000 });
  const m = /Pages:\s+(\d+)/.exec(stdout.toString());
  if (!m) throw new Error("Seitenzahl der PDF konnte nicht ermittelt werden");
  return Number(m[1]);
}

export async function extractText(
  buf: Buffer,
  mime: AllowedMime,
  opts: { ocrLanguages: string; tmpDir?: string; maxPages?: number; onOcr?: () => Promise<void> | void },
): Promise<ExtractionResult> {
  const work = await mkdtemp(path.join(opts.tmpDir ?? os.tmpdir(), "vp-"));
  const warnings: string[] = [];
  try {
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const r = await mammoth.extractRawText({ buffer: buf });
      // DOCX hat keine festen Seiten – wir behandeln das Dokument als einen Abschnitt „Seite 1“.
      warnings.push("DOCX-Dateien haben keine festen Seitenzahlen; Fundstellen beziehen sich auf das gesamte Dokument.");
      return { pages: [{ pageNo: 1, text: normalizeText(r.value), method: "docx" }], method: "docx", warnings };
    }

    if (mime === "image/jpeg" || mime === "image/png") {
      const img = path.join(work, mime === "image/png" ? "page.png" : "page.jpg");
      await writeFile(img, buf, { mode: 0o600 });
      await opts.onOcr?.();
      const { text, confidence } = await ocrImage(img, opts.ocrLanguages, work);
      if (confidence < LOW_OCR_CONFIDENCE && visibleChars(text) > 0)
        warnings.push(`Geringe Texterkennungsqualität (Tesseract-Konfidenz Ø ${confidence}). Bitte Angaben besonders sorgfältig prüfen.`);
      return { pages: [{ pageNo: 1, text: normalizeText(text), method: "ocr", ocrConfidence: confidence }], method: "ocr", warnings };
    }

    // PDF
    const pdf = path.join(work, "doc.pdf");
    await writeFile(pdf, buf, { mode: 0o600 });
    const count = await pdfPageCount(pdf);
    const maxPages = opts.maxPages ?? 400;
    if (count > maxPages) throw new Error(`Die PDF hat ${count} Seiten; unterstützt werden bis zu ${maxPages}.`);
    const { stdout } = await run("pdftotext", ["-layout", "-enc", "UTF-8", pdf, "-"], { timeoutMs: 180_000 });
    const raw = stdout.toString("utf8").split("\f");
    const pages: PageText[] = [];
    let ocrPages = 0;
    for (let i = 1; i <= count; i++) {
      const t = normalizeText(raw[i - 1] ?? "");
      if (visibleChars(t) >= MIN_CHARS_FOR_TEXT_PAGE) {
        pages.push({ pageNo: i, text: t, method: "pdf_text" });
        continue;
      }
      if (ocrPages === 0) await opts.onOcr?.();
      ocrPages++;
      const prefix = path.join(work, `p${i}`);
      await run("pdftoppm", ["-r", "300", "-f", String(i), "-l", String(i), "-png", "-singlefile", pdf, prefix], { timeoutMs: 120_000 });
      const { text, confidence } = await ocrImage(`${prefix}.png`, opts.ocrLanguages, work);
      if (confidence < LOW_OCR_CONFIDENCE && visibleChars(text) > 0)
        warnings.push(`Seite ${i}: geringe Texterkennungsqualität (Tesseract-Konfidenz Ø ${confidence}).`);
      pages.push({ pageNo: i, text: normalizeText(text), method: "ocr", ocrConfidence: confidence });
    }
    const method = ocrPages === 0 ? "pdf_text" : ocrPages === count ? "ocr" : "mixed";
    return { pages, method, warnings };
  } finally {
    // Temporäre Klartextdateien sofort entfernen
    await rm(work, { recursive: true, force: true });
  }
}

/** Nur für Tests/Diagnose: listet Dateien im temp-Verzeichnis (sollte nach extractText leer sein). */
export async function listTmp(dir: string) {
  return (await readdir(dir)).filter((f) => f.startsWith("vp-"));
}
