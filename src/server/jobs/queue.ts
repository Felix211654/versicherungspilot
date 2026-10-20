import { PgBoss } from "pg-boss";

/**
 * Hintergrundjobs über pg-boss (PostgreSQL-basiert, keine zusätzliche Infrastruktur).
 * - Wiederholung mit Backoff bei vorübergehenden Fehlern
 * - singletonKey verhindert doppelte Verarbeitung derselben Dokumentversion
 * Der Web-Prozess sendet nur Jobs; der Worker (scripts/worker.ts) verarbeitet sie.
 */
export const QUEUES = {
  processDocument: "document-process",
  reminders: "reminders-daily",
} as const;

export type ProcessDocumentJob = { versionId: string; householdId: string };

declare global {
  var __vpBoss: Promise<PgBoss> | undefined;
}

async function init(role: "sender" | "worker"): Promise<PgBoss> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL fehlt");
  const boss = new PgBoss({
    connectionString: url,
    max: role === "worker" ? 5 : 2,
    schedule: role === "worker",
    supervise: role === "worker",
  });
  boss.on("error", (err) => console.error(JSON.stringify({ level: "error", msg: "pgboss.error", error: String(err) })));
  await boss.start();
  await ensureQueues(boss);
  return boss;
}

export async function ensureQueues(boss: PgBoss) {
  const existing = new Set((await boss.getQueues()).map((q) => q.name));
  if (!existing.has(QUEUES.processDocument)) {
    await boss.createQueue(QUEUES.processDocument, {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 60 * 15,
    });
  }
  if (!existing.has(QUEUES.reminders)) {
    await boss.createQueue(QUEUES.reminders, { retryLimit: 2, retryDelay: 300 });
  }
}

/** Sender-Instanz für den Web-Prozess (lazy, einmal pro Prozess). */
export function getBoss(): Promise<PgBoss> {
  if (!globalThis.__vpBoss) {
    globalThis.__vpBoss = init("sender").catch((err) => {
      globalThis.__vpBoss = undefined;
      throw err;
    });
  }
  return globalThis.__vpBoss;
}

export function startWorkerBoss(): Promise<PgBoss> {
  return init("worker");
}

export async function enqueueDocumentProcessing(job: ProcessDocumentJob) {
  const boss = await getBoss();
  return boss.send(QUEUES.processDocument, job, { singletonKey: job.versionId });
}
