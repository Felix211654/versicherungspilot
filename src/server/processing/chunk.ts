/**
 * Zerlegt Seitentexte in Abschnitte entlang der Klauselstruktur (§, A 1.2, Ziffer …).
 * Jeder Chunk behält Seitenbereich und zuletzt gültige Überschrift → präzise Belege.
 */
import type { PageText } from "./extract-text";

export type Chunk = { chunkIndex: number; pageStart: number; pageEnd: number; heading: string | null; content: string };

const HEADING_RE =
  /^(?:§\s*\d+[a-z]?\b.{0,120}|(?:Abschnitt|Teil|Ziffer|Artikel|Klausel)\s+[A-Z0-9][\w.]*\b.{0,120}|[A-Z]\s?\d{1,2}(?:\.\d{1,2}){0,3}\s+\p{Lu}.{0,110}|\d{1,2}(?:\.\d{1,2}){1,3}\s+\p{Lu}.{0,110})$/u;

export function isHeading(line: string): boolean {
  const l = line.trim();
  if (l.length < 3 || l.length > 130) return false;
  if (HEADING_RE.test(l)) return true;
  // Kurze Zeile in Großbuchstaben (z. B. "AUSSCHLÜSSE")
  return l.length <= 60 && /^[\p{Lu}\d\s.,&/()-]+$/u.test(l) && /\p{Lu}{4,}/u.test(l);
}

export function chunkPages(pages: PageText[], opts: { maxChars?: number; overlapChars?: number } = {}): Chunk[] {
  const maxChars = opts.maxChars ?? 1400;
  const overlap = opts.overlapChars ?? 150;
  const chunks: Chunk[] = [];
  let heading: string | null = null;
  let buf = "";
  let pageStart = pages[0]?.pageNo ?? 1;
  let pageEnd = pageStart;

  const flush = () => {
    const content = buf.trim();
    if (content.replace(/\s/g, "").length >= 20) {
      chunks.push({ chunkIndex: chunks.length, pageStart, pageEnd, heading, content });
    }
    buf = "";
  };

  for (const page of pages) {
    const paragraphs = page.text.split(/\n{2,}|\n(?=\s*(?:§|\(?\d+\)|[a-z]\)))/);
    for (const para of paragraphs) {
      const lines = para.split("\n");
      const first = lines[0]?.trim() ?? "";
      if (isHeading(first)) {
        flush();
        heading = first.replace(/\s+/g, " ").slice(0, 160);
        pageStart = page.pageNo;
        pageEnd = page.pageNo;
        const rest = lines.slice(1).join("\n").trim();
        if (rest) buf = rest + "\n";
        continue;
      }
      if (!buf) pageStart = page.pageNo;
      if (buf.length + para.length > maxChars && buf.length > 0) {
        const tail = buf.slice(-overlap);
        flush();
        buf = tail.includes(" ") ? tail.slice(tail.indexOf(" ") + 1) + "\n" : "";
        pageStart = page.pageNo;
      }
      // Sehr lange Absätze hart teilen (z. B. OCR ohne Absätze)
      let rest = para;
      while (rest.length > maxChars) {
        const cut = rest.lastIndexOf(". ", maxChars) > maxChars / 2 ? rest.lastIndexOf(". ", maxChars) + 1 : maxChars;
        buf += rest.slice(0, cut);
        pageEnd = page.pageNo;
        flush();
        pageStart = page.pageNo;
        rest = rest.slice(cut).trimStart();
      }
      buf += rest + "\n\n";
      pageEnd = page.pageNo;
    }
  }
  flush();
  return chunks;
}
