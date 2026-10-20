import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import * as z from "zod/v4";
import { db, schema } from "../db";
import { annualize, type Interval } from "@/lib/money";
import { todayIn } from "@/lib/dates";
import { deriveContractDeadlines } from "../processing/deadlines";
import { audit } from "./audit";
import { UserFacingError } from "./documents";
import { syncReminders } from "./deadlines";
import { materializeDocumentTerms } from "./terms";
import type { Viewer } from "../auth/session";

const dateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT")
  .nullable()
  .or(z.literal("").transform(() => null));

export const PolicyInput = z.object({
  name: z.string().trim().min(2, "Bitte einen Namen angeben").max(120),
  category: z.enum(schema.policyCategory.enumValues),
  insurerName: z.string().trim().max(120).nullable().optional(),
  policyNumber: z.string().trim().max(60).nullable().optional(),
  broker: z.string().trim().max(120).nullable().optional(),
  policyholderName: z.string().trim().max(120).nullable().optional(),
  status: z.enum(schema.policyStatus.enumValues).default("active"),
  startDate: dateOrNull.optional(),
  endDate: dateOrNull.optional(),
  autoRenews: z.boolean().nullable().optional(),
  renewalPeriodMonths: z.number().int().min(1).max(120).nullable().optional(),
  noticePeriodMonths: z.number().int().min(0).max(24).nullable().optional(),
  noticePeriodText: z.string().trim().max(500).nullable().optional(),
  premiumCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  paymentInterval: z.enum(schema.paymentInterval.enumValues).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});
export type PolicyInputT = z.infer<typeof PolicyInput>;

async function upsertInsurer(householdId: string, name: string | null | undefined) {
  const n = name?.trim();
  if (!n) return null;
  const [row] = await db
    .insert(schema.insurer)
    .values({ householdId, name: n })
    .onConflictDoUpdate({ target: [schema.insurer.householdId, schema.insurer.name], set: { name: n } })
    .returning({ id: schema.insurer.id });
  return row.id;
}

export async function listPolicies(householdId: string) {
  const rows = await db
    .select({
      id: schema.insurancePolicy.id,
      name: schema.insurancePolicy.name,
      category: schema.insurancePolicy.category,
      status: schema.insurancePolicy.status,
      policyNumber: schema.insurancePolicy.policyNumber,
      insurerName: schema.insurer.name,
      premiumCents: schema.insurancePolicy.premiumCents,
      premiumCurrency: schema.insurancePolicy.premiumCurrency,
      paymentInterval: schema.insurancePolicy.paymentInterval,
      startDate: schema.insurancePolicy.startDate,
      endDate: schema.insurancePolicy.endDate,
      noticePeriodMonths: schema.insurancePolicy.noticePeriodMonths,
      updatedAt: schema.insurancePolicy.updatedAt,
    })
    .from(schema.insurancePolicy)
    .leftJoin(schema.insurer, eq(schema.insurer.id, schema.insurancePolicy.insurerId))
    .where(eq(schema.insurancePolicy.householdId, householdId))
    .orderBy(asc(schema.insurancePolicy.category), asc(schema.insurancePolicy.name));
  return rows.map((r) => ({ ...r, cost: annualize(r.premiumCents, r.paymentInterval as Interval | null) }));
}

export async function getPolicy(householdId: string, policyId: string) {
  const [p] = await db
    .select({ policy: schema.insurancePolicy, insurerName: schema.insurer.name })
    .from(schema.insurancePolicy)
    .leftJoin(schema.insurer, eq(schema.insurer.id, schema.insurancePolicy.insurerId))
    .where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, householdId)));
  if (!p) return null;
  const hh = eq(schema.policyTerm.householdId, householdId);
  const [persons, objects, terms, deadlines, claims, history] = await Promise.all([
    db.select().from(schema.insuredPerson).where(and(eq(schema.insuredPerson.policyId, policyId), eq(schema.insuredPerson.householdId, householdId))),
    db.select().from(schema.insuredObject).where(and(eq(schema.insuredObject.policyId, policyId), eq(schema.insuredObject.householdId, householdId))),
    db
      .select({ term: schema.policyTerm, documentTitle: schema.policyDocument.title })
      .from(schema.policyTerm)
      .leftJoin(schema.policyDocument, eq(schema.policyDocument.id, schema.policyTerm.sourceDocumentId))
      .where(and(eq(schema.policyTerm.policyId, policyId), hh, ne(schema.policyTerm.review, "rejected")))
      .orderBy(asc(schema.policyTerm.kind)),
    db
      .select()
      .from(schema.contractDeadline)
      .where(and(eq(schema.contractDeadline.policyId, policyId), eq(schema.contractDeadline.householdId, householdId), inArray(schema.contractDeadline.status, ["needs_confirmation", "open"])))
      .orderBy(asc(schema.contractDeadline.dueDate)),
    db
      .select({ id: schema.claim.id, title: schema.claim.title, status: schema.claim.status, assessment: schema.claimPolicy.assessment })
      .from(schema.claimPolicy)
      .innerJoin(schema.claim, eq(schema.claim.id, schema.claimPolicy.claimId))
      .where(and(eq(schema.claimPolicy.policyId, policyId), eq(schema.claimPolicy.householdId, householdId))),
    db
      .select()
      .from(schema.auditEvent)
      .where(and(eq(schema.auditEvent.householdId, householdId), eq(schema.auditEvent.entityId, policyId)))
      .orderBy(desc(schema.auditEvent.createdAt))
      .limit(30),
  ]);
  return { ...p, persons, objects, terms, deadlines, claims, history };
}

