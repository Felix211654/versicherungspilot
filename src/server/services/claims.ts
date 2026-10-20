import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import * as z from "zod/v4";
import { db, schema } from "../db";
import { answerQuestion, categoryHints } from "../ai/rag";
import { buildDraft, type DraftKind } from "./drafts";
import { audit } from "./audit";
import { UserFacingError } from "./documents";
import { todayIn } from "@/lib/dates";
import { CLAIM_STATUS_LABEL, ASSESSMENT_LABEL } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import type { Viewer } from "../auth/session";
import type { StructuredAnswer } from "@/lib/answer-types";

export const ClaimInput = z.object({
  title: z.string().trim().min(3, "Bitte einen kurzen Titel angeben").max(160),
  description: z.string().trim().min(10, "Bitte beschreibe kurz, was passiert ist").max(8000),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  occurredAtText: z.string().trim().max(200).nullable().optional(),
  location: z.string().trim().max(300).nullable().optional(),
  ownerOfDamagedItem: z.string().trim().max(200).nullable().optional(),
  causedBy: z.string().trim().max(200).nullable().optional(),
  estimatedDamageCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  alreadyReported: z.boolean().nullable().optional(),
  acuteDanger: z.boolean().default(false),
});
export type ClaimInputT = z.infer<typeof ClaimInput>;

const ownClaim = (householdId: string, id: string) => and(eq(schema.claim.id, id), eq(schema.claim.householdId, householdId));

async function event(householdId: string, claimId: string, userId: string | null, type: string, message: string, data?: unknown) {
  await db.insert(schema.claimEvent).values({ householdId, claimId, type, message, data: data ?? null, createdBy: userId });
}

/** Welche Pflichtangaben für eine erste Prüfung fehlen (fallabhängig, nicht pauschal). */
export function missingClaimFacts(c: Pick<ClaimInputT, "occurredOn" | "occurredAtText" | "location" | "estimatedDamageCents" | "ownerOfDamagedItem" | "causedBy" | "description">): string[] {
  const out: string[] = [];
  if (!c.occurredOn && !c.occurredAtText) out.push("Wann ist der Schaden passiert?");
  if (!c.location) out.push("Wo ist der Schaden passiert?");
  if (c.estimatedDamageCents == null) out.push("Wie hoch ist der geschätzte Schaden?");
  if (/fremd|freund|nachbar|geliehen|gemietet|beschädigt/i.test(c.description) && !c.ownerOfDamagedItem) out.push("Wem gehört die beschädigte Sache?");
  if (/verursacht|schuld|handwerker|unfall/i.test(c.description) && !c.causedBy) out.push("Wer hat den Schaden verursacht?");
  return out;
}

export async function createClaim(viewer: Viewer, input: ClaimInputT) {
  const missing = missingClaimFacts(input);
  const [c] = await db
    .insert(schema.claim)
    .values({
      householdId: viewer.householdId,
      title: input.title,
      description: input.description,
      occurredOn: input.occurredOn ?? null,
      occurredAtText: input.occurredAtText ?? null,
      location: input.location ?? null,
      ownerOfDamagedItem: input.ownerOfDamagedItem ?? null,
      causedBy: input.causedBy ?? null,
      estimatedDamageCents: input.estimatedDamageCents ?? null,
      alreadyReported: input.alreadyReported ?? null,
      acuteDanger: input.acuteDanger,
      status: missing.length ? "facts_incomplete" : "draft",
    })
    .returning({ id: schema.claim.id });
  await event(viewer.householdId, c.id, viewer.userId, "created", "Schadenfall angelegt");
  if (input.acuteDanger) {
    await db.insert(schema.task).values({
      householdId: viewer.householdId,
      claimId: c.id,
      title: "Sofortmaßnahmen: Gefahr abwenden und Schaden begrenzen",
      description: "Allgemeiner Hinweis: z. B. Wasser abstellen, Strom sichern, Notdienst/Feuerwehr rufen, Personen in Sicherheit bringen. Erst danach Dokumentation und Meldung.",
      priority: "urgent",
      source: "system",
      sortOrder: -10,
      originKey: `claim:${c.id}:acute`,
    });
  }
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "claim.created", entityType: "claim", entityId: c.id });
  return c.id;
}

