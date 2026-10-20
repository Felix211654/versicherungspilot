# Architektur

## Überblick

```
Browser (PWA, React 19)
   │  HTTPS, Session-Cookie (httpOnly, SameSite)
   ▼
Next.js 16 (App Router, Node-Runtime)                    Worker (Node, gleiche Codebasis)
 ├─ proxy.ts           optimistische Login-Umleitung      ├─ pg-boss: document-process (Retry/Backoff,
 ├─ Server Components  lesen über Services (DAL)          │           singletonKey je Version)
 ├─ Server Actions     Mutationen (Zod, Mandantenprüfung) ├─ pg-boss: reminders-daily (Cron 06:00)
 └─ Route Handlers     Upload, Dateien, Status, Export    └─ Pipeline: ClamAV → pdftotext/Tesseract →
          │                                                   Klassifikation → Extraktion → Chunks →
          ▼                                                   (Embeddings) → (KI-Zusammenfassung) → Fristen
  Service-Schicht (src/server/services)  ◄──────────────────────┘
          │
  PostgreSQL 16 (+pgvector, pg_trgm, deutsche Volltextsuche) · Objektspeicher (lokal | S3, verschlüsselt)
          │
  KI-Abstraktion (src/server/ai): LlmProvider (Anthropic) · Embeddings (Voyage) – optional
```

### Schichten

| Ordner | Verantwortung |
|---|---|
| `src/app` | UI (Seiten, Layouts), Route Handler – keine Geschäftslogik |
| `src/components` | UI-Bausteine (Designsystem in `ui/`, fachliche Komponenten) |
| `src/server/actions` | Server Actions: Eingaben parsen/validieren, Service aufrufen, revalidieren |
| `src/server/services` | Geschäftslogik + Datenzugriff; **jede Funktion filtert auf `householdId`** |
| `src/server/processing` | Dokumentverarbeitung (rein + Pipeline) |
| `src/server/ai` | Provider-Abstraktion, Prompts, Schemas, RAG, Belegprüfung |
| `src/server/storage` | Verschlüsselung, Objektspeicher, signierte Tokens |
| `src/server/jobs` | Queue-Definitionen |
| `src/lib` | geteilte, reine Hilfen (Datum, Geld, Labels, Antworttypen) |

## Wesentliche Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Next.js 16, ohne Cache Components** | Alle Inhalte sind personenbezogen und dynamisch; bewusst kein serverseitiges Caching sensibler Daten. |
| **Better Auth** (Drizzle-Adapter) | Etablierte Bibliothek, Sitzungen in eigener DB (kein Drittanbieter mit Nutzerdaten), TOTP-2FA, DB-basierte Rate-Limits. |
| **Drizzle ORM + SQL-Migrationen** | Typsicher, nah an SQL, unterstützt pgvector/tsvector/generierte Spalten. |
| **pg-boss statt Redis/Queue-Dienst** | Robuste Jobs mit Retry/Backoff/Cron in PostgreSQL – keine zusätzliche Infrastruktur. |
| **App-seitige Verschlüsselung** (AES-256-GCM, Datenschlüssel je Datei, mit Master-Key gewrappt) | Speicheranbieter sieht nie Klartext; Schlüsselrotation über `keyVersion` vorbereitet (KMS-fähig). |
| **Downloads nur über `/api/files/[token]`** | Token (HMAC, 15 min) **und** Sitzungsprüfung gegen Haushalt → kein IDOR, keine weitergebbaren Links. |
| **Poppler + Tesseract (lokal)** | Keine Übermittlung von Dokumenten an externe OCR-Dienste. |
| **Regelbasierte Extraktion als Basis, KI optional** | Funktioniert ohne KI und ohne Datenabfluss; jede Angabe mit Fundstelle. KI ergänzt nur mit wörtlich geprüften Zitaten. |
| **Hybride Suche (Volltext + optional Vektor, RRF)** | Volltext liefert exakte Klauseltreffer und funktioniert ohne Embeddings. |
| **Vorlagenbasierte Entwürfe** | Garantiert, dass keine Tatsachen/Beträge/Argumente erfunden werden; Lücken als `[OFFEN: …]`. |
| **Eine Tabelle `policy_term` für Deckung/Ausschluss/SB/Sublimit/Wartezeit/Obliegenheit** | Gleiche Quellen- und Prüflogik, typisierte Spalten; vermeidet sechs strukturgleiche Tabellen. |
| **Haushalt als Mandant** | Alle fachlichen Daten hängen am Haushalt; Erweiterung um Mitbewohner/Partner später möglich. |

## Datenmodell (Kurzfassung)

Alle fachlichen Tabellen haben `household_id` (FK, `ON DELETE CASCADE`). Geldbeträge als Integer-Cent + Währung, Kalenderdaten als `date`.

