import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import JSZip from "jszip";

vi.mock("@/server/jobs/queue", () => ({ enqueueDocumentProcessing: vi.fn(async () => "job") }));
const viewerRef: { current: unknown } = { current: null };
vi.mock("@/server/auth/session", async (orig) => ({ ...(await orig<object>()), getViewer: async () => viewerRef.current }));

import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { createViewer, resetDb, uploadAndProcess } from "./helpers";
import { createPolicy } from "@/server/services/policies";
import { assignDocument, downloadUrl } from "@/server/services/documents";
import { createClaim, generateDraft, getClaim, getDraft, markSubmittedByUser, runCoverageCheck } from "@/server/services/claims";
import { buildExport, deleteAccount } from "@/server/services/privacy";
import { GET as fileRoute } from "@/app/api/files/[token]/route";
import type { Viewer } from "@/server/auth/session";

let a: Viewer;
let b: Viewer;
let claimId: string;
let docId: string;

beforeAll(async () => {
  await resetDb();
  a = await createViewer("Anna A");
  b = await createViewer("Bernd B");
  const hausrat = await createPolicy(a, { name: "Hausrat Allianz", category: "hausrat", insurerName: "Allianz", policyNumber: "HR-4711-2024", status: "active" });
  await createPolicy(a, { name: "PHV", category: "privathaftpflicht", status: "active" });
  const d = await uploadAndProcess(a, "hausrat-avb.pdf");
  docId = d.documentId;
  await assignDocument(a, d.documentId, hausrat);
  await uploadAndProcess(b, "haftpflicht.pdf");
});

describe("Test 5 – Fallprüfung (ohne KI: Vorauswahl ohne Bewertung)", () => {
  it("legt Fall an, erkennt fehlende Angaben, gleicht mehrere Verträge ab", async () => {
    claimId = await createClaim(a, { title: "Fahrrad gestohlen", description: "Mein Fahrrad wurde aus dem Gemeinschaftskeller gestohlen. Es war abgeschlossen.", acuteDanger: false, location: "Keller" });
    let c = await getClaim(a.householdId, claimId);
    expect(c!.claim.status).toBe("facts_incomplete");
    expect(c!.missing).toEqual(expect.arrayContaining(["Wann ist der Schaden passiert?", "Wie hoch ist der geschätzte Schaden?"]));
    const answer = await runCoverageCheck(a, claimId);
    expect(answer.mode).toBe("retrieval_only");
    c = await getClaim(a.householdId, claimId);
    expect(c!.policies.map((p) => p.policyName)).toContain("Hausrat Allianz");
    expect(c!.policies.every((p) => p.cp.assessment === "unclear")).toBe(true); // keine Bewertung ohne KI
    expect(c!.tasks.some((t) => t.title.includes("dokumentieren"))).toBe(true);
    expect(answer.sources.some((s) => s.heading?.includes("Fahrraddiebstahl"))).toBe(true);
  });
});

describe("Test 6 – Anspruchsvorbereitung", () => {
  it("erstellt Schadenmeldung aus bekannten Tatsachen und markiert Fehlendes", async () => {
    const id = await generateDraft(a, claimId, "claim_report");
    const d = await getDraft(a.householdId, id);
    expect(d!.content).toContain("Mein Fahrrad wurde aus dem Gemeinschaftskeller gestohlen.");
    expect(d!.content).toContain("HR-4711-2024");
    expect(d!.content).toContain("[OFFEN: Datum (und ggf. Uhrzeit) des Schadens]");
    expect(d!.openPoints).toEqual(expect.arrayContaining(["geschätzte Schadenhöhe"]));
    expect(d!.content).not.toMatch(/\d+,\d{2} €/); // keine erfundene Schadenhöhe
    const c = await getClaim(a.householdId, claimId);
    expect(c!.claim.status).toBe("report_prepared"); // NICHT "eingereicht"
    expect(c!.events.some((e) => e.message.includes("nicht versendet"))).toBe(true);
    await markSubmittedByUser(a, claimId, { occurredOn: "2026-10-20", channel: "email" });
    expect((await getClaim(a.householdId, claimId))!.claim.status).toBe("submitted_by_user");
  });
  it("fremde Nutzer erhalten keinen Zugriff auf Fälle/Entwürfe", async () => {
    expect(await getClaim(b.householdId, claimId)).toBeNull();
    await expect(generateDraft(b, claimId, "claim_report")).rejects.toThrow();
  });
});

