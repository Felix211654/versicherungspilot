@echo off
REM VersicherungsPilot beenden. Deine Daten bleiben erhalten.
cd /d "%~dp0"
docker compose stop
echo VersicherungsPilot wurde beendet. Daten bleiben erhalten.
pause
