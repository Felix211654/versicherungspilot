# Sicherheit, Datenschutz und rechtliche Einordnung

> Technische Maßnahmen garantieren keine rechtliche Konformität. Vor einer öffentlichen Bereitstellung ist eine rechtliche Prüfung erforderlich (siehe unten).

## Umgesetzte Maßnahmen

### Zugriffsschutz
- Better Auth: Passwort-Hashing, httpOnly-Session-Cookies (in Produktion `Secure`), Sitzungen 7 Tage mit täglicher Verlängerung, TOTP-2FA mit Backup-Codes.
- Rate-Limits (Produktion): Anmeldung 5/min, Registrierung 5/5 min, 2FA 5/min; App: Uploads 60/h, KI-Anfragen 30/h, Export 5/h (PostgreSQL-basiert, instanzübergreifend).
- **Serverseitige Autorisierung bei jedem Zugriff**: Services erhalten den Haushalt aus der Sitzung, nie aus Client-Parametern; alle Abfragen filtern auf `household_id`. Fremde IDs liefern „nicht gefunden“.
- Dateien: kein öffentlicher Pfad. `/api/files/[token]`: HMAC-signiertes Token (15 min) + aktive Sitzung desselben Haushalts.
- `proxy.ts` leitet nur optimistisch um; maßgeblich ist die Prüfung in Seiten/Actions/Route-Handlern.
- CSRF: Server Actions prüfen Origin (Next.js); Auth-Endpunkte durch Better Auth; Cookies `SameSite=Lax`.
- XSS: React-Escaping, keine `dangerouslySetInnerHTML` mit Nutzerdaten; CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, HSTS (Produktion). Dateivorschau mit eigener restriktiver CSP (Bilder zusätzlich `sandbox`).
- Injection: Drizzle-Parameterbindung, `to_tsquery` nur mit bereinigten Lexemen; externe Programme per `spawn` ohne Shell.
- Upload: Größenlimit, Magic-Byte-Prüfung, verschlüsselte PDFs abgelehnt, aktive PDF-Inhalte markiert (nie ausgeführt), Virenscan per ClamAV (falls konfiguriert – sonst sichtbar „nicht geprüft“).

### Verschlüsselung
- TLS: am Reverse Proxy/Load Balancer terminieren (Pflicht in Produktion).
- Dateien: AES-256-GCM mit zufälligem Datenschlüssel je Datei; Datenschlüssel mit Master-Key (`FILE_ENCRYPTION_KEY`) gewrappt; S3 zusätzlich SSE.
- Datenbank: Verschlüsselung at rest durch den Datenbank-Anbieter (Managed PostgreSQL) **erforderlich**, da Seitentexte/Chunks für die Volltextsuche im Klartext in der DB liegen.
- Temporäre Klartextdateien (OCR) in `mkdtemp`-Verzeichnissen mit Rechten 0700/0600, Löschung im `finally`. Empfehlung: `TMP_DIR` auf tmpfs.
- Secrets nur über Umgebungsvariablen/Secret-Store; nichts im Client-Bundle (`server-only`).

### Logs
- Strukturierte JSON-Logs nur mit IDs, Zählern und gekürzten Fehlermeldungen – keine Dokumentinhalte, Fragen oder Antworten.
- Audit-Protokoll (`audit_event`) mit Aktion + Entitäts-ID, ohne Inhalte.

## Bedrohungsmodell (Auszug)

