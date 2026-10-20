# VersicherungsPilot - Start unter Windows (Docker Desktop erforderlich)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }

Write-Step "Pruefe Docker"
try { docker info *> $null; if ($LASTEXITCODE -ne 0) { throw "x" } }
catch {
  Write-Host "Docker laeuft nicht. Bitte Docker Desktop starten (oder installieren: https://www.docker.com/products/docker-desktop/) und dieses Skript erneut ausfuehren." -ForegroundColor Yellow
  Read-Host "Enter zum Beenden"; exit 1
}

function New-Secret([int]$bytes) {
  $b = New-Object byte[] $bytes
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return $b
}

$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  # Schutz: Gibt es bereits Daten, darf KEINE neue .env erzeugt werden (Schluessel wuerden nicht passen)
  $existing = docker volume ls -q --filter "name=versicherungspilot_db-data"
  if ($existing) {
    Write-Host ""
    Write-Host "Es gibt bereits gespeicherte VersicherungsPilot-Daten auf diesem PC," -ForegroundColor Yellow
    Write-Host "aber in diesem Ordner fehlt die Datei .env mit deinen Schluesseln." -ForegroundColor Yellow
    Write-Host "Bitte die .env aus dem bisherigen Programmordner hierher kopieren:" -ForegroundColor Yellow
    Write-Host "  $root" -ForegroundColor Yellow
    Write-Host "Danach start-windows.bat erneut ausfuehren." -ForegroundColor Yellow
    Read-Host "Enter zum Beenden"; exit 1
  }
  Write-Step "Erster Start: erzeuge geheime Schluessel (.env)"
  $hex = { param($n) ([BitConverter]::ToString((New-Secret $n)) -replace "-", "").ToLower() }
  $content = @(
    "# VersicherungsPilot - lokale Konfiguration (automatisch erzeugt am $(Get-Date -Format 'yyyy-MM-dd HH:mm'))",
    "# WICHTIG: Diese Datei sicher aufbewahren (z. B. Passwortmanager)!",
    "# Ohne FILE_ENCRYPTION_KEY koennen gespeicherte Dokumente nicht mehr geoeffnet werden.",
    "POSTGRES_PASSWORD=$(& $hex 24)",
    "BETTER_AUTH_SECRET=$(& $hex 32)",
    "DOWNLOAD_SIGNING_SECRET=$(& $hex 32)",
    "FILE_ENCRYPTION_KEY=$([Convert]::ToBase64String((New-Secret 32)))",
    "PORT=3000",
    "",
    "# Optional: KI aktivieren (danach Neustart mit start-windows.bat)",
    "AI_PROVIDER=none",
    "ANTHROPIC_API_KEY=",
    "AI_MODEL=claude-opus-5-5"
  ) -join "`n"
  # UTF-8 ohne BOM (sonst liest Docker Compose die erste Zeile falsch)
  [IO.File]::WriteAllText($envFile, $content + "`n", (New-Object Text.UTF8Encoding($false)))
}

Write-Step "Baue und starte VersicherungsPilot (beim ersten Mal einige Minuten)"
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Start fehlgeschlagen. Details der Datenbank-Einrichtung:" -ForegroundColor Red
  docker compose logs --tail 15 migrate
  $log = (docker compose logs migrate) -join "`n"
  if ($log -match "password authentication failed") {
    Write-Host ""
    Write-Host "Ursache: Die .env in diesem Ordner passt nicht zu deinen gespeicherten Daten." -ForegroundColor Yellow
    Write-Host "Bitte die .env aus dem bisherigen Programmordner hierher kopieren (ersetzen) und erneut starten." -ForegroundColor Yellow
  }
  Read-Host "Enter zum Beenden"; exit 1
}

$port = (Get-Content $envFile | Where-Object { $_ -match '^PORT=' }) -replace 'PORT=', ''
if (-not $port) { $port = "3000" }
$url = "http://localhost:$port"

Write-Step "Warte, bis die Anwendung bereit ist"
$ok = $false
for ($i = 0; $i -lt 120; $i++) {
  try { $r = Invoke-WebRequest -Uri "$url/anmelden" -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch { }
  Start-Sleep -Seconds 3
}
if (-not $ok) { Write-Host "Die Anwendung antwortet noch nicht. Status pruefen mit: docker compose logs app" -ForegroundColor Yellow; Read-Host "Enter zum Beenden"; exit 1 }

Write-Host ""
Write-Host "VersicherungsPilot laeuft: $url" -ForegroundColor Green
Write-Host "Tipp: Im Browser (Edge/Chrome) ueber 'App installieren' als Programm ins Startmenue aufnehmen."
Start-Process $url
