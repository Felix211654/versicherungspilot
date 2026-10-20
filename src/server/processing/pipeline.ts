import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { getDecrypted } from "../storage/storage";
import { scanWithClamd } from "./malware";
import { extractText, type PageText } from "./extract-text";
import { classifyCategory, classifyDocument } from "./classify";
import { extractFacts, type ExtractedFactDraft } from "./facts";
import { chunkPages } from "./chunk";
import { embed, embeddingsEnabled } from "../ai/embeddings";
import { getLlm } from "../ai/provider";
import { DOCUMENT_ANALYSIS_SYSTEM, asData } from "../ai/prompts";
import { DocumentAnalysisSchema } from "../ai/schemas";
import { normalizeForMatch } from "../ai/verify";
import { materializeDocumentTerms } from "../services/terms";
import { logger, safeErrorMessage } from "../lib/logger";
import type { AllowedMime } from "./validate";

type Status = (typeof schema.processingStatus.enumValues)[number];

async function setStatus(versionId: string, status: Status, statusMessage?: string | null, error?: string | null) {
  await db
    .update(schema.documentVersion)
    .set({ status, statusMessage: statusMessage ?? null, error: error ?? null, ...(status === "completed" || status === "needs_review" ? { processedAt: new Date() } : {}) })
    .where(eq(schema.documentVersion.id, versionId));
}

export const normalizePolicyNumber = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Nicht wiederholbare Fehler (z. B. unleserliche Datei) – kein Retry. */
export class PermanentProcessingError extends Error {}

/**
 * Verarbeitet eine Dokumentversion vollständig. Idempotent: abgeleitete Daten der
 * Version werden vor dem Neuaufbau gelöscht, damit Wiederholungen keine Duplikate erzeugen.
 */
