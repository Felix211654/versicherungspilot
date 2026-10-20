import "server-only";
import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import * as z from "zod/v4";
import { db, schema } from "../db";
import { addDays, todayIn } from "@/lib/dates";
import { audit } from "./audit";
import { UserFacingError } from "./documents";
import type { Viewer } from "../auth/session";

export async function listDeadlines(householdId: string, opts: { includeClosed?: boolean; claimId?: string } = {}) {
  const conds = [eq(schema.contractDeadline.householdId, householdId)];
  if (!opts.includeClosed) conds.push(inArray(schema.contractDeadline.status, ["needs_confirmation", "open"]));
  if (opts.claimId) conds.push(eq(schema.contractDeadline.claimId, opts.claimId));
  return db
    .select({
      deadline: schema.contractDeadline,
      policyName: schema.insurancePolicy.name,
      documentTitle: schema.policyDocument.title,
    })
    .from(schema.contractDeadline)
    .leftJoin(schema.insurancePolicy, eq(schema.insurancePolicy.id, schema.contractDeadline.policyId))
    .leftJoin(schema.policyDocument, eq(schema.policyDocument.id, schema.contractDeadline.sourceDocumentId))
    .where(and(...conds))
    .orderBy(asc(schema.contractDeadline.dueDate));
}

export async function getDeadline(householdId: string, id: string) {
  const [row] = await db
    .select({ deadline: schema.contractDeadline, policyName: schema.insurancePolicy.name, documentTitle: schema.policyDocument.title })
    .from(schema.contractDeadline)
    .leftJoin(schema.insurancePolicy, eq(schema.insurancePolicy.id, schema.contractDeadline.policyId))
    .leftJoin(schema.policyDocument, eq(schema.policyDocument.id, schema.contractDeadline.sourceDocumentId))
    .where(and(eq(schema.contractDeadline.id, id), eq(schema.contractDeadline.householdId, householdId)));
  if (!row) return null;
  const reminders = await db.select().from(schema.reminder).where(and(eq(schema.reminder.deadlineId, id), eq(schema.reminder.householdId, householdId))).orderBy(asc(schema.reminder.remindOn));
  const tasks = await db.select().from(schema.task).where(and(eq(schema.task.deadlineId, id), eq(schema.task.householdId, householdId)));
  return { ...row, reminders, tasks };
}

export const DeadlineInput = z.object({
  title: z.string().trim().min(2).max(200),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(schema.deadlineKind.enumValues).default("custom"),
  description: z.string().trim().max(2000).nullable().optional(),
  policyId: z.string().nullable().optional(),
  claimId: z.string().nullable().optional(),
});

export async function createDeadline(viewer: Viewer, input: z.infer<typeof DeadlineInput>) {
  if (input.policyId) {
    const [p] = await db.select({ id: schema.insurancePolicy.id }).from(schema.insurancePolicy).where(and(eq(schema.insurancePolicy.id, input.policyId), eq(schema.insurancePolicy.householdId, viewer.householdId)));
    if (!p) throw new UserFacingError("Vertrag nicht gefunden");
  }
  if (input.claimId) {
    const [c] = await db.select({ id: schema.claim.id }).from(schema.claim).where(and(eq(schema.claim.id, input.claimId), eq(schema.claim.householdId, viewer.householdId)));
    if (!c) throw new UserFacingError("Schadenfall nicht gefunden");
  }
  const [d] = await db
    .insert(schema.contractDeadline)
    .values({
      householdId: viewer.householdId,
      title: input.title,
      dueDate: input.dueDate,
      kind: input.kind,
      description: input.description ?? null,
      policyId: input.policyId ?? null,
      claimId: input.claimId ?? null,
      certainty: "confirmed",
      status: "open",
      basis: "Vom Nutzer angelegt",
    })
    .returning({ id: schema.contractDeadline.id });
  await syncReminders(viewer.householdId);
  return d.id;
}

/** Bestätigt eine (ggf. korrigierte) Frist: erst dann werden Erinnerungen geplant. */
export async function confirmDeadline(viewer: Viewer, id: string, dueDate?: string) {
  const res = await db
    .update(schema.contractDeadline)
    .set({ status: "open", certainty: "confirmed", ...(dueDate ? { dueDate } : {}) })
    .where(and(eq(schema.contractDeadline.id, id), eq(schema.contractDeadline.householdId, viewer.householdId)))
    .returning({ id: schema.contractDeadline.id });
  if (!res.length) throw new UserFacingError("Frist nicht gefunden");
  await syncReminders(viewer.householdId);
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "deadline.confirmed", entityType: "deadline", entityId: id });
}

export async function setDeadlineStatus(viewer: Viewer, id: string, status: "done" | "dismissed" | "open") {
  const res = await db
    .update(schema.contractDeadline)
    .set({ status })
    .where(and(eq(schema.contractDeadline.id, id), eq(schema.contractDeadline.householdId, viewer.householdId)))
    .returning({ id: schema.contractDeadline.id });
  if (!res.length) throw new UserFacingError("Frist nicht gefunden");
  if (status !== "open") await db.delete(schema.reminder).where(and(eq(schema.reminder.deadlineId, id), isNull(schema.reminder.sentAt)));
}