/** Synchronisiert abgeleitete Vertragsfristen (Kündigung/Verlängerung). Bestätigte Fristen bleiben erhalten. */
export async function syncPolicyDeadlines(householdId: string, policyId: string, timezone = "Europe/Berlin") {
  const [p] = await db
    .select()
    .from(schema.insurancePolicy)
    .where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, householdId)));
  if (!p) return;
  const derived =
    p.status === "active" || p.status === "needs_review"
      ? deriveContractDeadlines({
          policyId,
          endDate: p.endDate,
          noticePeriodMonths: p.noticePeriodMonths,
          renewalPeriodMonths: p.renewalPeriodMonths,
          autoRenews: p.autoRenews,
          today: todayIn(timezone),
        })
      : [];
  const keep = new Set(derived.map((d) => d.originKey));
  const existing = await db
    .select()
    .from(schema.contractDeadline)
    .where(and(eq(schema.contractDeadline.householdId, householdId), eq(schema.contractDeadline.policyId, policyId), inArray(schema.contractDeadline.kind, ["cancellation", "renewal"])));
  // Veraltete, noch unbestätigte Ableitungen entfernen
  const stale = existing.filter((x) => x.originKey?.startsWith(`policy:${policyId}:`) && !keep.has(x.originKey) && x.status === "needs_confirmation");
  if (stale.length) await db.delete(schema.contractDeadline).where(inArray(schema.contractDeadline.id, stale.map((s) => s.id)));
  for (const d of derived) {
    await db
      .insert(schema.contractDeadline)
      .values({
        householdId,
        policyId,
        kind: d.kind,
        title: `${d.title}: ${p.name}`,
        dueDate: d.dueDate,
        basis: d.basis,
        certainty: d.certainty,
        status: "needs_confirmation",
        originKey: d.originKey,
      })
      .onConflictDoNothing();
  }
  await syncReminders(householdId);
}

export async function createPolicy(viewer: Viewer, input: PolicyInputT, fromDocumentId?: string | null) {
  const insurerId = await upsertInsurer(viewer.householdId, input.insurerName);
  const [p] = await db
    .insert(schema.insurancePolicy)
    .values({
      householdId: viewer.householdId,
      insurerId,
      category: input.category,
      name: input.name,
      policyNumber: input.policyNumber || null,
      broker: input.broker || null,
      policyholderName: input.policyholderName || null,
      status: input.status,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      autoRenews: input.autoRenews ?? null,
      renewalPeriodMonths: input.renewalPeriodMonths ?? null,
      noticePeriodMonths: input.noticePeriodMonths ?? null,
      noticePeriodText: input.noticePeriodText || null,
      premiumCents: input.premiumCents ?? null,
      paymentInterval: input.paymentInterval ?? null,
      notes: input.notes || null,
    })
    .returning({ id: schema.insurancePolicy.id });
  if (fromDocumentId) {
    const res = await db
      .update(schema.policyDocument)
      .set({ policyId: p.id, assignment: "confirmed" })
      .where(and(eq(schema.policyDocument.id, fromDocumentId), eq(schema.policyDocument.householdId, viewer.householdId)))
      .returning({ id: schema.policyDocument.id });
    if (res.length) {
      await db
        .update(schema.contractDeadline)
        .set({ policyId: p.id })
        .where(and(eq(schema.contractDeadline.sourceDocumentId, fromDocumentId), eq(schema.contractDeadline.householdId, viewer.householdId)));
      await markFactsReviewed(viewer, fromDocumentId, input);
      await materializeDocumentTerms(viewer.householdId, fromDocumentId);
    }
  }
  await syncPolicyDeadlines(viewer.householdId, p.id);
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "policy.created", entityType: "policy", entityId: p.id, metadata: { fromDocument: Boolean(fromDocumentId) } });
  return p.id;
}

