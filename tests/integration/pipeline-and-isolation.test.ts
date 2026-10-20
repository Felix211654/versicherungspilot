import { beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("@/server/jobs/queue", () => ({ enqueueDocumentProcessing: vi.fn(async () => "job") }));

import { db, schema } from "@/server/db";
import { createViewer, resetDb, uploadAndProcess } from "./helpers";
import { deleteDocument, getDocument, listDocuments, reprocessDocument, updateDocumentMeta, uploadDocument, UserFacingError } from "@/server/services/documents";
import { searchChunks } from "@/server/services/search";
import { createPolicy, getPolicy, suggestPolicyFromDocument } from "@/server/services/policies";
import { confirmDeadline, listDeadlines } from "@/server/services/deadlines";
import { processDocumentVersion } from "@/server/processing/pipeline";
import type { Viewer } from "@/server/auth/session";

let a: Viewer;
let b: Viewer;
let policeId: string;
let avbId: string;

beforeAll(async () => {
  await resetDb();
  a = await createViewer("Anna A");
  b = await createViewer("Bernd B");
  policeId = (await uploadAndProcess(a, "hausrat-police.pdf")).documentId;
  avbId = (await uploadAndProcess(a, "hausrat-avb.pdf")).documentId;
});

describe("Test 1/2 – Import, Verarbeitung, Vertragsdaten", () => {
  it("verarbeitet PDF: Seiten, Chunks, Status 'Bitte Angaben prüfen'", async () => {
    const d = await getDocument(a.householdId, avbId);
    expect(d?.current?.status).toBe("needs_review");
    expect(d?.pages.length).toBe(2);
    expect(d?.doc.docType).toBe("avb");
  });

  it("erkennt Vertragsdaten mit Fundstelle und schlägt einen Vertrag vor", async () => {
    const s = await suggestPolicyFromDocument(a.householdId, policeId);
    expect(s).toMatchObject({ insurerName: "Allianz", category: "hausrat", policyNumber: "HR-4711-2024", startDate: "2024-01-01", endDate: "2027-01-01", premiumCents: 14280, paymentInterval: "annual", noticePeriodMonths: 3 });
    expect(s.sources.insurerName.page).toBe(1);
  });

  it("legt Vertrag aus Dokument an; Korrekturen werden als 'corrected' gespeichert", async () => {
    const s = await suggestPolicyFromDocument(a.householdId, policeId);
    const id = await createPolicy(
      a,
      { name: "Hausrat Allianz", category: "hausrat", insurerName: "Allianz AG", policyNumber: s.policyNumber, status: "active", startDate: s.startDate, endDate: s.endDate, autoRenews: true, renewalPeriodMonths: 12, noticePeriodMonths: 3, premiumCents: s.premiumCents, paymentInterval: "annual" },
      policeId,
    );
    const facts = await db.select().from(schema.extractedFact).where(eq(schema.extractedFact.documentId, policeId));
    expect(facts.find((f) => f.field === "insurer_name")?.review).toBe("corrected");
    expect(facts.find((f) => f.field === "policy_number")?.review).toBe("confirmed");
    const p = await getPolicy(a.householdId, id);
    expect(p?.terms.some((t) => t.term.kind === "deductible" && t.term.amountCents === 15000 && t.term.sourcePage === 1)).toBe(true);
    // AVB nachträglich per Vertragsnummer? Nein – AVB enthält keine Nummer: bleibt unzugeordnet
    expect((await getDocument(a.householdId, avbId))?.doc.policyId).toBeNull();
  });

  it("ordnet ein später hochgeladenes Dokument per Vertragsnummer automatisch (als Vorschlag) zu", async () => {
    const r = await uploadAndProcess(a, "hausrat-nachtrag.pdf");
    const d = await getDocument(a.householdId, r.documentId);
    expect(d?.doc.assignment).toBe("suggested");
    expect(d?.doc.docType).toBe("nachtrag");
  });
});

describe("Test 3 – Suche mit korrekter Seitenreferenz", () => {
  it("findet die Fahrrad-Klausel auf Seite 2 unter der richtigen Überschrift", async () => {
    const { hits, mode } = await searchChunks(a.householdId, "Mein Fahrrad wurde gestohlen");
    expect(mode).toBe("fulltext");
    const hit = hits.find((h) => h.heading?.includes("Fahrraddiebstahl"));
    expect(hit).toBeDefined();
    expect(hit!.pageStart).toBe(2);
    expect(hit!.documentId).toBe(avbId);
  });
});

describe("Test 7 – Fristen mit Quelle und Bestätigung", () => {
  it("leitet Kündigungsfrist ab (Bestätigung erforderlich) und plant Erinnerungen erst nach Bestätigung", async () => {
    const list = await listDeadlines(a.householdId);
    const c = list.find((x) => x.deadline.kind === "cancellation")!;
    expect(c.deadline.dueDate).toBe("2026-10-01");
    expect(c.deadline.status).toBe("needs_confirmation");
    expect(c.deadline.basis).toContain("Kündigungsfrist von 3 Monat");
    let reminders = await db.select().from(schema.reminder).where(eq(schema.reminder.deadlineId, c.deadline.id));
    expect(reminders).toHaveLength(0);
    await confirmDeadline(a, c.deadline.id, "2026-12-01");
    reminders = await db.select().from(schema.reminder).where(eq(schema.reminder.deadlineId, c.deadline.id));
    expect(reminders.map((r) => r.offsetDays).sort()).toEqual([14, 30, 7]);
  });

  it("erkennt Frist aus Versichererschreiben als unklar mit Fundstelle", async () => {
    const r = await uploadAndProcess(a, "schreiben-nachweise.pdf");
    const list = await listDeadlines(a.householdId);
    const d = list.find((x) => x.deadline.sourceDocumentId === r.documentId)!;
    expect(d.deadline).toMatchObject({ dueDate: "2026-11-15", certainty: "unclear", status: "needs_confirmation", sourcePage: 1 });
    expect(d.deadline.sourceSnippet).toContain("15.11.2026");
  });
});

describe("Test 8 – Mandantentrennung", () => {
  it("Nutzer B sieht keine Dokumente, Verträge oder Suchtreffer von A", async () => {
    expect(await getDocument(b.householdId, avbId)).toBeNull();
    expect(await listDocuments(b.householdId)).toHaveLength(0);
    const pol = await db.select().from(schema.insurancePolicy).where(eq(schema.insurancePolicy.householdId, a.householdId));
    expect(await getPolicy(b.householdId, pol[0].id)).toBeNull();
    expect((await searchChunks(b.householdId, "Fahrrad Diebstahl")).hits).toHaveLength(0);
    expect((await searchChunks(b.householdId, "Fahrrad", { policyIds: [pol[0].id] })).hits).toHaveLength(0);
  });
  it("Nutzer B kann Dokumente von A weder ändern noch löschen oder neu verarbeiten", async () => {
    await expect(updateDocumentMeta(b, avbId, { title: "gehackt" })).rejects.toBeInstanceOf(UserFacingError);
    await expect(deleteDocument(b, avbId)).rejects.toBeInstanceOf(UserFacingError);
    await expect(reprocessDocument(b, avbId)).rejects.toBeInstanceOf(UserFacingError);
    await expect(uploadDocument(b, { name: "x.pdf", data: Buffer.from("%PDF-1.4 x") }, { replaceDocumentId: avbId })).rejects.toBeInstanceOf(UserFacingError);
    const [d] = await db.select().from(schema.policyDocument).where(eq(schema.policyDocument.id, avbId));
    expect(d.title).not.toBe("gehackt");
  });
  it("Pipeline verarbeitet keine Version mit falschem Haushalt", async () => {
    const [v] = await db.select().from(schema.documentVersion).where(eq(schema.documentVersion.documentId, avbId));
    await expect(processDocumentVersion(v.id, b.householdId)).rejects.toThrow();
  });
});

describe("Test 11 – Fehlerbehandlung", () => {
  it("unleserliche Datei → 'fehlgeschlagen' mit Begründung; Neustart möglich", async () => {
    const { PNG } = await import("./png");
    const r = await uploadDocument(a, { name: "leer.png", data: PNG.blank(200, 200) });
    if (!r.ok) throw new Error(r.error);
    await processDocumentVersion(r.versionId, a.householdId);
    const d = await getDocument(a.householdId, r.documentId);
    expect(d?.current?.status).toBe("failed");
    expect(d?.current?.error).toContain("kein lesbarer Text");
    await reprocessDocument(a, r.documentId);
    const [v] = await db.select().from(schema.documentVersion).where(and(eq(schema.documentVersion.id, r.versionId)));
    expect(v.status).toBe("uploaded");
  });
  it("lehnt nicht unterstützte und duplizierte Dateien ab", async () => {
    const bad = await uploadDocument(a, { name: "x.exe", data: Buffer.from("MZ\x90\x00binary") });
    expect(bad.ok).toBe(false);
    const { readFile } = await import("node:fs/promises");
    const dup = await uploadDocument(a, { name: "nochmal.pdf", data: await readFile("tests/fixtures/hausrat-avb.pdf") });
    expect(dup).toMatchObject({ ok: false, duplicateOf: avbId });
  });
});
