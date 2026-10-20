import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { deleteBlob, putEncrypted, storageKeyFor } from "../storage/storage";
import { signDownloadToken } from "../storage/crypto";
import { validateUpload } from "../processing/validate";
import { enqueueDocumentProcessing } from "../jobs/queue";
import { audit } from "./audit";
import { materializeDocumentTerms } from "./terms";
import type { Viewer } from "../auth/session";

export class UserFacingError extends Error {}

const own = (householdId: string) => eq(schema.policyDocument.householdId, householdId);

async function assertPolicy(householdId: string, policyId: string | null | undefined) {
  if (!policyId) return null;
  const [p] = await db
    .select({ id: schema.insurancePolicy.id })
    .from(schema.insurancePolicy)
    .where(and(eq(schema.insurancePolicy.id, policyId), eq(schema.insurancePolicy.householdId, householdId)));
  if (!p) throw new UserFacingError("Vertrag nicht gefunden");
  return p.id;
}

async function assertClaim(householdId: string, claimId: string | null | undefined) {
  if (!claimId) return null;
  const [c] = await db
    .select({ id: schema.claim.id })
    .from(schema.claim)
    .where(and(eq(schema.claim.id, claimId), eq(schema.claim.householdId, householdId)));
  if (!c) throw new UserFacingError("Schadenfall nicht gefunden");
  return c.id;
}

export type UploadResult =
  | { ok: true; documentId: string; versionId: string; warnings: string[]; duplicateOf?: undefined }
  | { ok: false; error: string; duplicateOf?: string };

/**
 * Nimmt eine Datei entgegen: Validierung → Duplikatprüfung → Verschlüsselung → Ablage →
 * Job für die asynchrone Verarbeitung. Große Dateien blockieren den Request nicht.
 */