export async function updatePolicy(viewer: Viewer, policyId: string, input: PolicyInputT) {
  const insurerId = await upsertInsurer(viewer.householdId, input.insurerName);
  const res = await db
    .update(schema.insurancePolicy)
    .set({
      insurerId,
      category: input.category,
      name: input.name,
      policyNumber: input.policyNumber || null,
      broker: input.broker || null,
      policyholderName: input.policyholderName || null,
      status: input.status,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      autoRenews: input.autoRenews ?? null,
      renewalPeriodMonths: input.renewalPeriodMonths ?? null,
      noticePeriodMonths: input.noticePeriodMonths ?? null,
      noticePeriodText: input.noticePeriodText || null,
      premiumCents: input.premiumCents ?? null,
      paymentInterval: input.paymentInterval ?? null,
      notes: input.notes || null,
    })
    .where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, viewer.householdId)))
    .returning({ id: schema.insurancePolicy.id });
  if (!res.length) throw new UserFacingError("Vertrag nicht gefunden");
  await syncPolicyDeadlines(viewer.householdId, policyId);
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "policy.updated", entityType: "policy", entityId: policyId });
}

export async function deletePolicy(viewer: Viewer, policyId: string) {
  // Dokumente bleiben erhalten (Zuordnung wird gelöst), damit keine Unterlagen versehentlich verloren gehen.
  await db
    .update(schema.policyDocument)
    .set({ assignment: "unassigned" })
    .where(and(eq(schema.policyDocument.householdId, viewer.householdId), eq(schema.policyDocument.policyId, policyId)));
  await db
    .delete(schema.policyTerm)
    .where(and(eq(schema.policyTerm.householdId, viewer.householdId), eq(schema.policyTerm.policyId, policyId)));
  const res = await db
    .delete(schema.insurancePolicy)
    .where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, viewer.householdId)))
    .returning({ id: schema.insurancePolicy.id });
  if (!res.length) throw new UserFacingError("Vertrag nicht gefunden");
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "policy.deleted", entityType: "policy", entityId: policyId });
}

/** Vorschlag für einen neuen Vertrag aus den erkannten Angaben eines Dokuments. */
export async function suggestPolicyFromDocument(householdId: string, documentId: string): Promise<Partial<PolicyInputT> & { sources: Record<string, { page: number | null; snippet: string | null; confidence: string }> }> {
  const facts = await db
    .select()
    .from(schema.extractedFact)
    .where(and(eq(schema.extractedFact.documentId, documentId), eq(schema.extractedFact.householdId, householdId), ne(schema.extractedFact.review, "rejected")));
  const pick = (field: string) => {
    const f = facts.filter((x) => x.field === field).sort((a, b) => rank(b) - rank(a))[0];
    return f;
  };
  const rank = (f: (typeof facts)[number]) => (f.review === "corrected" || f.review === "confirmed" ? 10 : 0) + (f.confidence === "high" ? 3 : f.confidence === "medium" ? 2 : 1);
  const val = (f: (typeof facts)[number] | undefined) => (f ? f.correctedValue ?? f.valueText : undefined);
  const sources: Record<string, { page: number | null; snippet: string | null; confidence: string }> = {};
  const note = (key: string, f: (typeof facts)[number] | undefined) => {
    if (f) sources[key] = { page: f.pageNo, snippet: f.snippet, confidence: f.review === "unclear" ? "low" : f.confidence };
  };
  const insurer = pick("insurer_name");
  const category = pick("category");
  const number = pick("policy_number");
  const start = pick("start_date");
  const end = pick("end_date");
  const premium = pick("premium");
  const interval = pick("payment_interval");
  const notice = pick("notice_period");
  const renewal = pick("auto_renewal");
  const holder = pick("policyholder");
  [["insurerName", insurer], ["category", category], ["policyNumber", number], ["startDate", start], ["endDate", end], ["premiumCents", premium], ["paymentInterval", interval], ["noticePeriodMonths", notice], ["autoRenews", renewal], ["policyholderName", holder]].forEach(([k, f]) =>
    note(k as string, f as (typeof facts)[number] | undefined),
  );
  const premiumJson = (premium?.valueJson ?? {}) as { cents?: number; interval?: string | null };
  const noticeJson = (notice?.valueJson ?? {}) as { amount?: number; unit?: string };
  const renewalJson = (renewal?.valueJson ?? {}) as { months?: number };
  const categoryValue = val(category) as PolicyInputT["category"] | undefined;
  const { CATEGORY_LABEL } = await import("@/lib/labels");
  return {
    name: categoryValue ? `${CATEGORY_LABEL[categoryValue]}${val(insurer) ? ` ${val(insurer)}` : ""}` : undefined,
    category: categoryValue,
    insurerName: val(insurer),
    policyNumber: val(number),
    policyholderName: val(holder),
    startDate: val(start),
    endDate: val(end),
    premiumCents: premium?.correctedValue ? Math.round(Number(premium.correctedValue.replace(",", ".")) * 100) || undefined : premiumJson.cents,
    paymentInterval: (val(interval) ?? premiumJson.interval ?? undefined) as PolicyInputT["paymentInterval"],
    noticePeriodMonths: noticeJson.unit === "months" ? noticeJson.amount : undefined,
    noticePeriodText: notice?.snippet ?? undefined,
    autoRenews: renewal ? true : undefined,
    renewalPeriodMonths: renewalJson.months,
    sources,
  };
}

