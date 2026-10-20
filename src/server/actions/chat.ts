"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "../auth/session";
import { ask, deleteConversation } from "../services/chat";
import { rateLimit } from "../lib/rate-limit";
import { guard, optStr, str, type ActionState } from "./util";

export async function askAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let convId: string | null = null;
  const res = await guard(async () => {
    const viewer = await requireViewer();
    const rl = await rateLimit(`ai:${viewer.userId}`, 30, 3600);
    if (!rl.ok) return { error: `Zu viele Anfragen. Bitte in ${Math.ceil(rl.retryAfterSec / 60)} Minuten erneut versuchen.` };
    convId = await ask(viewer, str(fd, "question"), optStr(fd, "conversationId"));
  });
  if (res?.error) return res;
  revalidatePath("/assistent");
  redirect(`/assistent?c=${convId}#ende`);
}

export async function deleteConversationAction(id: string): Promise<ActionState> {
  const res = await guard(async () => {
    const viewer = await requireViewer();
    await deleteConversation(viewer, id);
  });
  if (res?.error) return res;
  redirect("/assistent");
}