export async function updateClaim(viewer: Viewer, id: string, input: ClaimInputT) {
  const res = await db
    .update(schema.claim)
    .set({
      title: input.title,
      description: input.description,
      occurredOn: input.occurredOn ?? null,
      occurredAtText: input.occurredAtText ?? null,
      location: input.location ?? null,
      ownerOfDamagedItem: input.ownerOfDamagedItem ?? null,
      causedBy: input.causedBy ?? null,
      estimatedDamageCents: input.estimatedDamageCents ?? null,
      alreadyReported: input.alreadyReported ?? null,
      acuteDanger: input.acuteDanger,
    })
    .where(ownClaim(viewer.householdId, id))
    .returning({ id: schema.claim.id });
  if (!res.length) throw new UserFacingError("Schadenfall nicht gefunden");
  await event(viewer.householdId, id, viewer.userId, "updated", "Sachverhalt aktualisiert");
}

export async function listClaims(householdId: string) {
  return db.select().from(schema.claim).where(eq(schema.claim.householdId, householdId)).orderBy(desc(schema.claim.updatedAt));
}

export async function getClaim(householdId: string, id: string) {
  const [claim] = await db.select().from(schema.claim).where(ownClaim(householdId, id));
  if (!claim) return null;
  const hh = householdId;
  const [policies, events, evidence, tasks, comms, drafts, deadlines, lastCheck] = await Promise.all([
    db
      .select({ cp: schema.claimPolicy, policyName: schema.insurancePolicy.name, category: schema.insurancePolicy.category, insurerName: schema.insurer.name })
      .from(schema.claimPolicy)
      .innerJoin(schema.insurancePolicy, eq(schema.insurancePolicy.id, schema.claimPolicy.policyId))
      .leftJoin(schema.insurer, eq(schema.insurer.id, schema.insurancePolicy.insurerId))
      .where(and(eq(schema.claimPolicy.claimId, id), eq(schema.claimPolicy.householdId, hh))),
    db.select().from(schema.claimEvent).where(and(eq(schema.claimEvent.claimId, id), eq(schema.claimEvent.householdId, hh))).orderBy(desc(schema.claimEvent.createdAt)),
    db
      .select({ ev: schema.claimEvidence, documentTitle: schema.policyDocument.title })
      .from(schema.claimEvidence)
      .leftJoin(schema.policyDocument, eq(schema.policyDocument.id, schema.claimEvidence.documentId))
      .where(and(eq(schema.claimEvidence.claimId, id), eq(schema.claimEvidence.householdId, hh)))
      .orderBy(asc(schema.claimEvidence.createdAt)),
    db.select().from(schema.task).where(and(eq(schema.task.claimId, id), eq(schema.task.householdId, hh))).orderBy(asc(schema.task.status), asc(schema.task.sortOrder), asc(schema.task.createdAt)),
    db.select().from(schema.communication).where(and(eq(schema.communication.claimId, id), eq(schema.communication.householdId, hh))).orderBy(desc(schema.communication.occurredOn)),
    db.select().from(schema.generatedDocument).where(and(eq(schema.generatedDocument.claimId, id), eq(schema.generatedDocument.householdId, hh))).orderBy(desc(schema.generatedDocument.createdAt)),
    db.select().from(schema.contractDeadline).where(and(eq(schema.contractDeadline.claimId, id), eq(schema.contractDeadline.householdId, hh))).orderBy(asc(schema.contractDeadline.dueDate)),
    db
      .select()
      .from(schema.aiAnalysis)
      .where(and(eq(schema.aiAnalysis.householdId, hh), eq(schema.aiAnalysis.subjectType, "claim"), eq(schema.aiAnalysis.subjectId, id)))
      .orderBy(desc(schema.aiAnalysis.createdAt))
      .limit(1),
  ]);
  return { claim, policies, events, evidence, tasks, comms, drafts, deadlines, lastCheck: lastCheck[0] ?? null, missing: missingClaimFacts(claim) };
}

function caseContext(c: typeof schema.claim.$inferSelect) {
  return [
    `Titel: ${c.title}`,
    `Beschreibung (Angaben des Nutzers): ${c.description}`,
    c.occurredOn ? `Datum: ${c.occurredOn}` : c.occurredAtText ? `Zeitpunkt: ${c.occurredAtText}` : "Datum: unbekannt",
    `Ort: ${c.location ?? "unbekannt"}`,
    `Eigentümer der beschädigten Sache: ${c.ownerOfDamagedItem ?? "unbekannt"}`,
    `Verursacher: ${c.causedBy ?? "unbekannt"}`,
    `Geschätzte Schadenhöhe: ${c.estimatedDamageCents != null ? formatCents(c.estimatedDamageCents) : "unbekannt"}`,
    `Bereits einem Versicherer gemeldet: ${c.alreadyReported == null ? "unbekannt" : c.alreadyReported ? "ja" : "nein"}`,
    `Akute Gefahr: ${c.acuteDanger ? "ja" : "nein"}`,
  ].join("\n");
}

