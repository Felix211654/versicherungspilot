export type Interval = "monthly" | "quarterly" | "semiannual" | "annual" | "single";

export const PAYMENTS_PER_YEAR: Record<Exclude<Interval, "single">, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** Parst deutsche Beträge wie "1.234,56", "1234,5", "10 Mio.", "50.000.000" in Cent. */
export function parseGermanAmountToCents(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, " ");
  const mio = /^(\d{1,3}(?:[.,]\d{1,3})?)\s*(Mio\.?|Millionen)/i.exec(s);
  if (mio) {
    const n = Number(mio[1].replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 1_000_000 * 100) : null;
  }
  const m = /^-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^-?\d+(?:,\d{1,2})?$/.exec(s.replace(/\s/g, ""));
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function formatCents(cents: number | null | undefined, currency = "EUR"): string {
  if (cents == null) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

/**
 * Rechnet einen Beitrag auf Jahres- und Monatswerte um.
 * Rechnerische Vergleichswerte – nicht identisch mit tatsächlich gezahlten Beträgen
 * (z. B. Ratenzuschläge, unterjährige Anpassungen).
 */
export function annualize(cents: number | null | undefined, interval: Interval | null | undefined) {
  if (cents == null || !interval || interval === "single") return null;
  const yearly = cents * PAYMENTS_PER_YEAR[interval];
  return { yearlyCents: yearly, monthlyCents: Math.round(yearly / 12) };
}
