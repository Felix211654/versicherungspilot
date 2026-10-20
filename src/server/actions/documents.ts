"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "../auth/session";
import { assignDocument, completeReview, deleteDocument, reprocessDocument, reviewFact, updateDocumentMeta } from "../services/documents";
import { schema } from "../db";
import { guard, optStr, str, type ActionState } from "./util";

export async function updateDocumentAction(documentId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const docType = str(fd, "docType") as (typeof schema.documentType.enumValues)[number];
    if (docType && !schema.documentType.enumValues.includes(docType)) return { error: "Ungültiger Dokumenttyp" };
    const documentDate = optStr(fd, "documentDate");
    if (documentDate && !/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) return { error: "Ungültiges Datum" };
    const tags = str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
    await updateDocumentMeta(viewer, documentId, { title: str(fd, "title") || undefined, docType: docType || undefined, documentDate, tags });
    revalidatePath(`/dokumente/${documentId}`);
    return { ok: true, message: "Gespeichert." };
  });
}

export async function assignDocumentAction(documentId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    await assignDocument(viewer, documentId, optStr(fd, "policyId"));
    revalidatePath(`/dokumente/${documentId}`);
    return { ok: true, message: "Zuordnung gespeichert." };
  });
}

export async function reviewFactAction(factId: string, kind: "confirm" | "reject" | "correct", _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const value = str(fd, "value");
    if (kind === "correct" && !value) return { error: "Bitte einen Wert angeben." };
    const documentId = await reviewFact(viewer, factId, kind === "correct" ? { kind, value } : { kind });
    revalidatePath(`/dokumente/${documentId}`);
    return { ok: true };
  });
}

export async function completeReviewAction(documentId: string): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    await completeReview(viewer, documentId);
    revalidatePath(`/dokumente/${documentId}`);
    return { ok: true, message: "Prüfung abgeschlossen." };
  });
}

export async function reprocessDocumentAction(documentId: string): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    await reprocessDocument(viewer, documentId);
    revalidatePath(`/dokumente/${documentId}`);
    return { ok: true, message: "Verarbeitung wurde neu gestartet." };
  });
}

export async function deleteDocumentAction(documentId: string): Promise<ActionState> {
  const res = await guard(async () => {
    const viewer = await requireViewer();
    await deleteDocument(viewer, documentId);
  });
  if (res?.error) return res;
  revalidatePath("/dokumente");
  redirect("/dokumente?geloescht=1");
}
