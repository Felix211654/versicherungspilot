import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "../env";

declare global {
  var __vpPool: Pool | undefined;
}

function createPool() {
  return new Pool({ connectionString: env().DATABASE_URL, max: 10 });
}

// In der Entwicklung überlebt der Pool Hot-Reloads.
const pool = globalThis.__vpPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__vpPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema, pool };
