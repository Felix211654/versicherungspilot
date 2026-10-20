/**
 * Minimaler strukturierter Logger (JSON-Zeilen). Bewusst ohne automatische Objekt-Serialisierung
 * von Requests/Dokumenten, damit keine sensiblen Inhalte in Logs landen.
 */
type Fields = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", msg: string, fields?: Fields) {
  if (process.env.NODE_ENV === "test" && level === "info") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (msg: string, f?: Fields) => write("info", msg, f),
  warn: (msg: string, f?: Fields) => write("warn", msg, f),
  error: (msg: string, f?: Fields) => write("error", msg, f),
};

/** Kürzt Fehlermeldungen und entfernt mögliche Inhalte, bevor sie gespeichert/angezeigt werden. */
export function safeErrorMessage(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return m.slice(0, 300);
}
