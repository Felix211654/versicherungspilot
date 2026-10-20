#!/usr/bin/env bash
# VersicherungsPilot starten (macOS/Linux mit Docker)
set -euo pipefail
cd "$(dirname "$0")"
docker info >/dev/null 2>&1 || { echo "Docker läuft nicht – bitte Docker starten."; exit 1; }
if [ ! -f .env ] && [ -n "$(docker volume ls -q --filter name=versicherungspilot_db-data)" ]; then
  echo "Es gibt bereits gespeicherte Daten, aber hier fehlt die .env mit deinen Schlüsseln."
  echo "Bitte die .env aus dem bisherigen Programmordner hierher kopieren und erneut starten."
  exit 1
fi
if [ ! -f .env ]; then
  echo "Erster Start: erzeuge geheime Schlüssel (.env) – Datei sicher aufbewahren!"
  cat > .env <<ENV
# VersicherungsPilot – lokale Konfiguration. Ohne FILE_ENCRYPTION_KEY sind gespeicherte Dokumente nicht lesbar.
POSTGRES_PASSWORD=$(openssl rand -hex 24)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
DOWNLOAD_SIGNING_SECRET=$(openssl rand -hex 32)
FILE_ENCRYPTION_KEY=$(openssl rand -base64 32)
PORT=3000
AI_PROVIDER=none
ANTHROPIC_API_KEY=
AI_MODEL=claude-opus-5-5
ENV
fi
if ! docker compose up -d --build; then
  docker compose logs --tail 15 migrate
  docker compose logs migrate | grep -q "password authentication failed" && echo "Ursache: Die .env passt nicht zu den gespeicherten Daten – bitte die bisherige .env hierher kopieren."
  exit 1
fi
PORT=$(grep '^PORT=' .env | cut -d= -f2); PORT=${PORT:-3000}
echo "Warte auf http://localhost:$PORT …"
for _ in $(seq 1 120); do curl -sf "http://localhost:$PORT/anmelden" >/dev/null && break; sleep 3; done
echo "VersicherungsPilot läuft: http://localhost:$PORT"
