/**
 * Regelbasierte Klassifikation von Dokumenttyp und Versicherungsart.
 * Liefert neben dem Ergebnis die ausschlaggebenden Treffer (Nachvollziehbarkeit)
 * und einen qualitativen Qualitätsindikator – keine Scheinpräzision.
 */
import type { PageText } from "./extract-text";

export type DocType =
  | "versicherungsschein"
  | "avb"
  | "besondere_bedingungen"
  | "produktinformation"
  | "nachtrag"
  | "beitragsrechnung"
  | "beitragsanpassung"
  | "schadenmeldung"
  | "korrespondenz"
  | "leistungsentscheidung"
  | "kuendigung"
  | "widerruf"
  | "gutachten"
  | "rechnung"
  | "sonstiges";

export type Category =
  | "privathaftpflicht"
  | "hausrat"
  | "wohngebaeude"
  | "kfz"
  | "rechtsschutz"
  | "unfall"
  | "berufsunfaehigkeit"
  | "risikoleben"
  | "kranken"
  | "zahnzusatz"
  | "reise"
  | "tierhalterhaftpflicht"
  | "elektronik"
  | "sonstige";

type Rule = { re: RegExp; w: number };

const DOC_RULES: Record<Exclude<DocType, "sonstiges">, Rule[]> = {
  versicherungsschein: [
    // Titel "Versicherungsschein" am Dokumentanfang ist ein starkes Signal; Erwähnungen im Fließtext nur schwach
    { re: /^[^\n]{0,80}\n?[^\n]{0,80}\bversicherungsschein\b/i, w: 4 },
    { re: /\bversicherungsschein\b/i, w: 1 },
    { re: /\bpolice\b/i, w: 2 },
    { re: /\bversicherungsnehmer(in)?\b/i, w: 1 },
    { re: /\bversicherungsbeginn\b/i, w: 2 },
    { re: /\b(jahres|gesamt)?beitrag\b.*(€|eur)/i, w: 1 },
    { re: /\bnachtrag\b/i, w: -2 },
  ],
  avb: [
    { re: /allgemeine\s+[\p{L}-]*(versicherungs|vertrags)?bedingungen/iu, w: 6 },
    { re: /\b(VHB|AHB|AVB|ARB|AKB|AUB|VGB|BHV|PHV)\s?\d{2,4}\b/, w: 2 }, // z. B. "VHB 2022"
    { re: /§\s*\d+/g, w: 0.3 },
    { re: /\bobliegenheiten\b/i, w: 1 },
    { re: /\bausschl(üsse|uss)\b/i, w: 1 },
  ],
  besondere_bedingungen: [
    { re: /besondere\s+(versicherungs)?bedingungen/i, w: 5 },
    { re: /\bklausel(n)?\b/i, w: 1 },
    { re: /\bzusatzbedingungen\b/i, w: 2 },
  ],
  produktinformation: [
    { re: /produktinformationsblatt|informationsblatt zu versicherungsprodukten/i, w: 5 },
    { re: /\btarifbeschreibung\b|\bleistungsübersicht\b/i, w: 3 },
    { re: /\bwelche art der versicherung ist das\b/i, w: 3 },
  ],
  nachtrag: [
    { re: /\bnachtrag\b/i, w: 5 },
    { re: /\bvertragsänderung\b|\bänderung(en)? ihres vertrages\b/i, w: 3 },
    { re: /\bersetzt den bisherigen versicherungsschein\b/i, w: 2 },
  ],
  beitragsrechnung: [
    { re: /\bbeitragsrechnung\b/i, w: 5 },
    { re: /\bzahlungsaufforderung\b|\bfälliger beitrag\b|\bbeitragsfälligkeit\b/i, w: 3 },
    { re: /\bsepa-lastschrift\b/i, w: 1 },
  ],
  beitragsanpassung: [
    { re: /\bbeitragsanpassung\b/i, w: 5 },
    { re: /\bbeitrag(serhöhung| ändert sich| steigt)\b/i, w: 3 },
    { re: /\bsonderkündigungsrecht\b/i, w: 2 },
  ],
  schadenmeldung: [
    { re: /\bschaden(s)?meldung\b|\bschadenanzeige\b/i, w: 5 },
    { re: /\bschadentag\b|\bschadenort\b|\bschadenhergang\b/i, w: 2 },
  ],
  korrespondenz: [
    { re: /\bsehr geehrte(r)?\b/i, w: 2 },
    { re: /\bmit freundlichen grüßen\b/i, w: 2 },
    { re: /\bihr zeichen\b|\bunser zeichen\b/i, w: 1 },
    { re: /\bihre (schadenmeldung|anfrage|nachricht|e-mail|schreiben) vom\b/i, w: 5 },
  ],
  leistungsentscheidung: [
    { re: /\b(leistung|regulierung|erstattung)\s+(ablehnen|abgelehnt|ablehnung)\b|\blehnen wir\b.*\bab\b/i, w: 5 },
    { re: /\bleistungsentscheidung\b|\bregulierungsentscheidung\b/i, w: 5 },
    { re: /\bwir (erstatten|zahlen|überweisen) ihnen\b/i, w: 3 },
    { re: /\bschadennummer\b|\bschaden-nr\b/i, w: 1 },
  ],
  kuendigung: [
    { re: /\bkündigung(sbestätigung)?\b/i, w: 3 },
    { re: /\bhiermit kündige ich\b|\bbestätigen (wir )?(ihnen )?die kündigung\b/i, w: 5 },
  ],
  widerruf: [
    { re: /\bwiderrufsbelehrung\b/i, w: 5 },
    { re: /\bwiderrufsrecht\b/i, w: 3 },
  ],
  gutachten: [
    { re: /\bgutachten\b|\bsachverständige(r|n)?\b/i, w: 4 },
    { re: /\bschadenbericht\b|\bbesichtigung\b/i, w: 3 },
  ],
  rechnung: [
    { re: /\brechnung(snummer)?\b/i, w: 3 },
    { re: /\bkostenvoranschlag\b/i, w: 5 },
    { re: /\bmwst\b|\bumsatzsteuer\b|\bnetto\b/i, w: 2 },
  ],
};

