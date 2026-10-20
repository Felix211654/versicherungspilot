/** Gemeinsame Typen für KI-Antworten (Server erzeugt, Client rendert). */

export type SourceRef = {
  id: string; // S1, S2 … (nur innerhalb einer Antwort gültig)
  chunkId: string;
  documentId: string;
  documentTitle: string;
  docType: string;
  policyId: string | null;
  policyName: string | null;
  pageStart: number;
  pageEnd: number;
  heading: string | null;
  excerpt: string;
};

export type VerifiedCitation = { sourceId: string; quote: string };

export type AnswerStatement = {
  section: "contract_basis" | "requirements" | "exclusions" | "assessment" | "general_info";
  text: string;
  /** contract = Vertragsinhalt, law = Gesetz, general = allgemeine Information, assumption = Annahme */
  basis: "contract" | "law" | "general" | "assumption";
  citations: VerifiedCitation[];
  /** true, wenn eine als Vertragsinhalt ausgegebene Aussage keinen gültigen Beleg hat */
  unverified?: boolean;
};

export type PolicyAssessment = {
  policyId: string;
  policyName: string;
  assessment: "possible" | "unlikely" | "unclear";
  reason: string;
  citations: VerifiedCitation[];
  downgraded?: boolean;
};

export type StructuredAnswer = {
  mode: "ai" | "retrieval_only";
  shortAnswer: string;
  policies: PolicyAssessment[];
  statements: AnswerStatement[];
  missingInformation: string[];
  nextSteps: { step: string; urgent: boolean }[];
  deadlines: { text: string; status: "documented" | "to_verify"; citations: VerifiedCitation[] }[];
  evidence: string[];
  draftSuggestions: string[];
  uncertainties: string[];
  sources: SourceRef[];
  searchMode: "hybrid" | "fulltext";
  verification: { removedCitations: number; unverifiedStatements: number; downgradedAssessments: number };
  notice?: string;
};
