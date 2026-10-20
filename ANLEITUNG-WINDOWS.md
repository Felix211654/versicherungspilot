# VersicherungsPilot auf dem Windows-PC starten

Das Programm läuft komplett auf deinem PC (Datenbank, Texterkennung, Programm). Deine Unterlagen verlassen den PC nicht – außer du aktivierst später ausdrücklich die KI-Funktionen.

## 1. Einmalig: Docker Desktop installieren
1. Herunterladen: https://www.docker.com/products/docker-desktop/ → „Download for Windows“.
2. Installieren (Standardeinstellungen, „Use WSL 2“ angehakt lassen). Ggf. PC neu starten.
3. Docker Desktop einmal öffnen und warten, bis unten links „Engine running“ steht. Ein Docker-Konto ist nicht nötig („Continue without signing in“ / „Skip“).

## 2. Einmalig: Programm herunterladen
1. Auf https://github.com/Felix211654/versicherungspilot (angemeldet) auf den grünen Knopf **„Code“** → **„Download ZIP“** klicken.
2. ZIP entpacken, z. B. nach `C:\VersicherungsPilot`.

## 3. Starten
1. Docker Desktop muss laufen.
2. Im Ordner doppelt auf **`start-windows.bat`** klicken.
   - Falls Windows warnt („Der Computer wurde durch Windows geschützt“): **„Weitere Informationen“ → „Trotzdem ausführen“**.
3. Beim **ersten Start** wird alles eingerichtet – das dauert **ca. 5–15 Minuten**. Danach öffnet sich der Browser mit **http://localhost:3000**.
4. Konto registrieren und loslegen.

Ab dem zweiten Start dauert es nur Sekunden. Läuft Docker Desktop, startet VersicherungsPilot auch nach einem PC-Neustart automatisch mit.

**Als Programm im Startmenü:** In Edge oder Chrome auf http://localhost:3000 → Menü (⋯) → „Apps“ → **„Diese Seite als App installieren“**.

## 4. Beenden
Doppelklick auf **`stop-windows.bat`**. Deine Daten bleiben erhalten.

## ⚠️ Wichtig: die Datei `.env` sichern
Beim ersten Start entsteht im Ordner die Datei **`.env`** mit deinen geheimen Schlüsseln. **Ohne sie lassen sich deine gespeicherten Dokumente nicht mehr öffnen.** Kopiere sie an einen sicheren Ort (z. B. Passwortmanager oder verschlüsselter USB-Stick) und gib sie niemandem.

## Datensicherung
- In der App: **Einstellungen → Datenexport herunterladen** (ZIP mit allen Originaldateien und Daten). Regelmäßig machen!
- Die Daten liegen in Docker-Speichern („Volumes“) namens `versicherungspilot_db-data` und `versicherungspilot_files`.

## Update auf eine neue Version
1. Neue ZIP von GitHub herunterladen und entpacken.
2. **Deine `.env` aus dem alten Ordner in den neuen kopieren.**
3. `stop-windows.bat` im alten Ordner, dann `start-windows.bat` im neuen Ordner. Deine Daten bleiben erhalten.

## KI-Funktionen aktivieren (optional)
1. `.env` mit dem Editor öffnen und eintragen:
   ```
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=dein-schlüssel
   ```
   (API-Schlüssel unter https://console.anthropic.com – kostenpflichtig nach Verbrauch.)
2. `start-windows.bat` erneut ausführen.
3. In der App unter **Einstellungen → KI und externe Dienste** die Einwilligung erteilen.

## Probleme?
| Problem | Lösung |
|---|---|
| „Docker läuft nicht“ | Docker Desktop starten und warten, bis „Engine running“ angezeigt wird |
| Port 3000 ist belegt | In `.env` `PORT=3001` setzen, neu starten, dann http://localhost:3001 öffnen |
| Seite lädt nicht | Im Ordner in der Adresszeile `cmd` eingeben, Enter, dann `docker compose logs app` |
| Dokument bleibt bei „Text wird erkannt“ | `docker compose logs worker` ansehen |
| Bei vielen Registrierungen „Zu viele Versuche“ | Schutzfunktion: max. 5 neue Konten pro 5 Minuten – kurz warten |
| Alles komplett entfernen (inkl. aller Daten!) | `docker compose down -v` im Ordner ausführen |

Bitte nur über **http://localhost:3000** öffnen (nicht über `127.0.0.1`), sonst funktioniert die Anmeldung nicht.
