import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { embed, embeddingsEnabled } from "../ai/embeddings";

/**
 * Hybride Suche über die Dokumente EINES Haushalts:
 * - Volltext (PostgreSQL, deutsche Stammformen, Präfixsuche für Komposita)
 * - optional semantisch (pgvector), wenn Embeddings konfiguriert sind
 * Zusammenführung per Reciprocal Rank Fusion. Mandantenfilter ist nicht optional.
 */

export type SearchHit = {
  chunkId: string;
  documentId: string;
  versionId: string;
  documentTitle: string;
  docType: string;
  policyId: string | null;
  policyName: string | null;
  pageStart: number;
  pageEnd: number;
  heading: string | null;
  content: string;
  score: number;
};

const STOPWORDS = new Set(
  "aber alle allem auch auf aus bei bin bis bist da damit dann das dass dein deine dem den der des die dies diese diesem dieser doch dort du durch ein eine einem einen einer eines er es etwas für hat habe haben hatte hier ich ihr im in ist ja jede jedem jeden jeder kann kein keine können mein meine meinem meinen meiner mich mir mit muss nach nicht noch nun nur ob oder ohne sehr sein seine sich sie sind so über um und uns unser unter vom von vor war wann warum was weil welche welchem welchen welcher wenn wer werde werden wie wird wo wurde zu zum zur zwischen versicherung versichert versicherungen greifen könnte kommt".split(
    " ",
  ),
);

/** Fachliche Synonyme/Oberbegriffe: verbessern die Trefferquote bei Alltagssprache. */
const SYNONYMS: Record<string, string[]> = {
  fahrrad: ["fahrrad", "fahrräder", "rad", "ebike", "pedelec"],
  laptop: ["laptop", "notebook", "elektronik", "elektronisch"],
  handy: ["handy", "smartphone", "mobiltelefon", "elektronik"],
  gestohlen: ["diebstahl", "einbruchdiebstahl", "entwendet"],
  geklaut: ["diebstahl", "einbruchdiebstahl"],
  diebstahl: ["diebstahl", "einbruchdiebstahl"],
  keller: ["keller", "gemeinschaftsraum", "nebengebäude", "versicherungsort"],
  wasserschaden: ["leitungswasser", "wasser", "rohrbruch"],
  wasser: ["leitungswasser", "wasser"],
  mietwagen: ["mietwagen", "ersatzfahrzeug", "mietfahrzeug", "nutzungsausfall"],
  elementar: ["elementar", "überschwemmung", "starkregen", "rückstau", "hochwasser"],
  hochwasser: ["überschwemmung", "elementar", "hochwasser"],
  starkregen: ["starkregen", "elementar", "überschwemmung"],
  beschädigt: ["beschädigung", "sachschaden", "schadensersatz", "haftpflicht"],
  kaputt: ["beschädigung", "sachschaden", "zerstörung"],
  freund: ["dritte", "fremde", "geliehen", "gemietet"],
  geliehen: ["geliehen", "gemietet", "fremde"],
  umzug: ["umzug", "wohnungswechsel"],
  unfall: ["unfall", "unfallereignis"],
  kündigung: ["kündigung", "kündigungsfrist", "kündigen", "ablauf"],
  kündigungsfrist: ["kündigung", "kündigungsfrist", "ablauf"],
  selbstbeteiligung: ["selbstbeteiligung", "selbstbehalt"],
  abgelehnt: ["ablehnung", "leistungsfreiheit", "obliegenheit"],
  ablehnung: ["ablehnung", "leistungsfreiheit", "obliegenheit"],
  frist: ["frist", "unverzüglich", "anzeige"],
  melden: ["anzeige", "unverzüglich", "obliegenheit", "melden"],
  handwerker: ["handwerker", "dritte", "haftpflicht", "regress"],
  anwalt: ["rechtsanwalt", "rechtsschutz"],
};

export function buildTsQuery(question: string): string | null {
  const words = question
    .toLowerCase()
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const terms = new Set<string>();
  for (const w of words) {
    terms.add(w);
    for (const [k, syns] of Object.entries(SYNONYMS)) if (w.startsWith(k)) syns.forEach((s) => terms.add(s));
  }
  const safe = [...terms].map((t) => t.replace(/[^\p{L}\p{N}]/gu, "")).filter((t) => t.length >= 3);
  if (!safe.length) return null;
  // Präfix-Suche (":*") erfasst Komposita wie "Fahrraddiebstahl" bei "fahrrad"
  return safe.slice(0, 30).map((t) => `${t}:*`).join(" | ");
}

type Row = Omit<SearchHit, "score"> & { rank: number };

