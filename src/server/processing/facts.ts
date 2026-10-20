/**
 * Regelbasierte Extraktion von Vertragsangaben.
 * Jede Angabe enthält Seite und den Original-Textausschnitt (Beleg). Werte, für die
 * kein klarer Beleg gefunden wird, werden NICHT erzeugt.
 */
import { parseGermanAmountToCents } from "@/lib/money";
import { parseGermanDate } from "@/lib/dates";
import type { PageText } from "./extract-text";

export type FactField =
  | "insurer_name"
  | "policy_number"
  | "policyholder"
  | "start_date"
  | "end_date"
  | "premium"
  | "payment_interval"
  | "notice_period"
  | "auto_renewal"
  | "deductible"
  | "sum_insured"
  | "waiting_period"
  | "letter_deadline"
  | "document_date";

export type ExtractedFactDraft = {
  field: FactField;
  valueText: string;
  valueJson?: Record<string, unknown>;
  pageNo: number;
  snippet: string;
  method: "rule" | "llm";
  confidence: "high" | "medium" | "low";
};

/** Bekannte deutsche Versicherer (Auswahl). Erweiterbar; Treffer sind Hinweise, keine Gewissheit. */
export const KNOWN_INSURERS = [
  "Allianz",
  "AXA",
  "HUK-COBURG",
  "HUK24",
  "ERGO",
  "Generali",
  "R+V",
  "Debeka",
  "SIGNAL IDUNA",
  "Gothaer",
  "Zurich",
  "HDI",
  "VHV",
  "DEVK",
  "LVM",
  "Provinzial",
  "Württembergische",
  "Barmenia",
  "Continentale",
  "Alte Leipziger",
  "Helvetia",
  "Baloise",
  "Basler",
  "NÜRNBERGER",
  "HanseMerkur",
  "ARAG",
  "ADAC",
  "ROLAND",
  "Concordia",
  "Die Haftpflichtkasse",
  "InterRisk",
  "Janitos",
  "Ammerländer",
  "DOMCURA",
  "WGV",
  "CosmosDirekt",
  "Getsafe",
  "Hepster",
  "Verti",
  "DA Direkt",
  "Mecklenburgische",
  "VGH",
  "SV SparkassenVersicherung",
  "Versicherungskammer Bayern",
  "die Bayerische",
  "uniVersa",
  "Itzehoer",
  "Adam Riese",
  "wefox",
  "ottonova",
  "Hallesche",
  "Münchener Verein",
  "Volkswohl Bund",
  "Canada Life",
  "Swiss Life",
  "Stuttgarter",
  "Dialog",
  "Neodigital",
  "GEV",
  "Grundeigentümer-Versicherung",
  "ÖVB",
  "Öffentliche",
  "Feuersozietät",
  "Rhion",
  "Waldenburger",
  "Degenia",
  "Medien-Versicherung",
  "KRAVAG",
  "Condor",
  "Sparkassen-Versicherung",
];

