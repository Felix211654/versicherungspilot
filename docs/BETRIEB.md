# Betrieb und Deployment

## Komponenten

| Komponente | Hinweis |
|---|---|
| Web (`npm run start`) | zustandslos, horizontal skalierbar; hinter TLS-terminierendem Proxy |
| Worker (`npm run worker`) | benötigt `poppler-utils`, `tesseract-ocr(-deu)`; 1–n Instanzen (pg-boss verteilt Jobs) |
| PostgreSQL 16 | Extensions `vector`, `pg_trgm` (Migration `0000_extensions.sql`; ggf. beim Anbieter freischalten) |
| Objektspeicher | S3-kompatibel (EU-Region), privat, Versionierung optional |
| ClamAV (optional) | `CLAMAV_HOST` |

Das `Dockerfile` baut ein Image für Web und Worker. Ablauf je Release:

```bash
docker build -t versicherungspilot .
docker run --env-file .env versicherungspilot npm run db:migrate
docker run --env-file .env -p 3000:3000 versicherungspilot            # Web
docker run --env-file .env versicherungspilot npm run worker          # Worker
```

Umgebungsvariablen: siehe `.env.example` (alle dokumentiert). Produktionspflicht: `NODE_ENV=production`, TLS, eigene Secrets, `STORAGE_DRIVER=s3`.

## Fehlerbehandlung und Überwachung
- Jobs: 3 Wiederholungen mit exponentiellem Backoff; nicht behebbare Fehler (unleserlich, Schadsoftware) sofort „fehlgeschlagen“ mit Begründung. Nutzer können „Erneut verarbeiten“ auslösen.
- Doppelte Verarbeitung: `singletonKey` je Dokumentversion + idempotente Pipeline.
- Überwachung fehlgeschlagener Analysen: `SELECT status, count(*) FROM document_version GROUP BY status;` bzw. pg-boss-Tabellen (`pgboss.job`, Zustand `failed`). Empfehlung: Alarm, wenn `failed` > 0 in 1 h oder Jobs > 15 min in `active`.
- Logs: JSON-Zeilen (stdout) → Log-Plattform; enthalten keine Inhalte.
- Performance: Next.js-Request-Logs; Worker loggt Seiten/Chunks/Methode je Dokument. Für Produktion OpenTelemetry (Next.js `instrumentation.ts`) ergänzen.

## Backups und Wiederherstellung
- PostgreSQL: tägliche verschlüsselte Snapshots + PITR (Managed-Angebot), Aufbewahrung **30 Tage** (Vorschlag; in Datenschutzhinweisen nennen).
- Objektspeicher: Versionierung/Replikation mit Lebenszyklusregel 30 Tage. Dateien sind ohnehin verschlüsselt.
- **`FILE_ENCRYPTION_KEY` und `BETTER_AUTH_SECRET` getrennt im Secret-Manager sichern** – ohne Master-Key keine Wiederherstellung der Dateien.
- Wiederherstellungstest (vierteljährlich): Snapshot in Staging einspielen → `npm run db:migrate` → Stichprobe von Dokumenten über die App öffnen (prüft DB + Speicher + Schlüssel).
- Löschungen: gelöschte Daten verschwinden aus Backups spätestens nach Ablauf der Aufbewahrungsfrist; bei Wiederherstellung eines Backups die `deletion_record`-Einträge seit Backup-Zeitpunkt erneut anwenden (Prozess dokumentieren).
- Hinweis: Backup/Restore wurde in dieser Entwicklungsumgebung **nicht** praktisch getestet.

## Laufende Kosten (Schätzung, Stand 10/2026, ohne Gewähr)

Infrastruktur (kleiner Produktivbetrieb, EU):

| Posten | ca. €/Monat |
|---|---|
| App-Server (2 vCPU, 4 GB) für Web + Worker | 10–30 |
| Managed PostgreSQL mit Backups | 15–60 |
| S3-kompatibler Speicher (≤ 100 GB) | 1–5 |
| Gesamt | **≈ 30–100** |

KI (nur bei Nutzung; Anthropic-Listenpreise Claude Opus 5.5: 4 $/MTok Eingabe, 20 $/MTok Ausgabe):

| Vorgang | Tokens (typ.) | Kosten mit Opus 5.5 |
|---|---|---|
| Frage an den Assistenten (≈ 24 Quellen) | ~15k in / ~2k out | ≈ 0,10 $ |
| Fallprüfung | ~18k in / ~3k out | ≈ 0,13 $ |
| Zusammenfassung 20-seitige AVB | ~15k in / ~3k out | ≈ 0,12 $ |

Mit `AI_MODEL=claude-sonnet-5-5` (2 $/10 $) etwa halb so teuer, mit `claude-haiku-5-5` deutlich günstiger – Qualität vorher mit `npm run eval:ai` prüfen. Embeddings (Voyage) laut aktueller Preisliste; Volumen ≈ Textmenge der Dokumente (einmalig je Dokument). Tatsächliche Token-Zahlen werden je Analyse in `ai_analysis` gespeichert.
