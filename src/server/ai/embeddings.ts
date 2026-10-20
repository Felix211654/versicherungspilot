import "server-only";
import { env } from "../env";

/**
 * Embeddings für die semantische Suche (optional). Ohne Konfiguration nutzt die Suche
 * ausschließlich die PostgreSQL-Volltextsuche – das wird in der UI ausgewiesen.
 * Voyage AI wird von Anthropic für Embeddings empfohlen; Dimension 1024.
 */
export const EMBEDDING_DIM = 1024;

export function embeddingsEnabled() {
  const e = env();
  return e.EMBEDDING_PROVIDER === "voyage" && Boolean(e.VOYAGE_API_KEY);
}

export async function embed(texts: string[], inputType: "document" | "query"): Promise<{ vectors: number[][]; model: string } | null> {
  const e = env();
  if (!embeddingsEnabled() || texts.length === 0) return null;
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${e.VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: batch, model: e.EMBEDDING_MODEL, input_type: inputType, output_dimension: EMBEDDING_DIM }),
    });
    if (!res.ok) throw new Error(`Embedding-Anfrage fehlgeschlagen (HTTP ${res.status})`);
    const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    for (const d of json.data.sort((a, b) => a.index - b.index)) vectors.push(d.embedding);
  }
  return { vectors, model: e.EMBEDDING_MODEL };
}
