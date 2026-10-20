import { describe, expect, it } from "vitest";
import { extractFacts } from "@/server/processing/facts";
import { classifyCategory, classifyDocument } from "@/server/processing/classify";

const police = `Allianz Versicherungs-AG
Versicherungsschein Privathaftpflichtversicherung
Versicherungsschein-Nr.: PHV-123.456.789
Versicherungsnehmer: Erika Mustermann

Versicherungsbeginn: 01.03.2024
Ablauf: 01.03.2025
Der Vertrag verlängert sich stillschweigend um ein Jahr, wenn er nicht spätestens drei Monate vor Ablauf gekündigt wird.
Zahlungsweise: jährlich
Jahresbeitrag: 89,90 EUR
Pauschale Deckungssumme 10.000.000 EUR
Selbstbeteiligung je Schadenfall 150,00 EUR`;

describe("extractFacts", () => {
  const pages = [{ pageNo: 1, text: police, method: "pdf_text" as const }];
  const facts = extractFacts(pages, { includeLetterDeadlines: false });
  const get = (f: string) => facts.filter((x) => x.field === f);

  it("findet Versicherer mit Beleg", () => {
    expect(get("insurer_name")[0]).toMatchObject({ valueText: "Allianz", pageNo: 1 });
    expect(get("insurer_name")[0].snippet).toContain("Allianz");
  });
  it("findet Vertragsnummer", () => {
    expect(get("policy_number")[0].valueText).toBe("PHV-123.456.789");
  });
  it("findet Daten im ISO-Format", () => {
    expect(get("start_date")[0].valueText).toBe("2024-03-01");
    expect(get("end_date")[0].valueText).toBe("2025-03-01");
  });
  it("findet Beitrag samt Intervall", () => {
    const p = get("premium")[0];
    expect(p.valueJson).toMatchObject({ cents: 8990, interval: "annual" });
    expect(get("payment_interval")[0].valueText).toBe("annual");
  });
  it("findet Kündigungsfrist und Verlängerung", () => {
    expect(get("notice_period")[0].valueJson).toMatchObject({ amount: 3, unit: "months" });
    expect(get("auto_renewal")[0].valueJson).toMatchObject({ months: 12 });
  });
  it("findet Deckungssumme und Selbstbeteiligung", () => {
    expect(get("sum_insured")[0].valueJson).toMatchObject({ cents: 1_000_000_000 });
    expect(get("deductible")[0].valueJson).toMatchObject({ cents: 15000 });
  });
  it("erfindet keine Werte, die nicht im Text stehen", () => {
    expect(get("waiting_period")).toHaveLength(0);
    for (const f of facts) expect(police.replace(/\s+/g, " ")).toContain(f.snippet.slice(0, 20));
  });
  it("markiert widersprüchliche Werte als unsicher", () => {
    const f2 = extractFacts(
      [
        { pageNo: 1, text: "Versicherungsbeginn: 01.01.2024", method: "pdf_text" },
        { pageNo: 2, text: "Versicherungsbeginn: 01.02.2024", method: "pdf_text" },
      ],
      { includeLetterDeadlines: false },
    ).filter((f) => f.field === "start_date");
    expect(f2).toHaveLength(2);
    expect(f2.every((f) => f.confidence === "low")).toBe(true);
  });
});

describe("classify", () => {
  it("erkennt Versicherungsschein und Sparte", () => {
    const pages = [{ pageNo: 1, text: police, method: "pdf_text" as const }];
    expect(classifyDocument(pages, "police.pdf").value).toBe("versicherungsschein");
    expect(classifyCategory(pages, "police.pdf").value).toBe("privathaftpflicht");
  });
  it("erkennt AVB", () => {
    const text = "Allgemeine Versicherungsbedingungen für die Hausratversicherung (VHB 2022)\n§ 1 Versicherte Gefahren\n§ 2 Ausschlüsse\n§ 3 Obliegenheiten";
    const pages = [{ pageNo: 1, text, method: "pdf_text" as const }];
    expect(classifyDocument(pages, "bedingungen.pdf").value).toBe("avb");
    expect(classifyCategory(pages, "x.pdf").value).toBe("hausrat");
  });
  it("gibt bei fehlenden Signalen 'sonstiges' mit niedriger Qualität zurück", () => {
    const r = classifyDocument([{ pageNo: 1, text: "Einkaufsliste Milch Brot", method: "pdf_text" }], "a.pdf");
    expect(r).toMatchObject({ value: "sonstiges", confidence: "low" });
  });
});

describe("Regressionen", () => {
  it("liest Entschädigungsgrenzen nicht als Versicherungssumme", () => {
    const f = extractFacts(
      [{ pageNo: 2, text: "Die Entschädigung ist auf 1 Prozent der Versicherungssumme begrenzt, höchstens jedoch auf 1.000 EUR.", method: "pdf_text" }],
      { includeLetterDeadlines: false },
    );
    expect(f.filter((x) => x.field === "sum_insured")).toHaveLength(0);
  });
  it("erkennt AVB auch bei Spartenbezeichnung im Titel und Versicherungsschein-Erwähnung im Text", () => {
    const pages = [
      { pageNo: 1, text: "Allgemeine Hausrat-Versicherungsbedingungen (VHB 2022)\n§ 1 Versicherte Sachen\nVersichert ist der Hausrat in der im Versicherungsschein bezeichneten Wohnung.", method: "pdf_text" as const },
      { pageNo: 2, text: "§ 4 Fahrraddiebstahl\n§ 5 Obliegenheiten", method: "pdf_text" as const },
    ];
    expect(classifyDocument(pages, "x.pdf").value).toBe("avb");
  });
  it("PHV mit Kfz-Ausschluss bleibt Privathaftpflicht (eindeutig)", () => {
    const text = "Versicherungsschein Privathaftpflichtversicherung\nVersichert ist die gesetzliche Haftpflicht aus den Gefahren des täglichen Lebens.\nNicht versichert ist die Haftpflicht aus dem Gebrauch eines Kraftfahrzeugs.";
    const r = classifyCategory([{ pageNo: 1, text, method: "pdf_text" }], "a.pdf");
    expect(r.value).toBe("privathaftpflicht");
    expect(r.confidence).toBe("high");
  });
});

describe("Produktblätter", () => {
  it("erkennt ein Kfz-Produktblatt als Tarif-/Produktinformation", () => {
    const text = "Produktblatt für die Kraftfahrtversicherung\nUnsere Kfz-Versicherung bietet zwei Produktlinien und verschiedene Leistungsbausteine.\nWelche Leistungsunterschiede gibt es?";
    const pages = [{ pageNo: 1, text, method: "pdf_text" as const }];
    expect(classifyDocument(pages, "KFZ-Produktblatt.pdf").value).toBe("produktinformation");
    expect(classifyCategory(pages, "KFZ-Produktblatt.pdf").value).toBe("kfz");
  });
});
