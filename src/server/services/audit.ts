import "server-only";
import { db, schema } from "../db";
import { logger } from "../lib/logger";

/**
 * Protokolliert sicherheits- und datenschutzrelevante Aktionen.
 * Niemals Dokumentinhalte, Vertragsdaten oder Freitexte übergeben – nur IDs/technische Metadaten.
 */
export async function audit(e: {
  userId?: string;
  householdId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  try {
    await db.insert(schema.auditEvent).values({
      userId: e.userId,
      householdId: e.householdId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      metadata: e.metadata,
    });
  } catch (err) {
    logger.error("audit.failed", { action: e.action, error: String(err) });
  }
}
