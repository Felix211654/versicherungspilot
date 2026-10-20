import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { answerQuestion } from "../ai/rag";
import { UserFacingError } from "./documents";
import type { Viewer } from "../auth/session";
import type { StructuredAnswer } from "@/lib/answer-types";

export async function listConversations(householdId: string) {
  return db.select().from(schema.chatConversation).where(eq(schema.chatConversation.householdId, householdId)).orderBy(desc(schema.chatConversation.updatedAt)).limit(50);
}

export async function getConversation(householdId: string, id: string) {
  const [c] = await db.select().from(schema.chatConversation).where(and(eq(schema.chatConversation.id, id), eq(schema.chatConversation.householdId, householdId)));
  if (!c) return null;
  const messages = await db
    .select()
    .from(schema.chatMessage)
    .where(and(eq(schema.chatMessage.conversationId, id), eq(schema.chatMessage.householdId, householdId)))
    .orderBy(asc(schema.chatMessage.createdAt));
  return { conversation: c, messages: messages.map((m) => ({ ...m, answer: m.answer as StructuredAnswer | null })) };
}

/** Stellt eine Frage. Jede Frage wird eigenständig gegen die Unterlagen geprüft (keine ungeprüften Vorannahmen aus dem Verlauf). */
export async function ask(viewer: Viewer, question: string, conversationId?: string | null) {
  const q = question.trim().slice(0, 2000);
  if (q.length < 3) throw new UserFacingError("Bitte stelle eine Frage.");
  let convId = conversationId ?? null;
  if (convId) {
    const [c] = await db.select({ id: schema.chatConversation.id }).from(schema.chatConversation).where(and(eq(schema.chatConversation.id, convId), eq(schema.chatConversation.householdId, viewer.householdId)));
    if (!c) throw new UserFacingError("Unterhaltung nicht gefunden");
  } else {
    const [c] = await db.insert(schema.chatConversation).values({ householdId: viewer.householdId, title: q.slice(0, 80) }).returning({ id: schema.chatConversation.id });
    convId = c.id;
  }
  await db.insert(schema.chatMessage).values({ householdId: viewer.householdId, conversationId: convId, role: "user", content: q });
  const { answer, analysisId } = await answerQuestion(viewer, q);
  await db.insert(schema.chatMessage).values({ householdId: viewer.householdId, conversationId: convId, role: "assistant", content: answer.shortAnswer, answer, analysisId });
  await db.update(schema.chatConversation).set({ updatedAt: new Date() }).where(eq(schema.chatConversation.id, convId));
  return convId;
}

export async function deleteConversation(viewer: Viewer, id: string) {
  await db.delete(schema.chatConversation).where(and(eq(schema.chatConversation.id, id), eq(schema.chatConversation.householdId, viewer.householdId)));
}
