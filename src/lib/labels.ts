export const CATEGORY_LABEL: Record<string, string> = {
  privathaftpflicht: "Privathaftpflicht",
  hausrat: "Hausrat",
  wohngebaeude: "Wohngebäude",
  kfz: "Kfz",
  rechtsschutz: "Rechtsschutz",
  unfall: "Unfall",
  berufsunfaehigkeit: "Berufsunfähigkeit",
  risikoleben: "Risikoleben",
  kranken: "Kranken",
  zahnzusatz: "Zahnzusatz",
  reise: "Reise",
  tierhalterhaftpflicht: "Tierhalterhaftpflicht",
  elektronik: "Elektronik/Geräte",
  sonstige: "Sonstige",
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  versicherungsschein: "Versicherungsschein / Police",
  avb: "Allgemeine Versicherungsbedingungen",
  besondere_bedingungen: "Besondere Bedingungen",
  produktinformation: "Tarif-/Produktinformation",
  nachtrag: "Nachtrag / Vertragsänderung",
  beitragsrechnung: "Beitragsrechnung",
  beitragsanpassung: "Beitragsanpassung",
  schadenmeldung: "Schadenmeldung",
  korrespondenz: "Korrespondenz",
  leistungsentscheidung: "Leistungsentscheidung / Ablehnung",
  kuendigung: "Kündigung",
  widerruf: "Widerrufsunterlagen",
  gutachten: "Gutachten / Schadenbericht",
  rechnung: "Rechnung / Kostenvoranschlag",
  sonstiges: "Sonstiges",
};

export const INTERVAL_LABEL: Record<string, string> = {
  monthly: "monatlich",
  quarterly: "vierteljährlich",
  semiannual: "halbjährlich",
  annual: "jährlich",
  single: "einmalig",
};

export const PROCESSING_LABEL: Record<string, string> = {
  uploaded: "Wird hochgeladen",
  scanning: "Wird geprüft",
  extracting_text: "Text wird erkannt",
  ocr: "Texterkennung (OCR) läuft",
  analyzing: "Vertrag wird analysiert",
  needs_review: "Bitte Angaben prüfen",
  completed: "Verarbeitung abgeschlossen",
  failed: "Verarbeitung fehlgeschlagen",
};

export const REVIEW_LABEL: Record<string, string> = {
  auto: "automatisch erkannt",
  confirmed: "vom Nutzer bestätigt",
  corrected: "vom Nutzer korrigiert",
  unclear: "nicht eindeutig",
  rejected: "verworfen",
};

export const CONFIDENCE_LABEL: Record<string, string> = {
  high: "eindeutig gefunden",
  medium: "plausibel",
  low: "unsicher",
};

export const FACT_FIELD_LABEL: Record<string, string> = {
  insurer_name: "Versicherer",
  category: "Versicherungsart",
  policy_number: "Vertrags-/Versicherungsscheinnummer",
  policyholder: "Versicherungsnehmer",
  start_date: "Versicherungsbeginn",
  end_date: "Ablauf / Hauptfälligkeit",
  premium: "Beitrag",
  payment_interval: "Zahlungsweise",
  notice_period: "Kündigungsfrist",
  auto_renewal: "Verlängerung",
  deductible: "Selbstbeteiligung",
  sum_insured: "Versicherungs-/Deckungssumme",
  waiting_period: "Wartezeit",
  letter_deadline: "Frist aus Schreiben",
  document_date: "Dokumentdatum",
};

export const DEADLINE_KIND_LABEL: Record<string, string> = {
  cancellation: "Kündigungsfrist",
  renewal: "Vertragsverlängerung",
  premium_due: "Beitragsfälligkeit",
  insurer_letter: "Frist aus Versichererschreiben",
  submission: "Nachreichungsfrist",
  claim_report: "Schadenmeldefrist",
  follow_up: "Wiedervorlage",
  custom: "Eigene Erinnerung",
};

export const CERTAINTY_LABEL: Record<string, string> = {
  confirmed: "bestätigt",
  derived: "abgeleitet – bitte prüfen",
  unclear: "unklar – Bestätigung erforderlich",
};

export const CLAIM_STATUS_LABEL: Record<string, string> = {
  draft: "Entwurf",
  facts_incomplete: "Sachverhalt wird ergänzt",
  policy_check: "Vertragsprüfung läuft",
  info_missing: "Angaben fehlen",
  preparing: "Anspruchsvorbereitung",
  report_prepared: "Meldung vorbereitet",
  submitted_by_user: "Vom Nutzer eingereicht",
  awaiting_response: "Rückmeldung ausstehend",
  evidence_requested: "Nachweise angefordert",
  insurer_reviewing: "In Prüfung beim Versicherer",
  approved: "Leistung bewilligt",
  partially_approved: "Leistung teilweise bewilligt",
  rejected: "Leistung abgelehnt",
  objection_prepared: "Einwand vorbereitet",
  closed: "Abgeschlossen",
};

export const ASSESSMENT_LABEL: Record<string, string> = {
  possible: "Deckung möglich",
  unlikely: "Deckung unwahrscheinlich",
  unclear: "ungeklärt",
  not_relevant: "nicht relevant",
};

export const TERM_KIND_LABEL: Record<string, string> = {
  coverage: "Deckung",
  exclusion: "Ausschluss",
  deductible: "Selbstbeteiligung",
  sublimit: "Sublimit / Entschädigungsgrenze",
  waiting_period: "Wartezeit",
  obligation: "Obliegenheit",
};

export const GENERATED_KIND_LABEL: Record<string, string> = {
  claim_report: "Erste Schadenmeldung",
  damage_description: "Strukturierte Schadenbeschreibung",
  evidence_list: "Liste der Nachweise",
  cover_letter: "Anschreiben an den Versicherer",
  status_inquiry: "Nachfrage zum Bearbeitungsstand",
  evidence_response: "Antwort auf Nachweisanforderung",
  rejection_explanation_request: "Bitte um Erläuterung der Ablehnung",
  objection: "Entwurf eines begründeten Einwands",
  case_summary: "Fallzusammenfassung für Anwalt/Berater",
};
