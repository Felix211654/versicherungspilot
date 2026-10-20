"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "../auth/session";
import { addCommunication, addEvidence, ClaimInput, createClaim, deleteClaim, generateDraft, markSubmittedByUser, runCoverageCheck, setClaimStatus, setEvidenceStatus, updateClaim, updateDraft } from "../services/claims";
import { schema } from "../db";
import { rateLimit } from "../lib/rate-limit";
import type { DraftKind } from "../services/drafts";
import { euroToCents, guard, optStr, str, zodFieldErrors, type ActionState } from "./util";

function parseClaim(fd: FormData) {
  const reported = str(fd, "alreadyReported");
  return ClaimInput.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    occurredOn: optStr(fd, "occurredOn"),
    occurredAtText: optStr(fd, "occurredAtText"),
    location: optStr(fd, "location"),
    ownerOfDamagedItem: optStr(fd, "ownerOfDamagedItem"),
    causedBy: optStr(fd, "causedBy"),
    estimatedDamageCents: euroToCents(str(fd, "estimatedDamage")),
    alreadyReported: reported === "yes" ? true : reported === "no" ? false : null,
    acuteDanger: fd.get("acuteDanger") === "on",
  });
}

export async function saveClaimAction(claimId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = claimId;
  const res = await guard(async () => {
    const viewer = await requireViewer();
    const parsed = parseClaim(fd);
    if (!parsed.success) return { error: "Bitte prüfe die markierten Felder.", fieldErrors: zodFieldErrors(parsed.error.issues) };
    if (claimId) await updateClaim(viewer, claimId, parsed.data);
    else id = await createClaim(viewer, parsed.data);
  });
  if (res?.error) return res;
  revalidatePath("/schadenfaelle");
  redirect(`/schadenfaelle/${id}`);
}

export async function runCheckAction(claimId: string): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const rl = await rateLimit(`ai:${viewer.userId}`, 30, 3600);
    if (!rl.ok) return { error: "Zu viele Anfragen. Bitte später erneut versuchen." };
    const a = await runCoverageCheck(viewer, claimId);
    revalidatePath(`/schadenfaelle/${claimId}`);
    return { ok: true, message: a.mode === "ai" ? "Vertragsprüfung abgeschlossen." : "Fundstellensuche abgeschlossen (ohne KI-Bewertung)." };
  });
}

export async function setClaimStatusAction(claimId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const status = str(fd, "status") as (typeof schema.claimStatus.enumValues)[number];
    if (!schema.claimStatus.enumValues.includes(status)) return { error: "Ungültiger Status" };
    if (status === "submitted_by_user") return { error: "Bitte nutze „Als eingereicht markieren“." };
    await setClaimStatus(viewer, claimId, status, optStr(fd, "note") ?? undefined);
    revalidatePath(`/schadenfaelle/${claimId}`);
    return { ok: true, message: "Status aktualisiert." };
  });
}

export async function markSubmittedAction(claimId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    if (fd.get("confirm") !== "on") return { error: "Bitte bestätige, dass du die Meldung selbst an den Versicherer übermittelt hast." };
    const occurredOn = str(fd, "occurredOn");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Bitte das Datum der Einreichung angeben." };
    await markSubmittedByUser(viewer, claimId, { occurredOn, channel: str(fd, "channel") || "letter", insurerClaimNumber: optStr(fd, "insurerClaimNumber") });
    revalidatePath(`/schadenfaelle/${claimId}`);
    return { ok: true, message: "Als von dir eingereicht vermerkt." };
  });
}

export async function addEvidenceAction(claimId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const d = str(fd, "description");
    if (d.length < 2) return { error: "Bitte beschreibe den Nachweis." };
    await addEvidence(viewer, claimId, d.slice(0, 300), optStr(fd, "documentId"));
    revalidatePath(`/schadenfaelle/${claimId}`);
    return { ok: true, message: "Nachweis hinzugefügt." };
  });
}

export async function setEvidenceStatusAction(evidenceId: string, status: "needed" | "available" | "submitted"): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const claimId = await setEvidenceStatus(viewer, evidenceId, status);
    revalidatePath(`/schadenfaelle/${claimId}`);
  });
}

export async function addCommunicationAction(claimId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const subject = str(fd, "subject");
    const occurredOn = str(fd, "occurredOn");
    if (subject.length < 2) return { error: "Bitte einen Betreff angeben." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Bitte ein Datum angeben." };
    const direction = str(fd, "direction") === "incoming" ? "incoming" : "outgoing";
    await addCommunication(viewer, claimId, { direction, channel: str(fd, "channel") || "letter", subject: subject.slice(0, 200), summary: optStr(fd, "summary"), occurredOn });
    revalidatePath(`/schadenfaelle/${claimId}`);
    return { ok: true, message: "Kommunikation erfasst." };
  });
}

const KINDS: DraftKind[] = ["claim_report", "damage_description", "evidence_list", "cover_letter", "status_inquiry", "evidence_response", "rejection_explanation_request", "objection", "case_summary"];

export async function generateDraftAction(claimId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let draftId: string | null = null;
  const res = await guard(async () => {
    const viewer = await requireViewer();
    const kind = str(fd, "kind") as DraftKind;
    if (!KINDS.includes(kind)) return { error: "Ungültige Dokumentart" };
    draftId = await generateDraft(viewer, claimId, kind, optStr(fd, "policyId"));
  });
  if (res?.error) return res;
  revalidatePath(`/schadenfaelle/${claimId}`);
  redirect(`/schadenfaelle/${claimId}/entwurf/${draftId}`);
}

export async function saveDraftAction(draftId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const claimId = await updateDraft(viewer, draftId, str(fd, "content"));
    if (claimId) revalidatePath(`/schadenfaelle/${claimId}`);
    return { ok: true, message: "Entwurf gespeichert." };
  });
}

export async function deleteClaimAction(claimId: string): Promise<ActionState> {
  const res = await guard(async () => {
    const viewer = await requireViewer();
    await deleteClaim(viewer, claimId);
  });
  if (res?.error) return res;
  revalidatePath("/schadenfaelle");
  redirect("/schadenfaelle");
}