const AMOUNT = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d{1,3}(?:[.,]\d{1,3})?\s*(?:Mio\.?|Millionen))`;
const CURRENCY = String.raw`\s*(?:€|EUR|Euro)`;
const DATE = String.raw`(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))`;

const NUMBER_WORDS: Record<string, number> = {
  ein: 1,
  einen: 1,
  einem: 1,
  eines: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  sechs: 6,
  zwölf: 12,
};
const toNumber = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMBER_WORDS[s.toLowerCase()] ?? null);

/** Zeilenweiser Kontext als Beleg (max. ~240 Zeichen). */
function snippetAround(text: string, index: number, length: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  let end = text.indexOf("\n", index + length);
  if (end === -1) end = text.length;
  // eine Folgezeile mitnehmen, wenn die Zeile sehr kurz ist (Label/Wert umgebrochen)
  if (end - start < 60) {
    const next = text.indexOf("\n", end + 1);
    end = next === -1 ? text.length : next;
  }
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 240);
}

type Finder = (p: PageText) => ExtractedFactDraft[];

function findAll(re: RegExp, p: PageText, build: (m: RegExpExecArray) => Omit<ExtractedFactDraft, "pageNo" | "snippet" | "method"> | null): ExtractedFactDraft[] {
  const out: ExtractedFactDraft[] = [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(p.text))) {
    const f = build(m);
    if (f) out.push({ ...f, pageNo: p.pageNo, snippet: snippetAround(p.text, m.index, m[0].length), method: "rule" });
    if (out.length > 20) break;
  }
  return out;
}

const finders: Record<Exclude<FactField, "insurer_name">, Finder> = {
  policy_number: (p) =>
    findAll(
      /(?:Versicherungsschein|Vertrags|Policen|Versicherungs)[\s-]*(?:Nr\.?|Nummer)\s*[:.]?\s*([A-Z0-9][A-Z0-9./ -]{3,28}[A-Z0-9])/i,
      p,
      (m) => {
        const v = m[1].replace(/\s{2,}.*/, "").trim();
        if (!/\d/.test(v) || v.length < 4) return null;
        return { field: "policy_number", valueText: v, confidence: "high" };
      },
    ),
  policyholder: (p) =>
    findAll(/Versicherungsnehmer(?:in)?\s*[:]\s*([A-ZÄÖÜ][\p{L}.' -]{2,60})/u, p, (m) => ({
      field: "policyholder",
      valueText: m[1].split(/\s{2,}|\n/)[0].trim(),
      confidence: "medium",
    })),
  start_date: (p) =>
    findAll(new RegExp(String.raw`(?:Versicherungsbeginn|Vertragsbeginn|Beginn(?: der Versicherung| des Vertrages)?)\s*[:]?\s*(?:am\s*)?${DATE}`, "i"), p, (m) => {
      const iso = parseGermanDate(m[1]);
      return iso ? { field: "start_date", valueText: iso, confidence: "high" } : null;
    }),
  end_date: (p) =>
    findAll(
      new RegExp(String.raw`(?:Vertragsablauf|Ablauf(?:datum| der Versicherung| des Vertrages)?|Versicherungsende|Vertragsende|Ende der Versicherung)\s*[:]?\s*(?:am\s*)?${DATE}`, "i"),
      p,
      (m) => {
        const iso = parseGermanDate(m[1]);
        return iso ? { field: "end_date", valueText: iso, confidence: "high" } : null;
      },
    ),
  premium: (p) =>
    findAll(
      new RegExp(
        String.raw`(Jahresbeitrag|Jahresprämie|Monatsbeitrag|Vierteljahresbeitrag|Halbjahresbeitrag|Gesamtbeitrag|zu zahlender Beitrag|Beitrag)(?:\s*\([^)]{0,40}\))?[^\n\d]{0,40}?${AMOUNT}${CURRENCY}`,
        "i",
      ),
      p,
      (m) => {
        const cents = parseGermanAmountToCents(m[2]);
        if (cents == null || cents <= 0) return null;
        const label = m[1].toLowerCase();
        const interval = label.startsWith("jahres")
          ? "annual"
          : label.startsWith("monats")
            ? "monthly"
            : label.startsWith("vierteljahres")
              ? "quarterly"
              : label.startsWith("halbjahres")
                ? "semiannual"
                : null;
        return {
          field: "premium",
          valueText: (cents / 100).toFixed(2),
          valueJson: { cents, currency: "EUR", interval, label: m[1] },
          confidence: interval ? "high" : "medium",
        };
      },
    ),
  payment_interval: (p) =>
    findAll(/Zahlungs(?:weise|art|intervall)\s*[:]?\s*(monatlich|vierteljährlich|halbjährlich|jährlich|einmalig)/i, p, (m) => {
      const map: Record<string, string> = {
        monatlich: "monthly",
        vierteljährlich: "quarterly",
        halbjährlich: "semiannual",
        jährlich: "annual",
        einmalig: "single",
      };
      return { field: "payment_interval", valueText: map[m[1].toLowerCase()], confidence: "high" };
    }),
  notice_period: (p) =>
    findAll(
      /(?:Kündigungsfrist\s*[:]?\s*|(?:spätestens|mit einer Frist von|unter Einhaltung einer Frist von)\s+)(\d+|einen|ein|einem|zwei|drei|vier|sechs)\s+(Monat(?:e|en)?|Woche(?:n)?)(?:\s+(?:vor|zum)\s+(?:Ablauf|Ende|Schluss))?/i,
      p,
      (m) => {
        const n = toNumber(m[1]);
        if (!n) return null;
        const unit = m[2].toLowerCase().startsWith("monat") ? "months" : "weeks";
        const ctx = snippetAround(p.text, m.index, m[0].length);
        // Nur Fristen im Kündigungskontext
        if (!/kündig/i.test(ctx)) return null;
        return {
          field: "notice_period",
          valueText: `${n} ${unit === "months" ? (n === 1 ? "Monat" : "Monate") : n === 1 ? "Woche" : "Wochen"}`,
          valueJson: { amount: n, unit },
          confidence: /vor\s+(Ablauf|Ende|Schluss)/i.test(m[0]) ? "high" : "medium",
        };
      },
    ),
  auto_renewal: (p) =>
    findAll(/verlängert sich (?:der Vertrag |die Versicherung )?(?:stillschweigend |automatisch |jeweils )*um (?:jeweils )?(ein|1|zwei|2|drei|3) Jahr(?:e)?/i, p, (m) => {
      const n = toNumber(m[1]) ?? 1;
      return { field: "auto_renewal", valueText: `verlängert sich um ${n} Jahr${n > 1 ? "e" : ""}`, valueJson: { months: n * 12 }, confidence: "high" };
    }),
  deductible: (p) =>
    findAll(new RegExp(String.raw`(?:Selbstbeteiligung|Selbstbehalt)(?:\s+(?:je|pro)\s+(?:Schadenfall|Versicherungsfall))?[^\n\d]{0,30}?${AMOUNT}${CURRENCY}`, "i"), p, (m) => {
      const cents = parseGermanAmountToCents(m[1]);
      if (cents == null) return null;
      return { field: "deductible", valueText: (cents / 100).toFixed(2), valueJson: { cents, currency: "EUR" }, confidence: "medium" };
    }),
  sum_insured: (p) =>
    findAll(new RegExp(String.raw`(Versicherungssumme|Deckungssumme|pauschale Deckungssumme)\s*(?::|von|beträgt|in Höhe von|je Versicherungsfall|pauschal)?\s*${AMOUNT}${CURRENCY}`, "i"), p, (m) => {
      const cents = parseGermanAmountToCents(m[2]);
      if (cents == null) return null;
      return { field: "sum_insured", valueText: (cents / 100).toFixed(2), valueJson: { cents, currency: "EUR", label: m[1] }, confidence: "medium" };
    }),
  waiting_period: (p) =>
    findAll(/Wartezeit(?:en)?\s*(?:von|beträgt|:)?\s*(\d+|drei|sechs|zwölf)\s+(Monat(?:e|en)?|Tag(?:e|en)?)/i, p, (m) => {
      const n = toNumber(m[1]);
      if (!n) return null;
      const days = m[2].toLowerCase().startsWith("monat") ? n * 30 : n;
      return { field: "waiting_period", valueText: `${n} ${m[2]}`, valueJson: { amount: n, unit: m[2], approxDays: days }, confidence: "medium" };
    }),
  letter_deadline: (p) =>
    findAll(new RegExp(String.raw`(?:bis (?:spätestens )?(?:zum )?|spätestens (?:am|bis zum) |Frist (?:bis|zum) )${DATE}`, "i"), p, (m) => {
      const iso = parseGermanDate(m[1]);
      return iso ? { field: "letter_deadline", valueText: iso, confidence: "low" } : null;
    }),
  document_date: (p) =>
    p.pageNo !== 1
      ? []
      : findAll(new RegExp(String.raw`(?:Datum|Ausstellungsdatum|Erstellt am)\s*[:]?\s*${DATE}`, "i"), p, (m) => {
          const iso = parseGermanDate(m[1]);
          return iso ? { field: "document_date", valueText: iso, confidence: "medium" } : null;
        }),
};

function findInsurer(pages: PageText[]): ExtractedFactDraft[] {
  const out: ExtractedFactDraft[] = [];
  const counts = new Map<string, { n: number; first: ExtractedFactDraft }>();
  for (const p of pages.slice(0, 5)) {
    for (const name of KNOWN_INSURERS) {
      const re = new RegExp(`(?<![\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "giu");
      let m: RegExpExecArray | null;
      while ((m = re.exec(p.text))) {
        const c = counts.get(name);
        if (c) c.n++;
        else
          counts.set(name, {
            n: 1,
            first: { field: "insurer_name", valueText: name, pageNo: p.pageNo, snippet: snippetAround(p.text, m.index, m[0].length), method: "rule", confidence: "medium" },
          });
      }
    }
  }
  const ranked = [...counts.values()].sort((a, b) => b.n - a.n);
  if (ranked.length) {
    const top = ranked[0];
    const second = ranked[1];
    top.first.confidence = !second || top.n >= second.n * 2 ? "high" : "low";
    out.push(top.first);
    if (second && top.first.confidence === "low") out.push({ ...second.first, confidence: "low" });
    return out;
  }
  // Fallback: Firmierung "... Versicherung AG"
  for (const p of pages.slice(0, 2)) {
    const m = /([A-ZÄÖÜ][\p{L}&+.-]*(?:\s[A-ZÄÖÜ][\p{L}&+.-]*){0,3}\s(?:Versicherung(?:s-AG|sgesellschaft)?|Versicherungen)\s(?:AG|a\.\s?G\.|VVaG|SE))/u.exec(p.text);
    if (m) {
      out.push({ field: "insurer_name", valueText: m[1].trim(), pageNo: p.pageNo, snippet: snippetAround(p.text, m.index, m[0].length), method: "rule", confidence: "low" });
      break;
    }
  }
  return out;
}