| Bedrohung | Maßnahme | Restrisiko / offen |
|---|---|---|
| Fremder Nutzer ruft Dokument per ID ab (IDOR) | Haushaltsfilter in allen Services, Token + Sitzung für Dateien | durch Integrations- und E2E-Tests abgedeckt |
| Datenbank-Dump gelangt nach außen | Dateien app-seitig verschlüsselt; DB-at-rest-Verschlüsselung beim Anbieter | Seitentexte im Dump lesbar → DB-Zugang streng beschränken, Backups verschlüsseln |
| Objektspeicher-Leak | nur Chiffrat | – |
| Verlust des Master-Keys | – | **Dateien unlesbar** → Key getrennt und redundant sichern (Secret-Manager) |
| Backups | verschlüsselt, Aufbewahrung definiert (BETRIEB.md) | gelöschte Daten bleiben bis Ablauf der Backup-Frist in Backups |
| OCR-Dienst | lokal (Tesseract) | – |
| KI-Anbieter | Einwilligung, Datenminimierung (nur relevante Auszüge, keine Vertragsnummern/Namen aus Stammdaten), keine Tools/Aktionen für das Modell | Dokumentauszüge selbst können Personendaten enthalten; AVV/Speicherort prüfen |
| Prompt-Injection in Dokumenten | Dokumenttext als Daten markiert und eingeschlossen, Klammern neutralisiert, Modell hat **keine** Werkzeuge, Ausgaben nur strukturiert + Belegprüfung | Modell kann trotzdem falsch formulieren → Belegprüfung, Kennzeichnung, keine Automatik |
| Schadsoftware in Uploads | Magic-Bytes, keine Ausführung, CSP/Sandbox, ClamAV optional | ohne ClamAV kein Malware-Scan |
| Session-Diebstahl | httpOnly/Secure-Cookies, 2FA, Passwortabfrage bei Kontolöschung/2FA-Änderung | – |
| Logs enthalten sensible Daten | bewusst minimaler Logger | Drittbibliotheken prüfen (Next.js-Fehlerlogs) |

## Nutzerrechte (DSGVO)
- **Auskunft/Portabilität**: Export als ZIP (Originale, `daten.json`, CSV) – `Einstellungen → Deine Daten`.
- **Berichtigung**: Korrektur aller erkannten Angaben; Prüfstatus wird gespeichert.
- **Löschung**: einzelne Dokumente (inkl. Versionen, Seiten, Chunks/Embeddings, Fakten, abgeleitete Klauseln, KI-Analysen), Verträge, Fälle, Chats; Kontolöschung (Passwort + Bestätigung) entfernt Dateien und kaskadiert über den Haushalt auf alle abgeleiteten Daten, entfernt Jobs und Protokolle und speichert nur einen Hash-Löschnachweis.
- **Einwilligung KI**: erteilen/widerrufen jederzeit; ohne Einwilligung werden keine Inhalte übertragen (getestet).

## KI-Datenschutz – vor Produktivbetrieb zu klären
- Auftragsverarbeitungsvertrag (Art. 28 DSGVO) mit dem KI-Anbieter, Unterauftragnehmer, Speicherort/Drittlandübermittlung (Art. 44 ff.), Aufbewahrungsdauer und Nutzung zu Trainingszwecken (laut Anbieterbedingungen für API-Kunden standardmäßig nicht – vertraglich verifizieren).
- Gesundheitsdaten (z. B. BU-, Kranken-, Unfallunterlagen) sind besondere Kategorien (Art. 9) → ausdrückliche Einwilligung; ggf. Option, solche Dokumente von KI-Verarbeitung auszuschließen (Roadmap).
- Datenschutz-Folgenabschätzung (Art. 35) ist bei dieser Art der Verarbeitung voraussichtlich erforderlich.

## Rechtliche Einordnung – Prüfauftrag
- **Rechtsdienstleistungsgesetz (RDG)**: Einzelfallbezogene Prüfung von Ansprüchen und Entwürfe von Einwänden können als Rechtsdienstleistung (§ 2 RDG) gelten. Aktuelle Gestaltung: vorläufige Einschätzungen, allgemeine Hinweise, keine individuelle rechtliche Bewertung, Entwürfe ohne rechtliche Argumente (Platzhalter). Vor Veröffentlichung anwaltlich prüfen lassen.
- **Versicherungsvermittlungsrecht (§ 34d GewO, IDD/VVG §§ 59 ff.)**: Optimierungshinweise ohne Produktempfehlung/Vermittlung; Vergleichsangebote und Wechsel sind bewusst nicht umgesetzt. Bei künftigen Vergleichen/Provisionen Erlaubnispflicht prüfen.
- **Telemedien/Impressum, AGB, Datenschutzhinweise**: Vorlage unter `/datenschutz` ist ausdrücklich als Entwurf markiert.

## Härtung (empfohlen)
- Nonce-basierte CSP (ersetzt `'unsafe-inline'` für Skripte).
- KMS für den Master-Key, Schlüsselrotation (Re-Wrap über `key_version`).
- E-Mail-Verifizierung und Passwort-Reset per E-Mail (erfordert E-Mail-Dienst).
- WAF/Bot-Schutz vor Registrierung, Monitoring fehlgeschlagener Anmeldungen.
