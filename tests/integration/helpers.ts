import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { provisionHousehold } from "@/server/services/households";
import { uploadDocument } from "@/server/services/documents";
import { processDocumentVersion } from "@/server/processing/pipeline";
import type { Viewer } from "@/server/auth/session";

export async function resetDb() {
  const tables = ["user", "household", "audit_event", "deletion_record", "rate_limit"];
  await db.execute(sql.raw(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`));
}

export async function createViewer(name: string): Promise<Viewer> {
  const id = crypto.randomUUID();
  await db.insert(schema.user).values({ id, name, email: `${id}@test.local` });
  await provisionHousehold(id, name);
  const [m] = await db.select().from(schema.householdMember).where(sql`${schema.householdMember.userId} = ${id}`);
  return { userId: id, householdId: m.householdId, email: `${id}@test.local`, name, twoFactorEnabled: false };
}

/** Lädt eine Fixture hoch und verarbeitet sie synchron (statt über den Worker). */
export async function uploadAndProcess(v: Viewer, fixture: string, opts: { policyId?: string; claimId?: string } = {}) {
  const data = await readFile(`tests/fixtures/${fixture}`);
  const r = await uploadDocument(v, { name: fixture, data }, opts);
  if (!r.ok) throw new Error(r.error);
  await processDocumentVersion(r.versionId, v.householdId);
  return r;
}
