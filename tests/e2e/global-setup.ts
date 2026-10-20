import { spawn, execSync } from "node:child_process";

/** Startet den Hintergrund-Worker für die E2E-Tests, falls er nicht bereits läuft. */
export default async function globalSetup() {
  const running = execSync("ps aux").toString().includes("scripts/worker.ts");
  if (running) return;
  const child = spawn("npm", ["run", "worker"], { stdio: "ignore", detached: true });
  child.unref();
  return () => {
    try {
      process.kill(-child.pid!);
    } catch {
      /* bereits beendet */
    }
  };
}
