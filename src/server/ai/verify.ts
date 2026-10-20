/**
 * Belegprüfung: Jede Quellenangabe der KI wird gegen den tatsächlichen Text geprüft.
 * - Unbekannte Quellen-IDs → Beleg verworfen
 * - Zitat nicht (normalisiert) im Quelltext enthalten → Beleg verworfen
 * - Beleg aus einem anderen Vertrag als dem bewerteten → verworfen
 * - Vertragsaussage ohne gültigen Beleg → als "unbelegt" markiert
 * - Einschätzung "possible"/"unlikely" ohne gültigen Beleg → auf "unclear" herabgestuft
 */
import type { RawAnswer } from "./schemas";
import type { AnswerStatement, PolicyAssessment, StructuredAnswer, VerifiedCitation } from "@/lib/answer-types";

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[­]/g, "")
    .replace(/(\w)-\s+(\w)/g, "$1$2")
    .replace(/[„“”"'‚‘’«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

export type VerifySource = { id: string; content: string; policyRef: string | null };

export function verifyAnswer(
  raw: RawAnswer,
  sources: VerifySource[],
  policyRefs: Map<string, { policyId: string; policyName: string }>,
): Pick<StructuredAnswer, "shortAnswer" | "policies" | "statements" | "missingInformation" | "nextSteps" | "deadlines" | "evidence" | "draftSuggestions" | "uncertainties" | "verification"> {
  const byId = new Map(sources.map((s) => [s.id, { ...s, norm: normalizeForMatch(s.content) }]));
  let removed = 0;

  const check = (cits: { sourceId: string; quote: string }[], requiredPolicyRef?: string): VerifiedCitation[] => {
    const ok: VerifiedCitation[] = [];
    for (const c of cits) {
      const src = byId.get(c.sourceId.trim());
      const q = normalizeForMatch(c.quote);
      const valid =
        src &&
        q.length >= 15 &&
        src.norm.includes(q) &&
        (!requiredPolicyRef || src.policyRef === requiredPolicyRef);
      if (valid) ok.push({ sourceId: src.id, quote: c.quote.trim() });
      else removed++;
    }
    return ok;
  };

  let unverifiedStatements = 0;
  const statements: AnswerStatement[] = raw.statements.map((s) => {
    const citations = check(s.citations);
    const unverified = s.basis === "contract" && citations.length === 0;
    if (unverified) unverifiedStatements++;
    return { section: s.section, text: s.text, basis: s.basis, citations, unverified: unverified || undefined };
  });

  let downgraded = 0;
  const policies: PolicyAssessment[] = [];
  for (const p of raw.policies) {
    const ref = policyRefs.get(p.policyRef.trim());
    if (!ref) {
      removed += p.citations.length;
      continue; // unbekannter Vertrag → verwerfen
    }
    const citations = check(p.citations, p.policyRef.trim());
    let assessment = p.assessment;
    let wasDowngraded = false;
    if (assessment !== "unclear" && citations.length === 0) {
      assessment = "unclear";
      wasDowngraded = true;
      downgraded++;
    }
    policies.push({ policyId: ref.policyId, policyName: ref.policyName, assessment, reason: p.reason, citations, downgraded: wasDowngraded || undefined });
  }

  const deadlines = raw.deadlines.map((d) => {
    const citations = check(d.citations);
    // Eine Frist gilt nur als "belegt", wenn sie einen gültigen Beleg hat.
    return { text: d.text, status: d.status === "documented" && citations.length ? ("documented" as const) : ("to_verify" as const), citations };
  });

  return {
    shortAnswer: raw.shortAnswer,
    policies,
    statements,
    missingInformation: raw.missingInformation,
    nextSteps: raw.nextSteps,
    deadlines,
    evidence: raw.evidence,
    draftSuggestions: raw.draftSuggestions,
    uncertainties: raw.uncertainties,
    verification: { removedCitations: removed, unverifiedStatements, downgradedAssessments: downgraded },
  };
}
