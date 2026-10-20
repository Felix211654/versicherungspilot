import * as z from "zod/v4";

const Citation = z.object({
  sourceId: z.string().describe("ID der Quelle, z. B. S3"),
  quote: z.string().describe("Wörtliches, unverändertes Zitat aus dieser Quelle (mind. 15 Zeichen)"),
});

export const AnswerSchema = z.object({
  shortAnswer: z.string().describe("Kurzantwort in 1–4 Sätzen, ohne Deckungszusage"),
  policies: z
    .array(
      z.object({
        policyRef: z.string().describe("Vertragsreferenz, z. B. P2"),
        assessment: z.enum(["possible", "unlikely", "unclear"]),
        reason: z.string(),
        citations: z.array(Citation),
      }),
    )
    .describe("Nur bei fallbezogenen Fragen: alle infrage kommenden Verträge"),
  statements: z.array(
    z.object({
      section: z.enum(["contract_basis", "requirements", "exclusions", "assessment", "general_info"]),
      text: z.string(),
      basis: z.enum(["contract", "law", "general", "assumption"]),
      citations: z.array(Citation),
    }),
  ),
  missingInformation: z.array(z.string()),
  nextSteps: z.array(z.object({ step: z.string(), urgent: z.boolean() })),
  deadlines: z.array(z.object({ text: z.string(), status: z.enum(["documented", "to_verify"]), citations: z.array(Citation) })),
  evidence: z.array(z.string()),
  draftSuggestions: z.array(z.string()),
  uncertainties: z.array(z.string()),
});
export type RawAnswer = z.infer<typeof AnswerSchema>;

export const DocumentAnalysisSchema = z.object({
  docType: z.enum([
    "versicherungsschein",
    "avb",
    "besondere_bedingungen",
    "produktinformation",
    "nachtrag",
    "beitragsrechnung",
    "beitragsanpassung",
    "schadenmeldung",
    "korrespondenz",
    "leistungsentscheidung",
    "kuendigung",
    "widerruf",
    "gutachten",
    "rechnung",
    "sonstiges",
  ]),
  summary: z.string().describe("Verständliche Zusammenfassung in Alltagssprache (max. 8 Sätze)"),
  terms: z
    .array(
      z.object({
        kind: z.enum(["coverage", "exclusion", "deductible", "sublimit", "waiting_period", "obligation"]),
        title: z.string(),
        explanation: z.string().describe("Erklärung in Alltagssprache"),
        page: z.number().int(),
        quote: z.string().describe("Wörtliches Zitat aus der angegebenen Seite"),
        amountEuro: z.number().nullable(),
      }),
    )
    .describe("Wichtige Klauseln mit Beleg"),
  changesNote: z.string().nullable().describe("Bei Nachträgen: welche Vertragsbestandteile geändert werden"),
});
export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;