/** Allgemeine, fallunabhängige Schritte – als allgemeine Hinweise gekennzeichnet. */
const GENERAL_STEPS = [
  { key: "document", title: "Schaden dokumentieren (Fotos, Beschreibung, ggf. Zeugen notieren)" },
  { key: "proofs", title: "Rechnungen, Kaufbelege oder Eigentumsnachweise sichern" },
  { key: "clauses", title: "Melde- und Mitwirkungspflichten in den relevanten Verträgen prüfen" },
  { key: "report", title: "Schaden – soweit erforderlich – fristgerecht beim Versicherer melden" },
  { key: "confirm", title: "Eingangsbestätigung und Schadennummer notieren" },
];

/**
 * Vertragsprüfung: Alle infrage kommenden Verträge werden betrachtet, Belege geprüft,
 * Aufgaben/Nachweise/Rückfragen abgeleitet. Ohne KI: Vorauswahl nach Sparte, keine Bewertung.
 */
export async function runCoverageCheck(viewer: Viewer, claimId: string): Promise<StructuredAnswer> {
  const [c] = await db.select().from(schema.claim).where(ownClaim(viewer.householdId, claimId));
  if (!c) throw new UserFacingError("Schadenfall nicht gefunden");
  await db.update(schema.claim).set({ status: "policy_check" }).where(eq(schema.claim.id, claimId));
  const question = `Welche meiner Versicherungen könnten für diesen Schadenfall greifen? Welche Voraussetzungen, Ausschlüsse, Fristen und Nachweise sind relevant und was sollte ich als Nächstes tun?`;
  const { answer, analysisId } = await answerQuestion(viewer, question, { caseContext: caseContext(c), subject: { type: "claim", id: claimId } });

  const policies = await db
    .select({ id: schema.insurancePolicy.id, category: schema.insurancePolicy.category, name: schema.insurancePolicy.name })
    .from(schema.insurancePolicy)
    .where(and(eq(schema.insurancePolicy.householdId, viewer.householdId), inArray(schema.insurancePolicy.status, ["active", "needs_review"])));

  await db.transaction(async (tx) => {
    if (answer.mode === "ai") {
      for (const p of answer.policies) {
        await tx
          .insert(schema.claimPolicy)
          .values({ claimId, policyId: p.policyId, householdId: viewer.householdId, assessment: p.assessment, rationale: p.reason, analysisId })
          .onConflictDoUpdate({ target: [schema.claimPolicy.claimId, schema.claimPolicy.policyId], set: { assessment: p.assessment, rationale: p.reason, analysisId } });
      }
      for (const [i, s] of answer.nextSteps.entries()) {
        await tx
          .insert(schema.task)
          .values({ householdId: viewer.householdId, claimId, title: s.step.slice(0, 300), priority: s.urgent ? "urgent" : "soon", source: "ai", sortOrder: i, originKey: `claim:${claimId}:ai:${s.step.slice(0, 80)}` })
          .onConflictDoNothing();
      }
      for (const e of answer.evidence) {
        await tx.insert(schema.claimEvidence).values({ householdId: viewer.householdId, claimId, description: e.slice(0, 300), status: "needed", originKey: e.slice(0, 120) }).onConflictDoNothing();
      }
    } else {
      // Ohne KI: Vorauswahl nach Sparte – ausdrücklich ohne inhaltliche Bewertung
      const hinted = new Set(categoryHints(`${c.title} ${c.description}`));
      const sourcePolicies = new Set(answer.sources.map((s) => s.policyId).filter(Boolean));
      for (const p of policies.filter((x) => hinted.has(x.category) || sourcePolicies.has(x.id))) {
        await tx
          .insert(schema.claimPolicy)
          .values({ claimId, policyId: p.id, householdId: viewer.householdId, assessment: "unclear", rationale: "Vorauswahl nach Versicherungsart bzw. gefundenen Textstellen – keine inhaltliche Prüfung (KI nicht verfügbar).", analysisId })
          .onConflictDoNothing();
      }
    }
    for (const [i, s] of GENERAL_STEPS.entries()) {
      await tx
        .insert(schema.task)
        .values({ householdId: viewer.householdId, claimId, title: s.title, description: "Allgemeiner Hinweis – nicht aus deinen Vertragsunterlagen abgeleitet.", priority: "soon", source: "system", sortOrder: 100 + i, originKey: `claim:${claimId}:general:${s.key}` })
        .onConflictDoNothing();
    }
  });
  const missing = [...missingClaimFacts(c), ...answer.missingInformation];
  await db.update(schema.claim).set({ status: missing.length ? "info_missing" : "preparing" }).where(eq(schema.claim.id, claimId));
  await event(viewer.householdId, claimId, viewer.userId, "analysis", answer.mode === "ai" ? "Vertragsprüfung durchgeführt (KI, mit Belegprüfung)" : "Fundstellensuche durchgeführt (ohne KI-Bewertung)", { analysisId, verification: answer.verification });
  return answer;
}

