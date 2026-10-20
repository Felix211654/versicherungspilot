/**
 * Ableitung von Fristen aus strukturierten Vertragsdaten. Ergebnisse sind immer
 * "derived" (abgeleitet) und müssen vom Nutzer bestätigt werden. Die Berechnungsgrundlage
 * wird mitgeliefert. Gesetzliche Standardfristen werden NICHT unterstellt.
 */
import { addMonths, type ISODate } from "@/lib/dates";

export type DerivedDeadline = {
  kind: "cancellation" | "renewal";
  title: string;
  dueDate: ISODate;
  basis: string;
  certainty: "derived" | "unclear";
  originKey: string;
};

export function nextExpiry(endDate: ISODate, renewalMonths: number | null, today: ISODate): { date: ISODate; rolled: boolean } | null {
  if (endDate >= today) return { date: endDate, rolled: false };
  if (!renewalMonths) return null;
  let d = endDate;
  for (let i = 0; i < 100 && d < today; i++) d = addMonths(d, renewalMonths);
  return { date: d, rolled: true };
}

export function deriveContractDeadlines(p: {
  policyId: string;
  endDate: ISODate | null;
  noticePeriodMonths: number | null;
  renewalPeriodMonths: number | null;
  autoRenews: boolean | null;
  today: ISODate;
}): DerivedDeadline[] {
  const out: DerivedDeadline[] = [];
  if (!p.endDate) return out;
  const expiry = nextExpiry(p.endDate, p.autoRenews ? p.renewalPeriodMonths : null, p.today);
  if (!expiry) return out;
  const rolledNote = expiry.rolled
    ? ` Das hinterlegte Ablaufdatum ${p.endDate} liegt in der Vergangenheit; angenommen wurde eine stillschweigende Verlängerung um jeweils ${p.renewalPeriodMonths} Monate.`
    : "";
  out.push({
    kind: "renewal",
    title: p.autoRenews ? "Vertrag verlängert sich" : "Vertragsablauf",
    dueDate: expiry.date,
    basis: `Ablaufdatum/Hauptfälligkeit laut Vertragsdaten: ${p.endDate}.${rolledNote}`,
    certainty: expiry.rolled ? "unclear" : "derived",
    originKey: `policy:${p.policyId}:renewal:${expiry.date}`,
  });
  if (p.noticePeriodMonths) {
    const due = addMonths(expiry.date, -p.noticePeriodMonths);
    out.push({
      kind: "cancellation",
      title: "Letzter Tag für Kündigung (Zugang beim Versicherer)",
      dueDate: due,
      basis: `Ablauf ${expiry.date} minus Kündigungsfrist von ${p.noticePeriodMonths} Monat(en). Maßgeblich ist in der Regel der Zugang der Kündigung beim Versicherer; bitte Vertragsbedingungen prüfen.${rolledNote}`,
      certainty: expiry.rolled ? "unclear" : "derived",
      originKey: `policy:${p.policyId}:cancellation:${due}`,
    });
  }
  return out;
}
