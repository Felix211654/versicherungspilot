/** Findet ein Zitat (whitespace-tolerant, ohne Groß-/Kleinschreibung) in einem Text. */
export function findQuote(text: string, quote: string): { start: number; end: number } | null {
  const words = quote
    .replace(/…|\.\.\.$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  // abgeschnittenes letztes Wort ignorieren
  if (words.length > 3) words.pop();
  if (words.length === 0) return null;
  const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "-?\\s*")).join("[\\s\\-]+");
  try {
    const m = new RegExp(pattern, "i").exec(text);
    return m ? { start: m.index, end: m.index + m[0].length } : null;
  } catch {
    return null;
  }
}
