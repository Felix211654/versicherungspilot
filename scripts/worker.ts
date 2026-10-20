/**
 * Hintergrund-Worker: Dokumentverarbeitung (OCR, Extraktion, Index) und tägliche Erinnerungen.
 * Start: npm run worker   (läuft getrennt vom Web-Prozess)
 */
import "dotenv/config";
import { QUEUES, startWorkerBoss, type ProcessDocumentJob } from "../src/server/jobs/queue";
import { processDocumentVersion } from "../src/server/processing/pipeline";
import { runDueReminders } from "../src/server/services/deadlines";
import { logger, safeErrorMessage } from "../src/server/lib/logger";

async function main() {
  const boss = await startWorkerBoss();
  await boss.work<ProcessDocumentJob>(QUEUES.processDocument, { localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) {
      logger.info("job.start", { queue: QUEUES.processDocument, jobId: job.id });
      await processDocumentVersion(job.data.versionId, job.data.householdId);
    }
  });
  await boss.work(QUEUES.reminders, async () => {
    const n = await runDueReminders();
    logger.info("reminders.sent", { count: n });
  });
  // Täglich 06:00 Uhr deutscher Zeit
  await boss.schedule(QUEUES.reminders, "0 6 * * *", null, { tz: "Europe/Berlin" });
  logger.info("worker.started");
  const stop = async () => {
    logger.info("worker.stopping");
    await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((err) => {
  logger.error("worker.crashed", { error: safeErrorMessage(err) });
  process.exit(1);
});
