"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "../auth/session";
import { addInsuredObject, addInsuredPerson, addPolicyTerm, createPolicy, deletePolicy, PolicyInput, reviewPolicyTerm, updatePolicy } from "../services/policies";
import { schema } from "../db";
import { euroToCents, guard, optStr, str, zodFieldErrors, type ActionState } from "./util";

function parsePolicy(fd: FormData) {
  const intOrNull = (k: string) => (str(fd, k) ? Number.parseInt(str(fd, k), 10) : null);
  const auto = str(fd, "autoRenews");
  return PolicyInput.safeParse({
    name: str(fd, "name"),
    category: str(fd, "category"),
    insurerName: optStr(fd, "insurerName"),
    policyNumber: optStr(fd, "policyNumber"),
    broker: optStr(fd, "broker"),
    policyholderName: optStr(fd, "policyholderName"),
    status: str(fd, "status") || "active",
    startDate: optStr(fd, "startDate"),
    endDate: optStr(fd, "endDate"),
    autoRenews: auto === "yes" ? true : auto === "no" ? false : null,
    renewalPeriodMonths: intOrNull("renewalPeriodMonths"),
    noticePeriodMonths: intOrNull("noticePeriodMonths"),
    noticePeriodText: optStr(fd, "noticePeriodText"),
    premiumCents: euroToCents(str(fd, "premium")),
    paymentInterval: optStr(fd, "paymentInterval"),
    notes: optStr(fd, "notes"),
  });
}

export async function savePolicyAction(policyId: string | null, fromDocumentId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = policyId;
  const res = await guard(async () => {
    const viewer = await requireViewer();
    const parsed = parsePolicy(fd);
    if (!parsed.success) return { error: "Bitte prüfe die markierten Felder.", fieldErrors: zodFieldErrors(parsed.error.issues) };
    if (policyId) await updatePolicy(viewer, policyId, parsed.data);
    else id = await createPolicy(viewer, parsed.data, fromDocumentId);
  });
  if (res?.error) return res;
  revalidatePath("/versicherungen");
  redirect(`/versicherungen/${id}?gespeichert=1`);
}

export async function deletePolicyAction(policyId: string): Promise<ActionState> {
  const res = await guard(async () => {
    const viewer = await requireViewer();
    await deletePolicy(viewer, policyId);
  });
  if (res?.error) return res;
  revalidatePath("/versicherungen");
  redirect("/versicherungen");
}

export async function addTermAction(policyId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const kind = str(fd, "kind") as (typeof schema.policyTermKind.enumValues)[number];
    if (!schema.policyTermKind.enumValues.includes(kind)) return { error: "Ungültige Art" };
    const title = str(fd, "title");
    if (title.length < 2) return { error: "Bitte eine Bezeichnung angeben." };
    await addPolicyTerm(viewer, policyId, { kind, title: title.slice(0, 200), description: optStr(fd, "description"), amountCents: euroToCents(str(fd, "amount")) });
    revalidatePath(`/versicherungen/${policyId}`);
    return { ok: true, message: "Eintrag hinzugefügt." };
  });
}

export async function reviewTermAction(termId: string, review: "confirmed" | "rejected"): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const policyId = await reviewPolicyTerm(viewer, termId, review);
    revalidatePath(`/versicherungen/${policyId}`);
  });
}

export async function addPersonAction(policyId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const name = str(fd, "name");
    if (name.length < 2) return { error: "Bitte einen Namen angeben." };
    await addInsuredPerson(viewer, policyId, name.slice(0, 120), optStr(fd, "role"));
    revalidatePath(`/versicherungen/${policyId}`);
    return { ok: true, message: "Person hinzugefügt." };
  });
}

export async function addObjectAction(policyId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const description = str(fd, "description");
    if (description.length < 2) return { error: "Bitte eine Beschreibung angeben." };
    await addInsuredObject(viewer, policyId, { kind: str(fd, "kind") || "Sonstiges", description: description.slice(0, 200), identifier: optStr(fd, "identifier") });
    revalidatePath(`/versicherungen/${policyId}`);
    return { ok: true, message: "Objekt hinzugefügt." };
  });
}
