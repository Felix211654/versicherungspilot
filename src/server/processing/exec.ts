import { spawn } from "node:child_process";

/** Führt ein externes Programm ohne Shell aus (keine Injection über Dateinamen). */
export function run(
  cmd: string,
  args: string[],
  opts: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<{ stdout: Buffer; stderr: string }> {
  const { timeoutMs = 120_000, maxBytes = 50 * 1024 * 1024 } = opts;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH, OMP_THREAD_LIMIT: "1" } as unknown as NodeJS.ProcessEnv });
    const out: Buffer[] = [];
    let size = 0;
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${cmd}: Zeitüberschreitung`));
    }, timeoutMs);
    child.stdout.on("data", (d: Buffer) => {
      size += d.length;
      if (size > maxBytes) {
        child.kill("SIGKILL");
        reject(new Error(`${cmd}: Ausgabe zu groß`));
        return;
      }
      out.push(d);
    });
    child.stderr.on("data", (d: Buffer) => {
      if (err.length < 4000) err += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`${cmd} konnte nicht gestartet werden (${(e as NodeJS.ErrnoException).code ?? e.message}). Ist das Programm installiert?`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: Buffer.concat(out), stderr: err });
      else reject(new Error(`${cmd} beendet mit Code ${code}: ${err.slice(0, 300)}`));
    });
  });
}