export async function setClaimStatus(viewer: Viewer, claimId: string, status: (typeof schema.claimStatus.enumValues)[number], note?: string) {
  const res = await db.update(schema.claim).set({ status }).where(ownClaim(viewer.householdId, claimId)).returning({ id: schema.claim.id });
  if (!res.length) throw new UserFacingError("Schadenfall nicht gefunden");
  await event(viewer.householdId, claimId, viewer.userId, "status_change", `Status: ${CLAIM_STATUS_LABEL[status]}${note ? ` – ${note}` : ""}`);
}

export async function addEvidence(viewer: Viewer, claimId: string, description: string, documentId?: string | null) {
  const [c] = await db.select({ id: schema.claim.id }).from(schema.claim).where(ownClaim(viewer.householdId, claimId));
  if (!c) throw new UserFacingError("Schadenfall nicht gefunden");
  if (documentId) {
    const [d] = await db.select({ id: schema.policyDocument.id }).from(schema.policyDocument).where(and(eq(schema.policyDocument.id, documentId), eq(schema.policyDocument.householdId, viewer.householdId)));
    if (!d) throw new UserFacingError("Dokument nicht gefunden");
  }
  await db.insert(schema.claimEvidence).values({ householdId: viewer.householdId, claimId, description, documentId: documentId ?? null, status: documentId ? "available" : "needed" });
}

export async function setEvidenceStatus(viewer: Viewer, evidenceId: string, status: "needed" | "available" | "submitted") {
  const res = await db
    .update(schema.claimEvidence)
    .set({ status })
    .where(and(eq(schema.claimEvidence.id, evidenceId), eq(schema.claimEvidence.householdId, viewer.householdId)))
    .returning({ claimId: schema.claimEvidence.claimId });
  if (!res.length) throw new UserFacingError("Nachweis nicht gefunden");
  return res[0].claimId;
}

export async function addCommunication(
  viewer: Viewer,
  claimId: string,
  input: { direction: "incoming" | "outgoing"; channel: string; subject: string; summary?: string | null; occurredOn: string; policyId?: string | null },
) {
  const [c] = await db.select({ id: schema.claim.id }).from(schema.claim).where(ownClaim(viewer.householdId, claimId));
  if (!c) throw new UserFacingError("Schadenfall nicht gefunden");
  await db.insert(schema.communication).values({ householdId: viewer.householdId, claimId, ...input, summary: input.summary ?? null, policyId: input.policyId ?? null });
  await event(viewer.householdId, claimId, viewer.userId, "communication", `${input.direction === "incoming" ? "Eingang" : "Ausgang"}: ${input.subject}`);
}

/**
 * Markiert eine Meldung als vom Nutzer SELBST eingereicht. Die App versendet nichts;
 * dieser Schritt erfordert eine ausdrückliche Bestätigung im UI.
 */
export async function markSubmittedByUser(viewer: Viewer, claimId: string, input: { occurredOn: string; channel: string; insurerClaimNumber?: string | null }) {
  const res = await db
    .update(schema.claim)
    .set({ status: "submitted_by_user", ...(input.insurerClaimNumber ? { insurerClaimNumber: input.insurerClaimNumber } : {}) })
    .where(ownClaim(viewer.householdId, claimId))
    .returning({ id: schema.claim.id });
  if (!res.length) throw new UserFacingError("Schadenfall nicht gefunden");
  await db.insert(schema.communication).values({ householdId: viewer.householdId, claimId, direction: "outgoing", channel: input.channel, subject: "Schadenmeldung (vom Nutzer eingereicht)", occurredOn: input.occurredOn });
  await event(viewer.householdId, claimId, viewer.userId, "submitted_by_user", `Nutzer hat die Meldung am ${input.occurredOn} selbst eingereicht (${input.channel}).`);
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "claim.marked_submitted", entityType: "claim", entityId: claimId });
}

