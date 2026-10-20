# Roadmap / offene Punkte

Priorisiert nach Nutzen für einen sicheren, funktionsfähigen Kern.

## Zur Fertigstellung (Konfiguration, kein Code)
1. `ANTHROPIC_API_KEY` setzen, `npm run eval:ai` ausführen, Ergebnisse gegen die Kriterien in QUALITAET.md prüfen, ggf. Prompts/Modell (`AI_MODEL`) anpassen.
2. `VOYAGE_API_KEY` + `EMBEDDING_PROVIDER=voyage` für semantische Suche; bestehende Dokumente per „Analyse erneut ausführen“ indexieren.
3. ClamAV betreiben (`docker compose --profile security up -d clamav`, `CLAMAV_HOST=localhost`).
4. S3-Bucket (EU) konfigurieren und Upload/Download/Löschung in Staging testen.
5. Backups + Wiederherstellungstest (BETRIEB.md).

## Nächste Entwicklungsschritte
- E-Mail-Versand für Erinnerungen, E-Mail-Verifizierung und Passwort-Reset (SMTP/EU-Anbieter).
- Allgemeine Rechtsinformationen aus Primärquellen (gesetze-im-internet.de) mit URL, Titel, Abrufdatum als eigene Quellenart; Aktualitätsprüfung.
- PDF-Seitenvorschau mit Hervorhebung im Original (aktuell: Textansicht mit Markierung + Original in neuem Tab).
- KI-gestützte strukturierte Extraktion (zusätzlich zu Regeln) mit Zitatprüfung – Schema ist vorbereitet (`extraction_method = llm`).
- Option „Dokument von KI-Verarbeitung ausschließen“ (z. B. Gesundheitsdaten).
- Haushaltsmitglieder mit Rollen; E-Mail-Import über dedizierte Adressen (nur nach Autorisierung).
- Nonce-basierte CSP, KMS-Integration, Schlüsselrotation.
- Vergleichsangebote (nach rechtlicher Prüfung, siehe SICHERHEIT.md).
