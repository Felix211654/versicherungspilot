/**
 * Führt alle Datenbankmigrationen aus (drizzle/). Aufruf: npm run db:migrate
 * Hinweis: Die Extensions `vector` und `pg_trgm` erfordern ggf. Superuser-Rechte
 * bzw. müssen beim Cloud-Anbieter freigeschaltet sein.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL fehlt");
  const pool = new Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrationen ausgeführt.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
