@echo off
REM ============================================================
REM  AutoFaszination Performance & B2B Sales Suite v2.0
REM  Windows-Starter: Richtet Umgebung ein und startet Server
REM  Web-Oberflaeche: http://127.0.0.1:8000
REM ============================================================
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "PORT=8000"
if defined AF_PORT set "PORT=%AF_PORT%"

echo.
echo ================================================================
echo   AutoFaszination Performance ^& B2B Sales Suite
echo   Schnell ^& Friends GmbH - Mitarbeiter-Portal
echo ================================================================
echo.

REM --- Python suchen (python oder py) ---
set "PY="
python --version >nul 2>&1 && set "PY=python"
if not defined PY (
    py -3 --version >nul 2>&1 && set "PY=py -3"
)
if not defined PY (
    echo FEHLER: Python 3.10+ wurde nicht gefunden.
    echo Bitte von https://www.python.org/downloads/ installieren
    echo und "Add Python to PATH" aktivieren. Danach erneut starten.
    echo.
    pause
    exit /b 1
)
echo Python gefunden:
%PY% --version

REM --- Virtuelle Umgebung einrichten (nur beim ersten Start) ---
if not exist ".venv\Scripts\python.exe" (
    echo.
    echo Erstelle virtuelle Umgebung .venv ...
    %PY% -m venv .venv
    if errorlevel 1 (
        echo FEHLER: Konnte keine virtuelle Umgebung erstellen.
        pause
        exit /b 1
    )
)

REM --- Abhaengigkeiten installieren / pruefen ---
echo.
echo Pruefe/installiere Pakete (fast beim 2. Start) ...
".venv\Scripts\python.exe" -m pip install --quiet --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
    echo FEHLER: Paketinstallation fehlgeschlagen - bitte Internetverbindung pruefen.
    pause
    exit /b 1
)

REM --- Server starten (oeffnet Browser automatisch) ---
echo.
echo Starte Server auf http://127.0.0.1:%PORT% ...
echo Browser oeffnet sich automatisch. Beenden mit Strg+C.
echo.
".venv\Scripts\python.exe" run_server.py --port %PORT%
pause