export async function processDocumentVersion(versionId: string, householdId: string): Promise<void> {
  const [version] = await db
    .select()
    .from(schema.documentVersion)
    .where(and(eq(schema.documentVersion.id, versionId), eq(schema.documentVersion.householdId, householdId)));
  if (!version) throw new PermanentProcessingError("Dokumentversion nicht gefunden");
  const [doc] = await db.select().from(schema.policyDocument).where(eq(schema.policyDocument.id, version.documentId));
  if (!doc) throw new PermanentProcessingError("Dokument nicht gefunden");
  const e = env();
  const warnings: string[] = [];

  await db
    .update(schema.documentVersion)
    .set({ attempts: sql`${schema.documentVersion.attempts} + 1` })
    .where(eq(schema.documentVersion.id, versionId));

  try {
    // 1. Datei laden & Virenscan
    await setStatus(versionId, "scanning", "Datei wird geprüft");
    const buf = await getDecrypted(version.storageKey, version.wrappedKey);
    const scan = await scanWithClamd(buf, e.CLAMAV_HOST, e.CLAMAV_PORT);
    await db.update(schema.documentVersion).set({ malwareScan: scan.status }).where(eq(schema.documentVersion.id, versionId));
    if (scan.status === "infected") throw new PermanentProcessingError(`Schadsoftware erkannt (${scan.detail}). Die Datei wird nicht weiterverarbeitet.`);
    if (scan.status === "error") warnings.push(`Virenscan nicht möglich: ${scan.detail}`);

    // 2. Text extrahieren (digital oder OCR)
    await setStatus(versionId, "extracting_text", "Text wird erkannt");
    const extraction = await extractText(buf, version.mimeType as AllowedMime, {
      ocrLanguages: e.OCR_LANGUAGES,
      tmpDir: e.TMP_DIR,
      onOcr: () => setStatus(versionId, "ocr", "Gescanntes Dokument – Texterkennung (OCR) läuft"),
    });
    warnings.push(...extraction.warnings);
    const pages = extraction.pages;
    const totalChars = pages.reduce((a, p) => a + p.text.replace(/\s/g, "").length, 0);
    if (totalChars < 30) {
      throw new PermanentProcessingError(
        "Im Dokument konnte kein lesbarer Text erkannt werden. Bitte eine besser lesbare Fassung (z. B. schärferes Foto oder Original-PDF) hochladen.",
      );
    }

    await setStatus(versionId, "analyzing", "Vertrag wird analysiert");

    // 3. Klassifikation & Extraktion (regelbasiert, mit Fundstellen)
    const docType = classifyDocument(pages, version.fileName);
    const category = classifyCategory(pages, version.fileName);
    const effectiveDocType = doc.docTypeReview === "confirmed" || doc.docTypeReview === "corrected" ? doc.docType : docType.value;
    const facts = extractFacts(pages, {
      // Fristen aus Schreiben: in allen Dokumenten außer Bedingungswerken (dort sind Datumsangaben keine Fristen für den Nutzer)
      includeLetterDeadlines: !["avb", "besondere_bedingungen", "produktinformation", "widerruf"].includes(effectiveDocType),
    });
    const categoryFact =
      category.value !== "sonstige"
        ? { field: "category", valueText: category.value, pageNo: 1, snippet: category.evidence.join(" · ").slice(0, 240), method: "rule" as const, confidence: category.confidence }
        : null;

    // 4. Chunks bilden
    const chunks = chunkPages(pages);
    let vectors: number[][] | null = null;
    let embeddingModel: string | null = null;
    if (embeddingsEnabled()) {
      try {
        const r = await embed(chunks.map((c) => `${c.heading ?? ""}\n${c.content}`), "document");
        if (r) {
          vectors = r.vectors;
          embeddingModel = r.model;
        }
      } catch (err) {
        warnings.push(`Semantischer Index konnte nicht erstellt werden (${safeErrorMessage(err)}); Volltextsuche ist verfügbar.`);
      }
    }

    // 5. Persistieren (idempotent)
    await db.transaction(async (tx) => {
      await tx.delete(schema.documentPage).where(eq(schema.documentPage.versionId, versionId));
      await tx.delete(schema.documentChunk).where(eq(schema.documentChunk.versionId, versionId));
      await tx
        .delete(schema.extractedFact)
        .where(and(eq(schema.extractedFact.versionId, versionId), inArray(schema.extractedFact.review, ["auto", "unclear"])));
      if (pages.length)
        await tx.insert(schema.documentPage).values(
          pages.map((p) => ({ householdId, versionId, pageNo: p.pageNo, text: p.text, method: p.method, ocrConfidence: p.ocrConfidence ?? null })),
        );
      for (let i = 0; i < chunks.length; i += 200) {
        await tx.insert(schema.documentChunk).values(
          chunks.slice(i, i + 200).map((c, j) => ({
            householdId,
            documentId: doc.id,
            versionId,
            chunkIndex: c.chunkIndex,
            pageStart: c.pageStart,
            pageEnd: c.pageEnd,
            heading: c.heading,
            content: c.content,
            embedding: vectors ? vectors[i + j] : null,
            embeddingModel,
          })),
        );
      }
      const factRows = [
        ...facts,
        ...(categoryFact ? [categoryFact] : []),
      ].map((f: Omit<ExtractedFactDraft, "field"> & { field: string }) => ({
        householdId,
        documentId: doc.id,
        versionId,
        field: f.field,
        valueText: f.valueText,
        valueJson: f.valueJson ?? null,
        pageNo: f.pageNo,
        snippet: f.snippet,
        method: f.method,
        confidence: f.confidence,
        review: f.confidence === "low" ? ("unclear" as const) : ("auto" as const),
      }));
      if (factRows.length) await tx.insert(schema.extractedFact).values(factRows);
      await tx
        .update(schema.documentVersion)
        .set({ pageCount: pages.length, textMethod: extraction.method })
        .where(eq(schema.documentVersion.id, versionId));
      const docDate = facts.find((f) => f.field === "document_date")?.valueText;
      await tx
        .update(schema.policyDocument)
        .set({
          docType: effectiveDocType,
          ...(doc.documentDate ? {} : docDate ? { documentDate: docDate } : {}),
        })
        .where(eq(schema.policyDocument.id, doc.id));
    });

    // 6. Vertragszuordnung
    let policyId = doc.policyId;
    let assignment = doc.assignment;
    if (!policyId) {
      const numbers = facts.filter((f) => f.field === "policy_number").map((f) => normalizePolicyNumber(f.valueText));
      if (numbers.length) {
        const candidates = await db
          .select({ id: schema.insurancePolicy.id, policyNumber: schema.insurancePolicy.policyNumber })
          .from(schema.insurancePolicy)
          .where(eq(schema.insurancePolicy.householdId, householdId));
        const match = candidates.filter((c) => c.policyNumber && numbers.includes(normalizePolicyNumber(c.policyNumber)));
        if (match.length === 1) {
          policyId = match[0].id;
          assignment = "suggested";
          await db.update(schema.policyDocument).set({ policyId, assignment }).where(eq(schema.policyDocument.id, doc.id));
        }
      }
    }

    // 7. Optionale KI-Analyse (Zusammenfassung + Schlüsselklauseln mit verifizierten Zitaten)
    await analyzeWithLlm({ householdId, documentId: doc.id, uploadedBy: version.uploadedBy, pages, warnings });
    if (policyId) await materializeDocumentTerms(householdId, doc.id);

    // 8. Fristen aus Schreiben (unklar → Bestätigung erforderlich)
    for (const f of facts.filter((x) => x.field === "letter_deadline")) {
      await db
        .insert(schema.contractDeadline)
        .values({
          householdId,
          policyId,
          claimId: doc.claimId,
          kind: "insurer_letter",
          title: `Frist aus „${doc.title}“`,
          description: "Automatisch im Schreiben erkannt. Bitte prüfen, ob es sich um eine verbindliche Frist handelt und was bis dahin zu tun ist.",
          dueDate: f.valueText,
          certainty: "unclear",
          status: "needs_confirmation",
          sourceDocumentId: doc.id,
          sourcePage: f.pageNo,
          sourceSnippet: f.snippet,
          originKey: `doc:${doc.id}:letter:${f.valueText}`,
        })
        .onConflictDoNothing();
    }

    // 9. Status & Prüfaufgabe
    const needsReview = !policyId || assignment !== "confirmed" || facts.some((f) => f.confidence === "low") || docType.confidence === "low";
    const finalMsg = [
      needsReview ? "Bitte erkannte Angaben und Zuordnung prüfen." : "Verarbeitung abgeschlossen.",
      ...warnings,
    ].join(" ");
    if (needsReview) {
      await db
        .insert(schema.task)
        .values({
          householdId,
          documentId: doc.id,
          policyId,
          title: `Angaben prüfen: ${doc.title}`,
          description: "Automatisch erkannte Angaben, Dokumenttyp und Vertragszuordnung bestätigen oder korrigieren.",
          priority: "soon",
          source: "system",
          originKey: `doc:${doc.id}:review`,
        })
        .onConflictDoNothing();
    }
    await setStatus(versionId, needsReview ? "needs_review" : "completed", finalMsg.slice(0, 1000));
    logger.info("document.processed", { versionId, pages: pages.length, chunks: chunks.length, facts: facts.length, method: extraction.method });
  } catch (err) {
    const permanent = err instanceof PermanentProcessingError;
    await setStatus(versionId, "failed", permanent ? null : "Vorübergehender Fehler – erneuter Versuch möglich", safeErrorMessage(err));
    logger.error("document.failed", { versionId, permanent, error: safeErrorMessage(err) });
    if (!permanent) throw err; // pg-boss wiederholt mit Backoff
  }
}