async function fullText(householdId: string, tsq: string, limit: number, policyIds?: string[]): Promise<Row[]> {
  const policyFilter = policyIds?.length ? sql`AND d.policy_id IN (${sql.join(policyIds.map((p) => sql`${p}`), sql`, `)})` : sql``;
  const res = await db.execute(sql`
    SELECT c.id AS "chunkId", c.document_id AS "documentId", c.version_id AS "versionId",
           d.title AS "documentTitle", d.doc_type AS "docType", d.policy_id AS "policyId", p.name AS "policyName",
           c.page_start AS "pageStart", c.page_end AS "pageEnd", c.heading, c.content,
           ts_rank_cd(c.tsv, q, 32) AS rank
    FROM document_chunk c
    JOIN policy_document d ON d.id = c.document_id AND d.household_id = ${householdId}
    JOIN document_version v ON v.id = c.version_id
    LEFT JOIN insurance_policy p ON p.id = d.policy_id AND p.household_id = ${householdId},
         to_tsquery('german', ${tsq}) q
    WHERE c.household_id = ${householdId} AND c.tsv @@ q ${policyFilter}
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
  return res.rows as unknown as Row[];
}

async function semantic(householdId: string, question: string, limit: number, policyIds?: string[]): Promise<Row[]> {
  if (!embeddingsEnabled()) return [];
  const e = await embed([question], "query");
  if (!e) return [];
  const vec = `[${e.vectors[0].join(",")}]`;
  const policyFilter = policyIds?.length ? sql`AND d.policy_id IN (${sql.join(policyIds.map((p) => sql`${p}`), sql`, `)})` : sql``;
  const res = await db.execute(sql`
    SELECT c.id AS "chunkId", c.document_id AS "documentId", c.version_id AS "versionId",
           d.title AS "documentTitle", d.doc_type AS "docType", d.policy_id AS "policyId", p.name AS "policyName",
           c.page_start AS "pageStart", c.page_end AS "pageEnd", c.heading, c.content,
           1 - (c.embedding <=> ${vec}::vector) AS rank
    FROM document_chunk c
    JOIN policy_document d ON d.id = c.document_id AND d.household_id = ${householdId}
    LEFT JOIN insurance_policy p ON p.id = d.policy_id AND p.household_id = ${householdId}
    WHERE c.household_id = ${householdId} AND c.embedding IS NOT NULL ${policyFilter}
    ORDER BY c.embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
  return res.rows as unknown as Row[];
}

export async function searchChunks(
  householdId: string,
  question: string,
  opts: { limit?: number; policyIds?: string[] } = {},
): Promise<{ hits: SearchHit[]; mode: "hybrid" | "fulltext" }> {
  const limit = opts.limit ?? 12;
  const tsq = buildTsQuery(question);
  const [ft, sem] = await Promise.all([
    tsq ? fullText(householdId, tsq, limit * 2, opts.policyIds) : Promise.resolve([]),
    semantic(householdId, question, limit * 2, opts.policyIds).catch(() => [] as Row[]),
  ]);
  // Reciprocal Rank Fusion
  const scores = new Map<string, { row: Row; score: number }>();
  const add = (rows: Row[]) =>
    rows.forEach((r, i) => {
      const cur = scores.get(r.chunkId);
      const s = 1 / (60 + i);
      if (cur) cur.score += s;
      else scores.set(r.chunkId, { row: r, score: s });
    });
  add(ft);
  add(sem);
  const hits = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) => {
      const { rank: _rank, ...rest } = row;
      void _rank;
      return { ...rest, score };
    });
  return { hits, mode: sem.length ? "hybrid" : "fulltext" };
}

/** Einfache Dokumentsuche für das Archiv (Titel, Tags, Inhalt). */
export async function searchDocuments(householdId: string, q: string) {
  const tsq = buildTsQuery(q);
  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const res = await db.execute(sql`
    SELECT d.id, max(CASE WHEN ${tsq ? sql`c.tsv @@ to_tsquery('german', ${tsq})` : sql`false`} THEN ts_rank_cd(c.tsv, to_tsquery('german', ${tsq ?? "x"})) ELSE 0 END)
           + max(CASE WHEN d.title ILIKE ${like} THEN 1 ELSE 0 END) AS score
    FROM policy_document d
    LEFT JOIN document_chunk c ON c.document_id = d.id AND c.household_id = ${householdId}
    WHERE d.household_id = ${householdId}
      AND (d.title ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(d.tags) t WHERE t ILIKE ${like}) ${tsq ? sql`OR c.tsv @@ to_tsquery('german', ${tsq})` : sql``})
    GROUP BY d.id
    ORDER BY score DESC
    LIMIT 50
  `);
  return (res.rows as { id: string; score: number }[]).map((r) => r.id);
}