/** Markiert Fakten als bestätigt/korrigiert, je nachdem ob der Nutzer den Vorschlag übernommen hat. */
async function markFactsReviewed(viewer: Viewer, documentId: string, input: PolicyInputT) {
  const s = await suggestPolicyFromDocument(viewer.householdId, documentId);
  const compare: [string, unknown, unknown][] = [
    ["insurer_name", s.insurerName, input.insurerName],
    ["policy_number", s.policyNumber, input.policyNumber],
    ["start_date", s.startDate, input.startDate],
    ["end_date", s.endDate, input.endDate],
    ["category", s.category, input.category],
  ];
  for (const [field, suggested, chosen] of compare) {
    if (suggested == null) continue;
    const same = String(suggested) === String(chosen ?? "");
    await db
      .update(schema.extractedFact)
      .set({ review: same ? "confirmed" : "corrected", correctedValue: same ? null : String(chosen ?? ""), reviewedAt: new Date(), reviewedBy: viewer.userId })
      .where(and(eq(schema.extractedFact.documentId, documentId), eq(schema.extractedFact.householdId, viewer.householdId), eq(schema.extractedFact.field, field), eq(schema.extractedFact.valueText, String(suggested))));
  }
}

export async function addPolicyTerm(
  viewer: Viewer,
  policyId: string,
  input: { kind: (typeof schema.policyTermKind.enumValues)[number]; title: string; description?: string | null; amountCents?: number | null },
) {
  const [p] = await db.select({ id: schema.insurancePolicy.id }).from(schema.insurancePolicy).where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, viewer.householdId)));
  if (!p) throw new UserFacingError("Vertrag nicht gefunden");
  await db.insert(schema.policyTerm).values({ householdId: viewer.householdId, policyId, kind: input.kind, title: input.title, description: input.description ?? null, amountCents: input.amountCents ?? null, method: "manual", review: "confirmed" });
}

export async function reviewPolicyTerm(viewer: Viewer, termId: string, review: "confirmed" | "rejected") {
  const res = await db
    .update(schema.policyTerm)
    .set({ review })
    .where(and(eq(schema.policyTerm.id, termId), eq(schema.policyTerm.householdId, viewer.householdId)))
    .returning({ policyId: schema.policyTerm.policyId });
  if (!res.length) throw new UserFacingError("Eintrag nicht gefunden");
  return res[0].policyId;
}

export async function addInsuredPerson(viewer: Viewer, policyId: string, name: string, role: string | null) {
  const [p] = await db.select({ id: schema.insurancePolicy.id }).from(schema.insurancePolicy).where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, viewer.householdId)));
  if (!p) throw new UserFacingError("Vertrag nicht gefunden");
  await db.insert(schema.insuredPerson).values({ householdId: viewer.householdId, policyId, name, role });
}

export async function addInsuredObject(viewer: Viewer, policyId: string, input: { kind: string; description: string; identifier?: string | null }) {
  const [p] = await db.select({ id: schema.insurancePolicy.id }).from(schema.insurancePolicy).where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, viewer.householdId)));
  if (!p) throw new UserFacingError("Vertrag nicht gefunden");
  await db.insert(schema.insuredObject).values({ householdId: viewer.householdId, policyId, kind: input.kind, description: input.description, identifier: input.identifier ?? null });
}

/** Unsichere/widersprüchliche automatisch erkannte Angaben aus den Dokumenten eines Vertrags. */
export async function policyUncertainties(householdId: string, policyId: string) {
  return db
    .select({ fact: schema.extractedFact, documentTitle: schema.policyDocument.title, documentId: schema.policyDocument.id })
    .from(schema.extractedFact)
    .innerJoin(schema.policyDocument, eq(schema.policyDocument.id, schema.extractedFact.documentId))
    .where(and(eq(schema.extractedFact.householdId, householdId), eq(schema.policyDocument.policyId, policyId), eq(schema.extractedFact.review, "unclear")))
    .orderBy(asc(schema.extractedFact.field));
}
