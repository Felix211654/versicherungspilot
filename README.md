# VersicherungsPilot

Persönlicher, datenschutzbewusster KI-Versicherungsmanager für Privatpersonen: Unterlagen zentral und verschlüsselt ablegen, Verträge automatisch erkennen und prüfen, Fragen aus den eigenen Unterlagen **mit überprüfbaren Fundstellen** beantworten, Schadenfälle vorbereiten und Fristen im Blick behalten.

> Keine Rechts- oder Versicherungsberatung. Einschätzungen sind vorläufig, Entwürfe werden nie automatisch versendet.

## Stand der Umsetzung (ehrlich)

| Bereich | Status |
|---|---|
| Auth (E-Mail/Passwort, Sitzungen, TOTP-2FA, Rate-Limits in Produktion) | ✅ funktionsfähig, getestet |
| Verschlüsselte Ablage (AES-256-GCM, Envelope), signierte Kurzzeit-Links | ✅ lokal getestet; S3-Treiber implementiert, **nicht gegen echten Bucket getestet** |
| Upload → Validierung → Text/OCR → Klassifikation → Extraktion mit Fundstelle → Zuordnung → Chunks → Fristen | ✅ Ende-zu-Ende getestet (PDF, Scan/PNG; DOCX implementiert) |
| Prüfung/Korrektur erkannter Angaben, Vertrag aus Dokument anlegen | ✅ |
| Volltextsuche (deutsch, Präfix für Komposita) | ✅ |
| Semantische Suche (pgvector) | ⚙️ implementiert, **benötigt `EMBEDDING_PROVIDER=voyage` + Key**; ohne Key: Volltext (wird angezeigt) |
| KI-Antworten mit Belegprüfung, Fallprüfung, KI-Zusammenfassungen | ⚙️ implementiert und mit Test-Provider geprüft; **benötigt `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` + Einwilligung des Nutzers**. Ohne Key: „Nur Fundstellen“-Modus, ausdrücklich gekennzeichnet |
| Schadenfälle: Erfassung, Rückfragen, Vertragsabgleich, Aufgaben, Nachweise, Kommunikation, Status, Verlauf | ✅ |
| Entwürfe (9 Arten) ohne erfundene Angaben, Platzhalter `[OFFEN: …]`, Download/Druck | ✅ |
| Fristen: Ableitung mit Berechnungsgrundlage, Erkennung aus Schreiben, Bestätigung, Erinnerungen (Hintergrundjob) | ✅ In-App-Benachrichtigungen; **E-Mail-Versand nicht implementiert** |
| Analyse: Kosten, Überschneidungen, Lücken, fehlende Unterlagen, SB, Deckungssummen, Beitragssteigerungen, Vergleich | ✅ regelbasiert |
| Export (ZIP + JSON + CSV), Kontolöschung inkl. abgeleiteter Daten | ✅ getestet |
| Virenscan | ⚙️ ClamAV-Anbindung implementiert, **nicht konfiguriert** → Dateien „nicht geprüft“ |
| E-Mail-Import, Vergleichsangebote, Haushalts-Mitglieder, Rechtsquellen-Abruf | ❌ noch nicht umgesetzt (siehe [docs/ROADMAP.md](docs/ROADMAP.md)) |

## Schnellstart (lokal)

Voraussetzungen: Node.js 22, PostgreSQL 16 mit `pgvector` und `pg_trgm`, `poppler-utils`, `tesseract-ocr` (+ `tesseract-ocr-deu`).

```bash
docker compose up -d postgres          # oder eigene PostgreSQL-Instanz
cp .env.example .env                   # Secrets erzeugen (Befehle stehen in der Datei)
npm ci
npm run db:migrate
npm run dev                            # Web-App   → http://localhost:3000
npm run worker                         # Hintergrund-Worker (zweites Terminal) – nötig für OCR/Analyse/Erinnerungen
```

### KI aktivieren

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-…
AI_MODEL=claude-opus-5-5               # Standard; günstiger: claude-sonnet-5-5 / claude-haiku-5-5
EMBEDDING_PROVIDER=voyage              # optional, semantische Suche
VOYAGE_API_KEY=…
```

Danach erteilt jeder Nutzer unter *Einstellungen → KI und externe Dienste* seine Einwilligung. Vorher wird nichts übertragen. Vor Produktivbetrieb: Auftragsverarbeitungsvertrag, Speicherort und Aufbewahrung beim Anbieter prüfen (siehe [docs/SICHERHEIT.md](docs/SICHERHEIT.md)).

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` / `build` / `start` | Web-App |
| `npm run worker` | Worker (Dokumentverarbeitung, tägliche Erinnerungen 06:00 Europe/Berlin) |
| `npm run db:generate` / `db:migrate` | Migrationen erzeugen / anwenden |
| `npm run test:unit` | Unit-Tests (Extraktion, Chunking, Fristen, Krypto) |
| `npm run test:integration` | Integrationstests gegen `versicherungspilot_test` (`.env.test`) |
| `npm run test:e2e` | Playwright, Desktop + Smartphone (App + Worker müssen laufen bzw. werden gestartet) |
| `npm run eval:ai` | KI-Evaluierung mit synthetischem Fallkatalog (nur mit konfiguriertem Anbieter) |
| `npx tsx scripts/make-fixtures.ts` | synthetische Testunterlagen erzeugen |

## Dokumentation

- [Architektur, Datenmodell, Entscheidungen](docs/ARCHITEKTUR.md)
- [Sicherheit, Datenschutz, rechtliche Einordnung](docs/SICHERHEIT.md)
- [Betrieb, Deployment, Backups, Kosten](docs/BETRIEB.md)
- [Qualität, Tests, KI-Evaluierung, Akzeptanzkriterien](docs/QUALITAET.md)
- [Roadmap / offene Punkte](docs/ROADMAP.md)