const CATEGORY_RULES: Record<Exclude<Category, "sonstige">, Rule[]> = {
  privathaftpflicht: [
    { re: /privat[\s-]?haftpflicht/i, w: 5 },
    { re: /haftpflichtversicherung/i, w: 1 },
    { re: /gefahren des täglichen lebens/i, w: 3 },
  ],
  hausrat: [{ re: /\bhausrat/i, w: 5 }, { re: /\bVHB\b/, w: 3 }],
  wohngebaeude: [{ re: /wohngebäude|gebäudeversicherung/i, w: 5 }, { re: /\bVGB\b/, w: 3 }],
  kfz: [
    { re: /kfz-versicherung|kraftfahrtversicherung|kfz-haftpflicht/i, w: 5 },
    { re: /\bkfz\b|kraftfahrt|kraftfahrzeug/i, w: 1 },
    { re: /teilkasko|vollkasko/i, w: 4 },
    { re: /\bAKB\b|amtliches kennzeichen/i, w: 3 },
  ],
  rechtsschutz: [{ re: /rechtsschutz/i, w: 5 }, { re: /\bARB\b/, w: 3 }],
  unfall: [{ re: /unfallversicherung/i, w: 5 }, { re: /\bAUB\b|invaliditätsleistung/i, w: 3 }],
  berufsunfaehigkeit: [{ re: /berufsunfähigkeit/i, w: 5 }, { re: /\bBU-Rente\b/i, w: 3 }],
  risikoleben: [{ re: /risiko[\s-]?leben/i, w: 5 }, { re: /\btodesfallleistung\b/i, w: 2 }],
  kranken: [{ re: /krankenversicherung|krankenzusatz|krankentagegeld/i, w: 4 }],
  zahnzusatz: [{ re: /zahnzusatz|zahnersatz/i, w: 5 }],
  reise: [{ re: /reise(rücktritt|kranken|gepäck|versicherung)/i, w: 5 }],
  tierhalterhaftpflicht: [{ re: /tierhalter|hundehalter|pferdehalter/i, w: 5 }],
  elektronik: [{ re: /elektronikversicherung|handyversicherung|geräteversicherung|smartphone-versicherung/i, w: 5 }],
};

function score(text: string, rules: Rule[]) {
  let s = 0;
  const hits: string[] = [];
  for (const r of rules) {
    if (r.re.global) {
      const n = Math.min((text.match(r.re) ?? []).length, 20);
      if (n) {
        s += n * r.w;
        hits.push(`${r.re.source} ×${n}`);
      }
    } else {
      const m = r.re.exec(text);
      if (m) {
        s += r.w;
        hits.push(m[0]);
      }
    }
  }
  return { s, hits };
}

export type Classification<T extends string> = {
  value: T;
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

function pick<T extends string>(scores: { key: T; s: number; hits: string[] }[], fallback: T): Classification<T> {
  scores.sort((a, b) => b.s - a.s);
  const [best, second] = scores;
  if (!best || best.s < 3) return { value: fallback, confidence: "low", evidence: [] };
  const margin = best.s - (second?.s ?? 0);
  const confidence = best.s >= 6 && margin >= 3 ? "high" : margin >= 1.5 ? "medium" : "low";
  return { value: best.key, confidence, evidence: best.hits.slice(0, 5) };
}

export function classifyDocument(pages: PageText[], fileName: string): Classification<DocType> {
  // Kopf des Dokuments (erste 2 Seiten) ist am aussagekräftigsten; Dateiname als schwaches Signal.
  const head = `${fileName}\n${pages
    .slice(0, 2)
    .map((p) => p.text)
    .join("\n")}`.slice(0, 12000);
  const all = pages.map((p) => p.text).join("\n");
  const scores = (Object.keys(DOC_RULES) as Exclude<DocType, "sonstiges">[]).map((key) => {
    const h = score(head, DOC_RULES[key]);
    // AVB erkennt man oft am gesamten Umfang (viele Paragraphen)
    if (key === "avb" && pages.length > 4) {
      const a = score(all, [{ re: /§\s*\d+/g, w: 0.2 }]);
      h.s += Math.min(a.s, 4);
    }
    return { key, ...h };
  });
  return pick(scores, "sonstiges");
}

export function classifyCategory(pages: PageText[], fileName: string): Classification<Category> {
  const text = `${fileName}\n${pages
    .slice(0, 3)
    .map((p) => p.text)
    .join("\n")}`.slice(0, 15000);
  const scores = (Object.keys(CATEGORY_RULES) as Exclude<Category, "sonstige">[]).map((key) => ({
    key,
    ...score(text, CATEGORY_RULES[key]),
  }));
  return pick(scores, "sonstige");
}