/**
 * Plant Erinnerungen (z. B. 30/14/7 Tage vorher) – ausschließlich für BESTÄTIGTE, offene Fristen.
 * Erinnerungen werden serverseitig vom täglichen Hintergrundjob ausgelöst.
 */
export async function syncReminders(householdId: string) {
  const [s] = await db
    .select({ offsets: schema.userSettings.reminderOffsetsDays, tz: schema.userSettings.timezone })
    .from(schema.userSettings)
    .innerJoin(schema.householdMember, eq(schema.householdMember.userId, schema.userSettings.userId))
    .where(eq(schema.householdMember.householdId, householdId))
    .limit(1);
  const offsets = s?.offsets?.length ? s.offsets : [30, 14, 7];
  const today = todayIn(s?.tz ?? "Europe/Berlin");
  const open = await db
    .select({ id: schema.contractDeadline.id, dueDate: schema.contractDeadline.dueDate })
    .from(schema.contractDeadline)
    .where(and(eq(schema.contractDeadline.householdId, householdId), eq(schema.contractDeadline.status, "open")));
  for (const d of open) {
    // Ungesendete Erinnerungen neu planen (Datum kann sich geändert haben)
    await db.delete(schema.reminder).where(and(eq(schema.reminder.deadlineId, d.id), isNull(schema.reminder.sentAt)));
    const rows = offsets
      .map((o) => ({ householdId, deadlineId: d.id, offsetDays: o, remindOn: addDays(d.dueDate, -o) }))
      .filter((r) => r.remindOn >= today);
    if (rows.length) await db.insert(schema.reminder).values(rows).onConflictDoNothing();
  }
}

/** Täglicher Job: fällige Erinnerungen als Benachrichtigung zustellen. */
export async function runDueReminders(today = todayIn("Europe/Berlin")) {
  const due = await db
    .select({ reminder: schema.reminder, deadline: schema.contractDeadline })
    .from(schema.reminder)
    .innerJoin(schema.contractDeadline, eq(schema.contractDeadline.id, schema.reminder.deadlineId))
    .where(and(lte(schema.reminder.remindOn, today), isNull(schema.reminder.sentAt), eq(schema.contractDeadline.status, "open")));
  for (const { reminder, deadline } of due) {
    await db.transaction(async (tx) => {
      const upd = await tx
        .update(schema.reminder)
        .set({ sentAt: new Date() })
        .where(and(eq(schema.reminder.id, reminder.id), isNull(schema.reminder.sentAt)))
        .returning({ id: schema.reminder.id });
      if (!upd.length) return; // bereits von paralleler Ausführung versendet
      await tx.insert(schema.notification).values({
        householdId: reminder.householdId,
        title: `Erinnerung: ${deadline.title}`,
        body: `Fällig am ${deadline.dueDate.split("-").reverse().join(".")} (in ${reminder.offsetDays} Tagen).`,
        href: `/fristen/${deadline.id}`,
      });
    });
  }
  return due.length;
}

export async function listTasks(householdId: string, opts: { claimId?: string; includeDone?: boolean } = {}) {
  const conds = [eq(schema.task.householdId, householdId)];
  if (!opts.includeDone) conds.push(eq(schema.task.status, "open"));
  if (opts.claimId) conds.push(eq(schema.task.claimId, opts.claimId));
  return db
    .select()
    .from(schema.task)
    .where(and(...conds))
    .orderBy(sql`CASE ${schema.task.priority} WHEN 'urgent' THEN 0 WHEN 'soon' THEN 1 ELSE 2 END`, asc(schema.task.sortOrder), asc(schema.task.dueDate), asc(schema.task.createdAt));
}

export async function setTaskStatus(viewer: Viewer, id: string, status: "open" | "done" | "dismissed") {
  const res = await db
    .update(schema.task)
    .set({ status })
    .where(and(eq(schema.task.id, id), eq(schema.task.householdId, viewer.householdId)))
    .returning({ claimId: schema.task.claimId });
  if (!res.length) throw new UserFacingError("Aufgabe nicht gefunden");
  return res[0];
}

export async function createTask(viewer: Viewer, input: { title: string; description?: string | null; priority: "urgent" | "soon" | "info"; dueDate?: string | null; claimId?: string | null }) {
  if (input.claimId) {
    const [c] = await db.select({ id: schema.claim.id }).from(schema.claim).where(and(eq(schema.claim.id, input.claimId), eq(schema.claim.householdId, viewer.householdId)));
    if (!c) throw new UserFacingError("Schadenfall nicht gefunden");
  }
  await db.insert(schema.task).values({ householdId: viewer.householdId, title: input.title, description: input.description ?? null, priority: input.priority, dueDate: input.dueDate ?? null, claimId: input.claimId ?? null, source: "user" });
}
