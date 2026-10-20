"use server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "../auth/session";
import { confirmDeadline, createDeadline, createTask, DeadlineInput, setDeadlineStatus, setTaskStatus } from "../services/deadlines";
import { guard, optStr, str, zodFieldErrors, type ActionState } from "./util";

export async function confirmDeadlineAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const due = optStr(fd, "dueDate");
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Ungültiges Datum" };
    await confirmDeadline(viewer, id, due ?? undefined);
    revalidatePath("/fristen");
    revalidatePath(`/fristen/${id}`);
    return { ok: true, message: "Frist bestätigt – Erinnerungen sind geplant." };
  });
}

export async function deadlineStatusAction(id: string, status: "done" | "dismissed" | "open"): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    await setDeadlineStatus(viewer, id, status);
    revalidatePath("/fristen");
    revalidatePath(`/fristen/${id}`);
    revalidatePath("/");
  });
}

export async function createDeadlineAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const parsed = DeadlineInput.safeParse({ title: str(fd, "title"), dueDate: str(fd, "dueDate"), kind: str(fd, "kind") || "custom", description: optStr(fd, "description"), policyId: optStr(fd, "policyId"), claimId: optStr(fd, "claimId") });
    if (!parsed.success) return { error: "Bitte Titel und Datum angeben.", fieldErrors: zodFieldErrors(parsed.error.issues) };
    await createDeadline(viewer, parsed.data);
    revalidatePath("/fristen");
    if (parsed.data.claimId) revalidatePath(`/schadenfaelle/${parsed.data.claimId}`);
    return { ok: true, message: "Erinnerung angelegt." };
  });
}

export async function taskStatusAction(id: string, status: "open" | "done" | "dismissed"): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const t = await setTaskStatus(viewer, id, status);
    revalidatePath("/fristen");
    revalidatePath("/");
    if (t.claimId) revalidatePath(`/schadenfaelle/${t.claimId}`);
  });
}

export async function createTaskAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const title = str(fd, "title");
    if (title.length < 2) return { error: "Bitte einen Titel angeben." };
    const p = str(fd, "priority");
    const due = optStr(fd, "dueDate");
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Ungültiges Datum" };
    await createTask(viewer, { title: title.slice(0, 200), description: optStr(fd, "description"), priority: p === "urgent" || p === "info" ? p : "soon", dueDate: due, claimId: optStr(fd, "claimId") });
    revalidatePath("/fristen");
    const claimId = optStr(fd, "claimId");
    if (claimId) revalidatePath(`/schadenfaelle/${claimId}`);
    return { ok: true, message: "Aufgabe angelegt." };
  });
}