async function analyzeWithLlm(p: { householdId: string; documentId: string; uploadedBy: string | null; pages: PageText[]; warnings: string[] }) {
  const llm = getLlm();
  if (!llm || !p.uploadedBy) return;
  const [settings] = await db
    .select({ consent: schema.userSettings.aiProcessingConsentAt })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, p.uploadedBy));
  if (!settings?.consent) return;
  const totalChars = p.pages.reduce((a, x) => a + x.text.length, 0);
  if (totalChars > 400_000) {
    p.warnings.push("Dokument zu umfangreich für die KI-Zusammenfassung; Suche und Fundstellen sind verfügbar.");
    return;
  }
  const user = p.pages.map((x) => `<seite nr="${x.pageNo}">\n${asData(x.text)}\n</seite>`).join("\n");
  try {
    const { data, usage } = await llm.generateStructured({ system: DOCUMENT_ANALYSIS_SYSTEM, user, schema: DocumentAnalysisSchema, effort: "low" });
    // Zitate gegen die angegebene Seite prüfen – unbelegte Klauseln verwerfen
    const pageNorm = new Map(p.pages.map((x) => [x.pageNo, normalizeForMatch(x.text)]));
    const terms = data.terms.map((t) => ({ ...t, verified: Boolean(pageNorm.get(t.page)?.includes(normalizeForMatch(t.quote)) && t.quote.length >= 15) }));
    const rejected = terms.filter((t) => !t.verified).length;
    await db
      .update(schema.policyDocument)
      .set({ summary: { text: data.summary, changesNote: data.changesNote, terms: terms.filter((t) => t.verified), rejectedTerms: rejected, model: llm.model, createdAt: new Date().toISOString() } })
      .where(eq(schema.policyDocument.id, p.documentId));
    await db.insert(schema.aiAnalysis).values({
      householdId: p.householdId,
      kind: "document_summary",
      subjectType: "document",
      subjectId: p.documentId,
      provider: llm.name,
      model: llm.model,
      status: "completed",
      verification: { rejectedTerms: rejected, acceptedTerms: terms.length - rejected },
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  } catch (err) {
    p.warnings.push(`KI-Zusammenfassung fehlgeschlagen (${safeErrorMessage(err)}).`);
    await db.insert(schema.aiAnalysis).values({
      householdId: p.householdId,
      kind: "document_summary",
      subjectType: "document",
      subjectId: p.documentId,
      provider: llm.name,
      model: llm.model,
      status: "failed",
      error: safeErrorMessage(err),
    });
  }
}
