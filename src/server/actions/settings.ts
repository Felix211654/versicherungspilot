"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { requireViewer } from "../auth/session";
import { auth } from "../auth/auth";
import { db, schema } from "../db";
import { audit } from "../services/audit";
import { deleteAccount } from "../services/privacy";
import { syncReminders } from "../services/deadlines";
import { guard, str, type ActionState } from "./util";

export async function setAiConsentAction(enabled: boolean): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    await db.update(schema.userSettings).set({ aiProcessingConsentAt: enabled ? new Date() : null }).where(eq(schema.userSettings.userId, viewer.userId));
    await audit({ userId: viewer.userId, householdId: viewer.householdId, action: enabled ? "consent.ai_granted" : "consent.ai_revoked" });
    revalidatePath("/einstellungen");
    return { ok: true, message: enabled ? "Einwilligung erteilt." : "Einwilligung widerrufen. Es werden keine Inhalte mehr an den KI-Anbieter übermittelt." };
  });
}

export async function saveNotificationSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    const offsets = str(fd, "offsets")
      .split(/[,\s]+/)
      .map((x) => Number.parseInt(x, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 365);
    const tz = str(fd, "timezone") || "Europe/Berlin";
    try {
      new Intl.DateTimeFormat("de-DE", { timeZone: tz });
    } catch {
      return { error: "Unbekannte Zeitzone" };
    }
    await db
      .update(schema.userSettings)
      .set({ reminderOffsetsDays: [...new Set(offsets)].sort((a, b) => b - a).slice(0, 6), timezone: tz })
      .where(eq(schema.userSettings.userId, viewer.userId));
    await syncReminders(viewer.householdId);
    revalidatePath("/einstellungen");
    return { ok: true, message: "Einstellungen gespeichert." };
  });
}

export async function completeOnboardingAction(): Promise<ActionState> {
  const viewer = await requireViewer();
  await db.update(schema.userSettings).set({ onboardingCompletedAt: new Date() }).where(eq(schema.userSettings.userId, viewer.userId));
  redirect("/");
}

export async function markNotificationsReadAction(): Promise<ActionState> {
  return guard(async () => {
    const viewer = await requireViewer();
    await db.update(schema.notification).set({ readAt: new Date() }).where(and(eq(schema.notification.householdId, viewer.householdId), isNull(schema.notification.readAt)));
    revalidatePath("/");
  });
}

export async function deleteAccountAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guard(async () => {
    const viewer = await requireViewer();
    if (str(fd, "confirm") !== "LÖSCHEN") return { error: "Bitte gib zur Bestätigung LÖSCHEN ein." };
    // Passwort erneut prüfen (Schutz vor Missbrauch einer offenen Sitzung)
    try {
      await auth.api.verifyPassword({ body: { password: str(fd, "password") }, headers: await headers() });
    } catch {
      return { error: "Das Passwort ist nicht korrekt." };
    }
    await deleteAccount(viewer);
  });
  if (res?.error) return res;
  redirect("/anmelden?konto-geloescht=1");
}
