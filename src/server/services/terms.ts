import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";

type SummaryTerm = {
  kind: (typeof schema.policyTermKind.enumValues)[number];
  title: string;
  explanation: string;
  page: number;
  quote: string;
  amountEuro: number | null;
};

/**
 * Überträgt belegte Klauseln eines Dokuments (regelbasiert + verifizierte KI-Klauseln)
 * in die Vertragsübersicht (policy_term). Vom Nutzer bestätigte/korrigierte Einträge bleiben unberührt.
 */
export async function materializeDocumentTerms(householdId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(schema.policyDocument)
    .where(and(eq(schema.policyDocument.id, documentId), eq(schema.policyDocument.householdId, householdId)));
  if (!doc?.policyId) return;
  const facts = await db
    .select()
    .from(schema.extractedFact)
    .where(
      and(
        eq(schema.extractedFact.documentId, documentId),
        inArray(schema.extractedFact.field, ["deductible", "sum_insured", "waiting_period"]),
      ),
    );
  const rows: (typeof schema.policyTerm.$inferInsert)[] = [];
  for (const f of facts) {
    if (f.review === "rejected") continue;
    const v = (f.valueJson ?? {}) as { cents?: number; label?: string; approxDays?: number };
    const value = f.correctedValue ?? f.valueText;
    if (f.field === "deductible")
      rows.push({ householdId, policyId: doc.policyId, kind: "deductible", title: "Selbstbeteiligung", amountCents: v.cents ?? null, sourceDocumentId: documentId, sourcePage: f.pageNo, sourceSnippet: f.snippet, method: "rule", review: f.review === "unclear" ? "unclear" : "auto" });
    if (f.field === "sum_insured")
      rows.push({ householdId, policyId: doc.policyId, kind: "coverage", title: v.label ?? "Versicherungssumme", amountCents: v.cents ?? null, sourceDocumentId: documentId, sourcePage: f.pageNo, sourceSnippet: f.snippet, method: "rule", review: f.review === "unclear" ? "unclear" : "auto" });
    if (f.field === "waiting_period")
      rows.push({ householdId, policyId: doc.policyId, kind: "waiting_period", title: `Wartezeit ${value}`, durationDays: v.approxDays ?? null, sourceDocumentId: documentId, sourcePage: f.pageNo, sourceSnippet: f.snippet, method: "rule", review: "auto" });
  }
  const summary = doc.summary as { terms?: SummaryTerm[] } | null;
  for (const t of summary?.terms ?? []) {
    rows.push({
      householdId,
      policyId: doc.policyId,
      kind: t.kind,
      title: t.title,
      description: t.explanation,
      amountCents: t.amountEuro != null ? Math.round(t.amountEuro * 100) : null,
      sourceDocumentId: documentId,
      sourcePage: t.page,
      sourceSnippet: t.quote.slice(0, 600),
      method: "llm",
      review: "auto",
    });
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.policyTerm)
      .where(
        and(
          eq(schema.policyTerm.sourceDocumentId, documentId),
          eq(schema.policyTerm.householdId, householdId),
          inArray(schema.policyTerm.review, ["auto", "unclear"]),
        ),
      );
    if (rows.length) await tx.insert(schema.policyTerm).values(rows);
  });
}
