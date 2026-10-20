import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Einfaches Fixed-Window-Rate-Limit in PostgreSQL (funktioniert auch mit mehreren App-Instanzen).
 * Nutzt dieselbe Tabelle wie Better Auth, mit eigenem Schlüssel-Präfix.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  const now = Date.now();
  const res = await db.execute(sql`
    INSERT INTO rate_limit (id, key, count, last_request)
    VALUES (${crypto.randomUUID()}, ${"app:" + key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit.last_request < ${now - windowSec * 1000} THEN 1 ELSE rate_limit.count + 1 END,
      last_request = CASE WHEN rate_limit.last_request < ${now - windowSec * 1000} THEN ${now} ELSE rate_limit.last_request END
    RETURNING count, last_request
  `);
  const row = res.rows[0] as { count: number; last_request: string | number };
  const ok = Number(row.count) <= max;
  return { ok, retryAfterSec: ok ? 0 : Math.ceil((Number(row.last_request) + windowSec * 1000 - now) / 1000) };
}