/**
 * Extrahiert Kandidaten je Feld. Mehrere unterschiedliche Werte für ein Feld werden
 * als "low" markiert (Widerspruch → manuelle Prüfung).
 */
export function extractFacts(pages: PageText[], opts: { includeLetterDeadlines: boolean }): ExtractedFactDraft[] {
  const facts: ExtractedFactDraft[] = [...findInsurer(pages)];
  for (const [field, finder] of Object.entries(finders) as [Exclude<FactField, "insurer_name">, Finder][]) {
    if (field === "letter_deadline" && !opts.includeLetterDeadlines) continue;
    const found = pages.flatMap((p) => finder(p));
    if (!found.length) continue;
    // Duplikate (gleicher Wert) zusammenfassen – erste Fundstelle gewinnt
    const byValue = new Map<string, ExtractedFactDraft>();
    for (const f of found) if (!byValue.has(f.valueText)) byValue.set(f.valueText, f);
    const distinct = [...byValue.values()];
    const multiValueAllowed = field === "letter_deadline" || field === "deductible" || field === "sum_insured" || field === "waiting_period";
    if (distinct.length > 1 && !multiValueAllowed) {
      for (const f of distinct.slice(0, 4)) facts.push({ ...f, confidence: "low" });
    } else {
      facts.push(...distinct.slice(0, multiValueAllowed ? 8 : 1));
    }
  }
  return facts;
}