| Entität (Prompt) | Tabelle | Wichtige Felder |
|---|---|---|
| User / Session / 2FA | `user`, `session`, `account`, `two_factor`, `verification`, `rate_limit` | Better-Auth-Standard |
| Household | `household`, `household_member`, `user_settings` | Einwilligung KI (`ai_processing_consent_at`), Erinnerungsintervalle, Zeitzone |
| Insurer | `insurer` | je Haushalt eindeutig |
| InsurancePolicy | `insurance_policy` | Art, Nummer, Beginn, **Ablauf**, Verlängerung, **Kündigungsfrist (Monate + Wortlaut)**, Beitrag + Intervall, Status |
| InsuredPerson / InsuredObject | `insured_person`, `insured_object` | |
| Coverage, Exclusion, Deductible, Sublimit, WaitingPeriod, Obligation | `policy_term` (`kind`) | Betrag, %, Dauer, **Quelle (Dokument/Seite/Zitat)**, Methode, Prüfstatus |
| PolicyDocument / DocumentVersion | `policy_document`, `document_version` | Typ + Prüfstatus, Zuordnung (`unassigned/suggested/confirmed`), Versionen mit SHA-256, Wrapped Key, Verarbeitungsstatus, Fehler, Versuche, Virenscan |
| (Seiten) | `document_page` | Text je Seite, Methode, OCR-Konfidenz |
| DocumentChunk | `document_chunk` | Seitenbereich, Überschrift, `tsv` (generiert, GIN), `embedding vector(1024)` (HNSW) |
| ExtractedFact | `extracted_fact` | Wert, Seite, Ausschnitt, Methode, Qualitätsindikator, Prüfstatus, Korrektur, Prüfer |
| ContractDeadline / Reminder | `contract_deadline`, `reminder`, `notification` | Art, Datum, **Berechnungsgrundlage**, Sicherheitsgrad, Status, Quelle, `origin_key` (idempotent) |
| Claim, ClaimEvent, ClaimEvidence, ClaimTask | `claim`, `claim_policy` (Prüfstatus je Vertrag), `claim_event`, `claim_evidence`, `task` | |
| Communication | `communication` | Richtung, Kanal, Datum |
| GeneratedDocument | `generated_document` | Art, Inhalt, offene Punkte, Status |
| AIAnalysis | `ai_analysis` | Anbieter, Modell, Ausgabe, Quellen, Belegprüfung, Tokens |
| AuditEvent | `audit_event` | nur IDs/technische Metadaten |
| (Chat) | `chat_conversation`, `chat_message` | strukturierte Antwort |
| (Löschnachweis) | `deletion_record` | Hash statt Personenbezug |

Vollständige Definition: `src/server/db/schema.ts`, Migrationen: `drizzle/`.

## Verarbeitungsablauf eines Dokuments

1. `POST /api/documents/upload` – Auth, Rate-Limit, Größenlimit, **Magic-Byte-Prüfung**, verschlüsselte PDFs abgelehnt, aktive PDF-Inhalte markiert, Duplikat (SHA-256) erkannt.
2. Datei verschlüsselt speichern, `document_version.status = uploaded`, Job einreihen (singletonKey = Version).
3. Worker: Virenscan (oder ehrlich „nicht geprüft“) → `pdftotext` je Seite; Seiten mit < 40 Zeichen → `pdftoppm` 300 dpi → Tesseract (`deu+eng`) inkl. Konfidenz; DOCX → mammoth.
4. Kein lesbarer Text → **dauerhaft fehlgeschlagen** mit Begründung (kein Retry); andere Fehler → Retry mit Backoff, Status „fehlgeschlagen“ + „Erneut verarbeiten“.
5. Klassifikation (Dokumenttyp, Sparte) mit Belegtreffern und Qualitätsindikator; vom Nutzer bestätigte Typen werden nicht überschrieben.
6. Extraktion (Versicherer, Nummer, Daten, Beitrag/Intervall, Kündigungsfrist, Verlängerung, SB, Summen, Wartezeiten, Fristen in Schreiben) mit Seite + Zitat; widersprüchliche Werte → „nicht eindeutig“.
7. Chunking entlang der Klauselstruktur (§, A 1.2, Ziffer …) mit Seitenbereich und Überschrift; optional Embeddings.
8. Zuordnung über Vertragsnummer (nur Vorschlag), sonst „Bitte Angaben prüfen“ + Aufgabe.
9. Optional KI-Zusammenfassung; Klauseln nur mit wörtlich auf der angegebenen Seite gefundenem Zitat.
10. Fristen aus Schreiben → „unklar, Bestätigung erforderlich“.

Alle Schritte sind idempotent (abgeleitete Daten der Version werden vor Neuaufbau gelöscht).

## RAG und Antwortprüfung

1. Frage → Suchbegriffe + fachliche Synonyme (z. B. „Laptop“ → Elektronik) → Präfix-Volltextsuche (+ Vektor, falls aktiv).
2. Spartenhinweise („Fahrrad“ → Hausrat …) → **je infrage kommendem Vertrag eine eigene Suche**, damit nicht nur der erste Treffer zählt.
3. Kontext: Vertragsübersicht ohne Vertragsnummern/Personennamen + Quellen `S1…Sn` mit Vertragsreferenz `P1…Pn`, Seite, Abschnitt. Dokumenttext ist in `<quelle>` eingeschlossen; spitze Klammern werden neutralisiert.
4. Strukturierte Ausgabe (Zod-Schema) mit Pflicht-Zitaten.
5. **Belegprüfung** (`src/server/ai/verify.ts`): unbekannte Quelle / Zitat nicht wörtlich im Quelltext / Zitat aus anderem Vertrag → Beleg verworfen; Vertragsaussage ohne Beleg → „unbelegt“ markiert; „möglich/unwahrscheinlich“ ohne Beleg → „ungeklärt“.
6. Darstellung nach der verbindlichen Antwortstruktur; allgemeine/gesetzliche Informationen getrennt; jeder Beleg verlinkt auf das Dokument an der Seite mit markierter Fundstelle.
