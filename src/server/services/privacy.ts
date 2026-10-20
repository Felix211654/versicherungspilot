import "server-only";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import JSZip from "jszip";
import { db, schema } from "../db";
import { deleteBlob, getDecrypted } from "../storage/storage";
import { audit } from "./audit";
import type { Viewer } from "../auth/session";
import { logger, safeErrorMessage } from "../lib/logger";

/** Tabellen mit Haushaltsbezug, die exportiert werden (ohne technische Geheimnisse wie wrappedKey). */
const EXPORT_TABLES = {
  vertraege: schema.insurancePolicy,
  versicherer: schema.insurer,
  versichertePersonen: schema.insuredPerson,
  versicherteObjekte: schema.insuredObject,
  klauseln: schema.policyTerm,
  dokumente: schema.policyDocument,
  extrahierteAngaben: schema.extractedFact,
  fristen: schema.contractDeadline,
  erinnerungen: schema.reminder,
  aufgaben: schema.task,
  schadenfaelle: schema.claim,
  schadenfallVertraege: schema.claimPolicy,
  schadenfallVerlauf: schema.claimEvent,
  nachweise: schema.claimEvidence,
  kommunikation: schema.communication,
  erzeugteDokumente: schema.generatedDocument,
  kiAnalysen: schema.aiAnalysis,
  chatVerlaeufe: schema.chatConversation,
  chatNachrichten: schema.chatMessage,
  benachrichtigungen: schema.notification,
  protokoll: schema.auditEvent,
} as const;

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
}

/**
 * Vollständiger Export (DSGVO Art. 15/20): Originaldateien + strukturierte JSON-Daten + CSV-Übersichten.
 * Jede Abfrage ist auf den Haushalt der Sitzung beschränkt.
 */
export async function buildExport(viewer: Viewer): Promise<Buffer> {
  const zip = new JSZip();
  const data: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(EXPORT_TABLES)) {
    data[name] = await db.select().from(table).where(eq((table as typeof schema.insurancePolicy).householdId, viewer.householdId));
  }
  const versions = await db.select().from(schema.documentVersion).where(eq(schema.documentVersion.householdId, viewer.householdId));
  data.dokumentVersionen = versions.map(({ wrappedKey: _k, storageKey: _s, ...rest }) => {
    void _k;
    void _s;
    return rest;
  });
  const [settings] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, viewer.userId));
  const [u] = await db.select({ id: schema.user.id, name: schema.user.name, email: schema.user.email, createdAt: schema.user.createdAt, twoFactorEnabled: schema.user.twoFactorEnabled }).from(schema.user).where(eq(schema.user.id, viewer.userId));

  const files = zip.folder("originaldateien")!;
  const index: { datei: string; dokumentId: string; version: number; titel: string; sha256: string }[] = [];
  const docTitles = new Map((data.dokumente as { id: string; title: string }[]).map((d) => [d.id, d.title]));
  for (const v of versions) {
    const safeName = `${v.documentId.slice(0, 8)}_v${v.versionNo}_${v.fileName.replace(/[^\w.\-äöüÄÖÜß ]/g, "_")}`;
    try {
      files.file(safeName, await getDecrypted(v.storageKey, v.wrappedKey));
      index.push({ datei: `originaldateien/${safeName}`, dokumentId: v.documentId, version: v.versionNo, titel: docTitles.get(v.documentId) ?? "", sha256: v.sha256 });
    } catch (err) {
      logger.error("export.file_failed", { versionId: v.id, error: safeErrorMessage(err) });
      index.push({ datei: `FEHLER: Datei nicht lesbar (${safeName})`, dokumentId: v.documentId, version: v.versionNo, titel: docTitles.get(v.documentId) ?? "", sha256: v.sha256 });
    }
  }
  const exportedAt = new Date().toISOString();
  zip.file("daten.json", JSON.stringify({ format: "versicherungspilot-export", version: 1, exportiertAm: exportedAt, konto: u, einstellungen: settings, ...data }, null, 2));
  zip.file("dokumentenverzeichnis.csv", csv(index));
  zip.file("vertraege.csv", csv(data.vertraege as Record<string, unknown>[]));
  zip.file("fristen.csv", csv(data.fristen as Record<string, unknown>[]));
  zip.file("schadenfaelle.csv", csv(data.schadenfaelle as Record<string, unknown>[]));
  zip.file(
    "LIESMICH.txt",
    [
      "VersicherungsPilot – Datenexport",
      `Erstellt: ${exportedAt}`,
      "",
      "originaldateien/        Ihre hochgeladenen Dateien (entschlüsselt, Originalinhalt)",
      "daten.json              Alle strukturierten Daten (Verträge, Klauseln mit Quellen, Fristen, Schadenfälle, Entwürfe, Kommunikation, KI-Analysen)",
      "dokumentenverzeichnis.csv Zuordnung Datei ↔ Dokument inkl. SHA-256-Prüfsumme",
      "*.csv                   Übersichten (Semikolon-getrennt, UTF-8)",
      "",
      "Hinweis: Automatisch erkannte Angaben enthalten ihren Prüfstatus (auto/confirmed/corrected/unclear/rejected).",
    ].join("\n"),
  );
  await audit({ userId: viewer.userId, householdId: viewer.householdId, action: "privacy.export", metadata: { files: versions.length } });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Kontolöschung (DSGVO Art. 17). Reihenfolge:
 * 1. Dateien im Objektspeicher löschen (Originale aller Versionen)
 * 2. Haushalt löschen → kaskadiert: Verträge, Dokumente, Seiten, Chunks inkl. Embeddings,
 *    Fakten, Klauseln, Fristen, Erinnerungen, Aufgaben, Schadenfälle, Entwürfe, KI-Analysen, Chat, Benachrichtigungen
 * 3. Ausstehende Hintergrundjobs des Haushalts entfernen
 * 4. Protokolleinträge des Haushalts löschen
 * 5. Nutzer löschen → kaskadiert: Sitzungen, Konten, 2FA, Einstellungen
 * 6. Löschnachweis ohne Personenbezug (Hash) speichern
 * Backups: siehe docs/BETRIEB.md (Aufbewahrung und Überschreibung).
 */