export async function generateDraft(viewer: Viewer, claimId: string, kind: DraftKind, policyId?: string | null) {
  const data = await getClaim(viewer.householdId, claimId);
  if (!data) throw new UserFacingError("Schadenfall nicht gefunden");
  const chosen = policyId ? data.policies.find((p) => p.cp.policyId === policyId) : data.policies.find((p) => p.cp.assessment === "possible") ?? data.policies[0];
  let policy: { name: string; insurerName: string | null; policyNumber: string | null } | null = null;
  if (chosen) {
    const [p] = await db.select({ name: schema.insurancePolicy.name, policyNumber: schema.insurancePolicy.policyNumber }).from(schema.insurancePolicy).where(and(eq(schema.insurancePolicy.id, chosen.cp.policyId), eq(schema.insurancePolicy.householdId, viewer.householdId)));
    policy = p ? { ...p, insurerName: chosen.insurerName } : null;
  }
  const draft = buildDraft(kind, {
    senderName: viewer.name,
    claim: data.claim,
    policy,
    evidence: data.evidence.map((e) => ({ description: e.documentTitle ? `${e.ev.description} (${e.documentTitle})` : e.ev.description, status: e.ev.status })),
    communications: data.comms,
    assessments: data.policies.map((p) => ({ policyName: p.policyName, assessment: ASSESSMENT_LABEL[p.cp.assessment], reason: p.cp.rationale })),
    openTasks: data.tasks.filter((t) => t.status === "open").map((t) => t.title),
    today: todayIn(),
  });
  const [row] = await db
    .insert(schema.generatedDocument)
    .values({ householdId: viewer.householdId, claimId, policyId: chosen?.cp.policyId ?? null, kind, title: draft.title, content: draft.content, openPoints: draft.openPoints })
    .returning({ id: schema.generatedDocument.id });
  if (kind === "claim_report" && ["draft", "facts_incomplete", "info_missing", "preparing", "policy_check"].includes(data.claim.status)) {
    await db.update(schema.claim).set({ status: "report_prepared" }).where(eq(schema.claim.id, claimId));
  }
  await event(viewer.householdId, claimId, viewer.userId, "document_generated", `Entwurf erstellt: ${draft.title} (nicht versendet)`);
  return row.id;
}

export async function updateDraft(viewer: Viewer, draftId: string, content: string) {
  const openPoints = [...new Set([...content.matchAll(/\[OFFEN: ([^\]]+)\]/g)].map((m) => m[1]))];
  const res = await db
    .update(schema.generatedDocument)
    .set({ content: content.slice(0, 50_000), openPoints })
    .where(and(eq(schema.generatedDocument.id, draftId), eq(schema.generatedDocument.householdId, viewer.householdId)))
    .returning({ claimId: schema.generatedDocument.claimId });
  if (!res.length) throw new UserFacingError("Entwurf nicht gefunden");
  return res[0].claimId;
}

export async function getDraft(householdId: string, draftId: string) {
  const [d] = await db.select().from(schema.generatedDocument).where(and(eq(schema.generatedDocument.id, draftId), eq(schema.generatedDocument.householdId, householdId)));
  return d ?? null;
}

export async function deleteClaim(viewer: Viewer, claimId: string) {
  await db.delete(schema.task).where(and(eq(schema.task.claimId, claimId), eq(schema.task.householdId, viewer.householdId)));
  await db.delete(schema.contractDeadline).where(and(eq(schema.contractDeadline.claimId, claimId), eq(schema.contractDeadline.householdId, viewer.householdId)));
  await db.delete(schema.aiAnalysis).where(and(eq(schema.aiAnalysis.householdId, viewer.householdId), eq(schema.aiAnalysis.subjectType, "claim"), eq(schema.aiAnalysis.subjectId, claimId)));
  await db.update(schema.policyDocument).set({ claimId: null }).where(and(eq(schema.policyDocument.claimId, claimId), eq(schema.policyDocument.householdId, viewer.householdId)));
  const res = await db.delete(schema.claim).where(ownClaim(viewer.householdId, claimId)).returning({ id: schema.claim.id });
  if (!res.length) throw new UserFacingError("Schadenfall nicht gefunden");
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "claim.deleted", entityType: "claim", entityId: claimId });
}