export async function uploadDocument(
  viewer: Viewer,
  file: { name: string; data: Buffer },
  opts: { policyId?: string | null; claimId?: string | null; replaceDocumentId?: string | null } = {},
): Promise<UploadResult> {
  const e = env();
  const v = await validateUpload(file.data, e.MAX_UPLOAD_MB * 1024 * 1024);
  if (!v.ok) return { ok: false, error: v.reason };
  const policyId = await assertPolicy(viewer.householdId, opts.policyId);
  const claimId = await assertClaim(viewer.householdId, opts.claimId);
  const sha256 = createHash("sha256").update(file.data).digest("hex");

  const [dup] = await db
    .select({ documentId: schema.documentVersion.documentId })
    .from(schema.documentVersion)
    .where(and(eq(schema.documentVersion.householdId, viewer.householdId), eq(schema.documentVersion.sha256, sha256)))
    .limit(1);
  if (dup) return { ok: false, error: "Diese Datei wurde bereits hochgeladen.", duplicateOf: dup.documentId };

  const fileName = file.name.replace(/[\\/\0]/g, "_").slice(0, 200) || "Dokument";
  const title = fileName.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ").trim() || "Dokument";

  let documentId: string;
  let versionNo = 1;
  if (opts.replaceDocumentId) {
    const [d] = await db.select().from(schema.policyDocument).where(and(eq(schema.policyDocument.id, opts.replaceDocumentId), own(viewer.householdId)));
    if (!d) throw new UserFacingError("Dokument nicht gefunden");
    documentId = d.id;
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${schema.documentVersion.versionNo}), 0)` })
      .from(schema.documentVersion)
      .where(eq(schema.documentVersion.documentId, d.id));
    versionNo = Number(max) + 1;
  } else {
    const [d] = await db
      .insert(schema.policyDocument)
      .values({ householdId: viewer.householdId, policyId, claimId, title, assignment: policyId ? "confirmed" : "unassigned" })
      .returning({ id: schema.policyDocument.id });
    documentId = d.id;
  }

  const versionId = crypto.randomUUID();
  const storageKey = storageKeyFor(viewer.householdId, versionId);
  try {
    const { wrappedKey } = await putEncrypted(storageKey, file.data);
    await db.insert(schema.documentVersion).values({
      id: versionId,
      householdId: viewer.householdId,
      documentId,
      versionNo,
      storageKey,
      fileName,
      mimeType: v.mime,
      sizeBytes: file.data.length,
      sha256,
      wrappedKey,
      status: "uploaded",
      statusMessage: v.warnings.join(" ") || null,
      uploadedBy: viewer.userId,
    });
  } catch (err) {
    if (!opts.replaceDocumentId) await db.delete(schema.policyDocument).where(eq(schema.policyDocument.id, documentId));
    await deleteBlob(storageKey).catch(() => undefined);
    throw err;
  }

  try {
    await enqueueDocumentProcessing({ versionId, householdId: viewer.householdId });
  } catch {
    await db
      .update(schema.documentVersion)
      .set({ status: "failed", error: "Verarbeitung konnte nicht gestartet werden (Warteschlange nicht erreichbar). Bitte erneut starten." })
      .where(eq(schema.documentVersion.id, versionId));
  }
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "document.uploaded", entityType: "document", entityId: documentId, metadata: { versionNo, sizeBytes: file.data.length, mime: v.mime } });
  return { ok: true, documentId, versionId, warnings: v.warnings };
}

/** Aktuellste Version je Dokument (Status wird daraus angezeigt). */
const latestVersion = db
  .select({
    documentId: schema.documentVersion.documentId,
    maxNo: sql<number>`max(${schema.documentVersion.versionNo})`.as("max_no"),
  })
  .from(schema.documentVersion)
  .groupBy(schema.documentVersion.documentId)
  .as("lv");

export async function listDocuments(householdId: string, filter: { policyId?: string; claimId?: string; ids?: string[]; docType?: string } = {}) {
  const conds = [own(householdId)];
  if (filter.policyId) conds.push(eq(schema.policyDocument.policyId, filter.policyId));
  if (filter.claimId) conds.push(eq(schema.policyDocument.claimId, filter.claimId));
  if (filter.ids) {
    if (!filter.ids.length) return [];
    conds.push(inArray(schema.policyDocument.id, filter.ids));
  }
  if (filter.docType) conds.push(eq(schema.policyDocument.docType, filter.docType as (typeof schema.documentType.enumValues)[number]));
  return db
    .select({
      id: schema.policyDocument.id,
      title: schema.policyDocument.title,
      docType: schema.policyDocument.docType,
      documentDate: schema.policyDocument.documentDate,
      tags: schema.policyDocument.tags,
      assignment: schema.policyDocument.assignment,
      policyId: schema.policyDocument.policyId,
      policyName: schema.insurancePolicy.name,
      claimId: schema.policyDocument.claimId,
      createdAt: schema.policyDocument.createdAt,
      versionId: schema.documentVersion.id,
      versionNo: schema.documentVersion.versionNo,
      fileName: schema.documentVersion.fileName,
      mimeType: schema.documentVersion.mimeType,
      sizeBytes: schema.documentVersion.sizeBytes,
      status: schema.documentVersion.status,
      statusMessage: schema.documentVersion.statusMessage,
      error: schema.documentVersion.error,
      pageCount: schema.documentVersion.pageCount,
    })
    .from(schema.policyDocument)
    .innerJoin(latestVersion, eq(latestVersion.documentId, schema.policyDocument.id))
    .innerJoin(
      schema.documentVersion,
      and(eq(schema.documentVersion.documentId, schema.policyDocument.id), eq(schema.documentVersion.versionNo, latestVersion.maxNo)),
    )
    .leftJoin(schema.insurancePolicy, eq(schema.insurancePolicy.id, schema.policyDocument.policyId))
    .where(and(...conds))
    .orderBy(desc(schema.policyDocument.createdAt));
}

export async function getDocument(householdId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(schema.policyDocument)
    .where(and(eq(schema.policyDocument.id, documentId), own(householdId)));
  if (!doc) return null;
  const versions = await db
    .select()
    .from(schema.documentVersion)
    .where(and(eq(schema.documentVersion.documentId, documentId), eq(schema.documentVersion.householdId, householdId)))
    .orderBy(desc(schema.documentVersion.versionNo));
  const current = versions[0];
  const [facts, pages] = current
    ? await Promise.all([
        db
          .select()
          .from(schema.extractedFact)
          .where(and(eq(schema.extractedFact.versionId, current.id), eq(schema.extractedFact.householdId, householdId)))
          .orderBy(asc(schema.extractedFact.field), asc(schema.extractedFact.pageNo)),
        db
          .select({ pageNo: schema.documentPage.pageNo, text: schema.documentPage.text, method: schema.documentPage.method, ocrConfidence: schema.documentPage.ocrConfidence })
          .from(schema.documentPage)
          .where(and(eq(schema.documentPage.versionId, current.id), eq(schema.documentPage.householdId, householdId)))
          .orderBy(asc(schema.documentPage.pageNo)),
      ])
    : [[], []];
  const policy = doc.policyId
    ? (await db.select().from(schema.insurancePolicy).where(and(eq(schema.insurancePolicy.id, doc.policyId), eq(schema.insurancePolicy.householdId, householdId))))[0] ?? null
    : null;
  return { doc, versions, current, facts, pages, policy };
}

export function downloadUrl(householdId: string, versionId: string, disposition: "inline" | "attachment" = "inline", ttlSec = 900) {
  const token = signDownloadToken(env().DOWNLOAD_SIGNING_SECRET, {
    v: versionId,
    h: householdId,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
    d: disposition,
  });
  return `/api/files/${token}`;
}

export async function updateDocumentMeta(
  viewer: Viewer,
  documentId: string,
  patch: { title?: string; docType?: (typeof schema.documentType.enumValues)[number]; documentDate?: string | null; tags?: string[] },
) {
  const [doc] = await db.select().from(schema.policyDocument).where(and(eq(schema.policyDocument.id, documentId), own(viewer.householdId)));
  if (!doc) throw new UserFacingError("Dokument nicht gefunden");
  await db
    .update(schema.policyDocument)
    .set({
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.docType ? { docType: patch.docType, docTypeReview: patch.docType === doc.docType ? "confirmed" : "corrected" } : {}),
      ...(patch.documentDate !== undefined ? { documentDate: patch.documentDate } : {}),
      ...(patch.tags ? { tags: patch.tags } : {}),
    })
    .where(eq(schema.policyDocument.id, documentId));
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "document.updated", entityType: "document", entityId: documentId });
}

export async function assignDocument(viewer: Viewer, documentId: string, policyId: string | null) {
  const pid = await assertPolicy(viewer.householdId, policyId);
  const res = await db
    .update(schema.policyDocument)
    .set({ policyId: pid, assignment: pid ? "confirmed" : "unassigned" })
    .where(and(eq(schema.policyDocument.id, documentId), own(viewer.householdId)))
    .returning({ id: schema.policyDocument.id });
  if (!res.length) throw new UserFacingError("Dokument nicht gefunden");
  // Fristen aus diesem Dokument dem Vertrag zuordnen
  await db
    .update(schema.contractDeadline)
    .set({ policyId: pid })
    .where(and(eq(schema.contractDeadline.sourceDocumentId, documentId), eq(schema.contractDeadline.householdId, viewer.householdId)));
  if (pid) await materializeDocumentTerms(viewer.householdId, documentId);
  else
    await db
      .delete(schema.policyTerm)
      .where(and(eq(schema.policyTerm.sourceDocumentId, documentId), eq(schema.policyTerm.householdId, viewer.householdId), inArray(schema.policyTerm.review, ["auto", "unclear"])));
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "document.assigned", entityType: "document", entityId: documentId, metadata: { policyId: pid } });
}

export async function reviewFact(viewer: Viewer, factId: string, action: { kind: "confirm" } | { kind: "reject" } | { kind: "correct"; value: string }) {
  const [f] = await db
    .select()
    .from(schema.extractedFact)
    .where(and(eq(schema.extractedFact.id, factId), eq(schema.extractedFact.householdId, viewer.householdId)));
  if (!f) throw new UserFacingError("Angabe nicht gefunden");
  await db
    .update(schema.extractedFact)
    .set({
      review: action.kind === "confirm" ? "confirmed" : action.kind === "reject" ? "rejected" : "corrected",
      correctedValue: action.kind === "correct" ? action.value.slice(0, 500) : f.correctedValue,
      reviewedAt: new Date(),
      reviewedBy: viewer.userId,
    })
    .where(eq(schema.extractedFact.id, factId));
  return f.documentId;
}

/** Schließt die Prüfung eines Dokuments ab (Status → abgeschlossen, Prüfaufgabe erledigt). */
export async function completeReview(viewer: Viewer, documentId: string) {
  const d = await getDocument(viewer.householdId, documentId);
  if (!d?.current) throw new UserFacingError("Dokument nicht gefunden");
  if (d.current.status !== "needs_review") throw new UserFacingError("Dieses Dokument wartet nicht auf eine Prüfung.");
  await db.transaction(async (tx) => {
    await tx
      .update(schema.extractedFact)
      .set({ review: "confirmed", reviewedAt: new Date(), reviewedBy: viewer.userId })
      .where(and(eq(schema.extractedFact.versionId, d.current!.id), eq(schema.extractedFact.review, "auto")));
    await tx
      .update(schema.policyDocument)
      .set({ assignment: d.doc.policyId ? "confirmed" : "unassigned", docTypeReview: d.doc.docTypeReview === "auto" ? "confirmed" : d.doc.docTypeReview })
      .where(eq(schema.policyDocument.id, documentId));
    await tx.update(schema.documentVersion).set({ status: "completed", statusMessage: "Angaben geprüft." }).where(eq(schema.documentVersion.id, d.current!.id));
    await tx
      .update(schema.task)
      .set({ status: "done" })
      .where(and(eq(schema.task.householdId, viewer.householdId), eq(schema.task.originKey, `doc:${documentId}:review`)));
  });
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "document.review_completed", entityType: "document", entityId: documentId });
}

export async function reprocessDocument(viewer: Viewer, documentId: string) {
  const d = await getDocument(viewer.householdId, documentId);
  if (!d?.current) throw new UserFacingError("Dokument nicht gefunden");
  if (!["failed", "needs_review", "completed"].includes(d.current.status)) throw new UserFacingError("Die Verarbeitung läuft bereits.");
  await db.update(schema.documentVersion).set({ status: "uploaded", error: null, statusMessage: "Erneute Verarbeitung angefordert" }).where(eq(schema.documentVersion.id, d.current.id));
  await enqueueDocumentProcessing({ versionId: d.current.id, householdId: viewer.householdId });
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "document.reprocess", entityType: "document", entityId: documentId });
}

/** Löscht Dokument inkl. aller Versionen, Dateien, Seiten, Chunks/Embeddings, Fakten und abgeleiteten Klauseln. */
export async function deleteDocument(viewer: Viewer, documentId: string) {
  const versions = await db
    .select({ storageKey: schema.documentVersion.storageKey })
    .from(schema.documentVersion)
    .where(and(eq(schema.documentVersion.documentId, documentId), eq(schema.documentVersion.householdId, viewer.householdId)));
  // Automatisch abgeleitete Klauseln entfernen (ON DELETE SET NULL würde sie ohne Quelle zurücklassen)
  await db
    .delete(schema.policyTerm)
    .where(and(eq(schema.policyTerm.sourceDocumentId, documentId), eq(schema.policyTerm.householdId, viewer.householdId), inArray(schema.policyTerm.review, ["auto", "unclear"])));
  const res = await db
    .delete(schema.policyDocument)
    .where(and(eq(schema.policyDocument.id, documentId), own(viewer.householdId)))
    .returning({ id: schema.policyDocument.id });
  if (!res.length) throw new UserFacingError("Dokument nicht gefunden");
  await db.delete(schema.aiAnalysis).where(and(eq(schema.aiAnalysis.householdId, viewer.householdId), eq(schema.aiAnalysis.subjectType, "document"), eq(schema.aiAnalysis.subjectId, documentId)));
  for (const v of versions) await deleteBlob(v.storageKey);
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "document.deleted", entityType: "document", entityId: documentId, metadata: { versions: versions.length } });
}