describe("Test 8 – Download-Route", () => {
  it("liefert Datei nur an den eigenen Haushalt mit gültigem Token", async () => {
    const [v] = await db.select().from(schema.documentVersion).where(eq(schema.documentVersion.documentId, docId));
    const url = downloadUrl(a.householdId, v.id, "inline");
    const token = url.split("/").pop()!;
    const call = () => fileRoute(new Request("http://x") as never, { params: Promise.resolve({ token }) });
    viewerRef.current = a;
    const ok = await call();
    expect(ok.status).toBe(200);
    expect(Buffer.from(await ok.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    viewerRef.current = b;
    expect((await call()).status).toBe(403);
    viewerRef.current = null;
    expect((await call()).status).toBe(403);
    viewerRef.current = a;
    const bad = await fileRoute(new Request("http://x") as never, { params: Promise.resolve({ token: token.slice(0, -2) + "xx" }) });
    expect(bad.status).toBe(403);
  });
  it("gespeicherte Datei ist verschlüsselt", async () => {
    const [v] = await db.select().from(schema.documentVersion).where(eq(schema.documentVersion.documentId, docId));
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path.join(env().STORAGE_LOCAL_DIR, v.storageKey));
    expect(raw.subarray(0, 5).toString()).not.toBe("%PDF-");
    expect(raw.includes(Buffer.from("Fahrraddiebstahl"))).toBe(false);
  });
});

describe("Test 9 – Export", () => {
  it("enthält Originale und strukturierte Daten, aber keine fremden Daten", async () => {
    const zip = await JSZip.loadAsync(await buildExport(a));
    const files = Object.keys(zip.files);
    expect(files.some((f) => f.startsWith("originaldateien/") && f.endsWith("hausrat-avb.pdf"))).toBe(true);
    const data = JSON.parse(await zip.file("daten.json")!.async("string"));
    expect(data.vertraege.map((p: { name: string }) => p.name).sort()).toEqual(["Hausrat Allianz", "PHV"]);
    expect(data.schadenfaelle).toHaveLength(1);
    expect(data.erzeugteDokumente.length).toBeGreaterThan(0);
    expect(data.extrahierteAngaben.every((f: { householdId: string }) => f.householdId === a.householdId)).toBe(true);
    expect(JSON.stringify(data)).not.toContain(b.householdId);
    expect(JSON.stringify(data)).not.toContain("wrappedKey");
    expect(files).toContain("vertraege.csv");
  });
});

describe("Test 10 – Kontolöschung", () => {
  it("löscht Dateien und alle abgeleiteten Daten, lässt andere Nutzer unberührt", async () => {
    const versions = await db.select().from(schema.documentVersion).where(eq(schema.documentVersion.householdId, a.householdId));
    await deleteAccount(a);
    for (const v of versions) expect(existsSync(path.join(env().STORAGE_LOCAL_DIR, v.storageKey))).toBe(false);
    const count = async (t: string) => Number((await db.execute(sql.raw(`select count(*)::int n from ${t} where household_id = '${a.householdId}'`))).rows[0].n);
    for (const t of ["policy_document", "document_version", "document_page", "document_chunk", "extracted_fact", "insurance_policy", "policy_term", "claim", "task", "contract_deadline", "generated_document", "ai_analysis", "audit_event"]) expect(await count(t)).toBe(0);
    expect(await db.select().from(schema.user).where(eq(schema.user.id, a.userId))).toHaveLength(0);
    expect(await db.select().from(schema.deletionRecord)).toHaveLength(1);
    // Nutzer B unverändert
    expect((await db.select().from(schema.policyDocument).where(eq(schema.policyDocument.householdId, b.householdId))).length).toBe(1);
  });
});
