import "server-only";
import { UserFacingError } from "../services/documents";
import { logger, safeErrorMessage } from "../lib/logger";

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string>; id?: string } | null;

/** Einheitliche Fehlerbehandlung: Nutzerfehler verständlich, technische Fehler ohne Interna. */
export async function guard(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (err) {
    // redirect()/notFound() von Next.js durchreichen
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    if (err instanceof UserFacingError) return { error: err.message };
    logger.error("action.failed", { error: safeErrorMessage(err) });
    return { error: "Die Aktion ist fehlgeschlagen. Bitte versuche es erneut." };
  }
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;

/** "1.234,56" / "1234.56" → Cent */
export function euroToCents(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}