export async function deleteAccount(viewer: Viewer) {
  const requestedAt = new Date();
  const versions = await db
    .select({ storageKey: schema.documentVersion.storageKey })
    .from(schema.documentVersion)
    .where(eq(schema.documentVersion.householdId, viewer.householdId));
  let fileErrors = 0;
  for (const v of versions) {
    try {
      await deleteBlob(v.storageKey);
    } catch (err) {
      fileErrors++;
      logger.error("delete.blob_failed", { error: safeErrorMessage(err) });
    }
  }
  if (fileErrors) throw new Error(`${fileErrors} Datei(en) konnten nicht gelöscht werden. Die Löschung wurde abgebrochen und kann erneut gestartet werden.`);
  const members = await db.select().from(schema.householdMember).where(eq(schema.householdMember.householdId, viewer.householdId));
  const soleMember = members.length <= 1;
  if (soleMember) {
    await db.delete(schema.household).where(eq(schema.household.id, viewer.householdId));
    try {
      await db.execute(sql`DELETE FROM pgboss.job WHERE data->>'householdId' = ${viewer.householdId}`);
    } catch {
      /* pg-boss-Schema evtl. noch nicht vorhanden */
    }
    await db.delete(schema.auditEvent).where(eq(schema.auditEvent.householdId, viewer.householdId));
  }
  await db.delete(schema.auditEvent).where(and(eq(schema.auditEvent.userId, viewer.userId)));
  await db.delete(schema.user).where(eq(schema.user.id, viewer.userId));
  await db.insert(schema.deletionRecord).values({
    subjectHash: createHash("sha256").update(`vp-deletion:${viewer.userId}`).digest("hex"),
    requestedAt,
    completedAt: new Date(),
    details: { files: versions.length, householdDeleted: soleMember },
  });
}
