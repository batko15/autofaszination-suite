#!/usr/bin/env bash
# ============================================================
#  AutoFaszination Performance & B2B Sales Suite v2.0
#  Linux/macOS-Starter: Richtet Umgebung ein und startet Server
#  Web-Oberfläche: http://127.0.0.1:8000
# ============================================================
set -e
cd "$(dirname "$0")"

PORT="${AF_PORT:-8000}"

echo
echo "================================================================"
echo "  AutoFaszination Performance & B2B Sales Suite"
echo "  Schnell & Friends GmbH — Mitarbeiter-Portal"
echo "================================================================"
echo

# --- Python suchen ---
PY=""
for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
        if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null; then
            PY="$candidate"
            break
        fi
    fi
done

if [ -z "$PY" ]; then
    echo "FEHLER: Python 3.9+ wurde nicht gefunden."
    echo "Installation z. B. mit:  sudo apt install python3 python3-venv python3-pip"
    echo "                     or:  sudo dnf install python3"
    exit 1
fi
echo "Python gefunden: $($PY --version 2>&1)"

# --- Virtuelle Umgebung einrichten (nur beim ersten Start) ---
if [ ! -x ".venv/bin/python" ]; then
    echo
    echo "Erstelle virtuelle Umgebung .venv ..."
    "$PY" -m venv .venv
fi

# --- Abhängigkeiten installieren / prüfen ---
echo
echo "Prüfe/installiere Pakete (schnell ab dem 2. Start) ..."
".venv/bin/python" -m pip install --quiet --disable-pip-version-check -r requirements.txt

# --- Server starten (öffnet Browser automatisch) ---
echo
echo "Starte Server auf http://127.0.0.1:$PORT ..."
echo "Browser öffnet sich automatisch. Beenden mit Strg+C."
echo
".venv/bin/python" run_server.py --port "$PORT"
