@echo off
REM VersicherungsPilot starten (Doppelklick). Voraussetzung: Docker Desktop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\start.ps1"
pause
