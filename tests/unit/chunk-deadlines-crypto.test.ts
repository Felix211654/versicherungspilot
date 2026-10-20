import { describe, expect, it } from "vitest";
import { chunkPages, isHeading } from "@/server/processing/chunk";
import { deriveContractDeadlines } from "@/server/processing/deadlines";
import { decryptFile, encryptFile, signDownloadToken, verifyDownloadToken } from "@/server/storage/crypto";
import { addMonths, parseGermanDate, todayIn } from "@/lib/dates";
import { annualize, parseGermanAmountToCents } from "@/lib/money";
import { randomBytes } from "node:crypto";

describe("chunkPages", () => {
  it("erkennt Klauselüberschriften und behält Seiten", () => {
    const pages = [
      { pageNo: 1, text: "§ 1 Versicherte Sachen\nVersichert ist der gesamte Hausrat in der Wohnung.\n\n§ 2 Fahrraddiebstahl\nFahrräder sind gegen Diebstahl versichert, wenn sie abgeschlossen waren.", method: "pdf_text" as const },
      { pageNo: 2, text: "§ 3 Ausschlüsse\nNicht versichert sind Schäden durch Krieg.", method: "pdf_text" as const },
    ];
    const chunks = chunkPages(pages);
    expect(chunks.map((c) => c.heading)).toEqual(["§ 1 Versicherte Sachen", "§ 2 Fahrraddiebstahl", "§ 3 Ausschlüsse"]);
    expect(chunks[2]).toMatchObject({ pageStart: 2, pageEnd: 2 });
  });
  it("Überschriften-Heuristik", () => {
    expect(isHeading("A 1.2 Versicherte Gefahren")).toBe(true);
    expect(isHeading("AUSSCHLÜSSE")).toBe(true);
    expect(isHeading("Dies ist ein normaler Satz, der weitergeht.")).toBe(false);
  });
  it("teilt lange Texte", () => {
    const long = Array.from({ length: 200 }, (_, i) => `Satz ${i} mit etwas Inhalt.`).join(" ");
    const chunks = chunkPages([{ pageNo: 1, text: long, method: "ocr" }], { maxChars: 500 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(Math.max(...chunks.map((c) => c.content.length))).toBeLessThanOrEqual(700);
  });
});

describe("Fristableitung", () => {
  it("berechnet Kündigungsfrist mit Berechnungsgrundlage", () => {
    const d = deriveContractDeadlines({ policyId: "p", endDate: "2026-12-31", noticePeriodMonths: 3, renewalPeriodMonths: 12, autoRenews: true, today: "2026-10-20" });
    const c = d.find((x) => x.kind === "cancellation")!;
    expect(c.dueDate).toBe("2026-09-30");
    expect(c.certainty).toBe("derived");
    expect(c.basis).toContain("3 Monat");
  });
  it("rollt vergangene Abläufe nur bei bekannter Verlängerung und markiert als unklar", () => {
    const d = deriveContractDeadlines({ policyId: "p", endDate: "2024-03-01", noticePeriodMonths: 3, renewalPeriodMonths: 12, autoRenews: true, today: "2026-10-20" });
    expect(d.find((x) => x.kind === "renewal")!.dueDate).toBe("2027-03-01");
    expect(d.every((x) => x.certainty === "unclear")).toBe(true);
    expect(deriveContractDeadlines({ policyId: "p", endDate: "2024-03-01", noticePeriodMonths: 3, renewalPeriodMonths: null, autoRenews: null, today: "2026-10-20" })).toHaveLength(0);
  });
});

describe("Datum/Geld", () => {
  it("parst und rechnet", () => {
    expect(parseGermanDate("31.02.2024")).toBeNull();
    expect(parseGermanDate("1.3.25")).toBe("2025-03-01");
    expect(addMonths("2025-05-31", -3)).toBe("2025-02-28");
    expect(parseGermanAmountToCents("1.234,56")).toBe(123456);
    expect(parseGermanAmountToCents("10 Mio.")).toBe(1_000_000_000);
    expect(annualize(1000, "quarterly")).toEqual({ yearlyCents: 4000, monthlyCents: 333 });
    expect(todayIn("Europe/Berlin", new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});

describe("Verschlüsselung", () => {
  const key = randomBytes(32).toString("base64");
  it("verschlüsselt und entschlüsselt (Roundtrip)", () => {
    const data = Buffer.from("Versicherungsschein geheim");
    const { ciphertext, wrappedKey } = encryptFile(key, data);
    expect(ciphertext.includes(data)).toBe(false);
    expect(decryptFile(key, wrappedKey, ciphertext).toString()).toBe("Versicherungsschein geheim");
  });
  it("erkennt Manipulation", () => {
    const { ciphertext, wrappedKey } = encryptFile(key, Buffer.from("abc"));
    ciphertext[ciphertext.length - 1] ^= 1;
    expect(() => decryptFile(key, wrappedKey, ciphertext)).toThrow();
  });
  it("Download-Token: gültig, abgelaufen, manipuliert", () => {
    const s = "x".repeat(40);
    const t = signDownloadToken(s, { v: "v1", h: "h1", exp: 2000, d: "inline" });
    expect(verifyDownloadToken(s, t, 1000)).toMatchObject({ v: "v1", h: "h1" });
    expect(verifyDownloadToken(s, t, 3000)).toBeNull();
    const [p, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ v: "v2", h: "h1", exp: 2000, d: "inline" })).toString("base64url");
    expect(verifyDownloadToken(s, `${forged}.${sig}`, 1000)).toBeNull();
    expect(verifyDownloadToken(s, `${p}.AAAA`, 1000)).toBeNull();
  });
});
