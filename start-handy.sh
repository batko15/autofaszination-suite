#!/usr/bin/env bash
# ============================================================
#  AutoFaszination Performance & B2B Sales Suite v3.1
#  HANDY-STARTER für Android (Termux)
#
#  Richtet auf dem Handy alles Nötige ein und startet den Server.
#  Die Suite läuft dann komplett offline auf dem Handy:
#       http://127.0.0.1:8000
#
#  EINRICHTUNG (einmalig, ca. 5–10 Minuten):
#   1. Die App «Termux» aus F-Droid installieren:
#         https://f-droid.org/packages/com.termux/
#      (WICHTIG: die Play-Store-Version ist veraltet und
#       funktioniert nicht — bitte unbedingt F-Droid nehmen!)
#   2. Termux öffnen und eingeben:
#         pkg install -y git
#         git clone https://github.com/batko15/autofaszination-suite.git
#         cd autofaszination-suite
#   3. Suite starten:
#         bash start-handy.sh
#
#  Danach jederzeit ohne Internet nutzbar — einfach wieder
#  «bash start-handy.sh» (startet in wenigen Sekunden).
#
#  HINWEIS ZU iPHONE/iPAD: iOS erlaubt keine lokalen Python-Server.
#  Dort die Suite vom Windows-PC aus nutzen: «start-netzwerk.bat»
#  starten und den QR-Code mit der iPhone-Kamera scannen.
# ============================================================
set -e
cd "$(dirname "$0")"

PORT="${AF_PORT:-8000}"

echo
echo "================================================================"
echo "  AutoFaszination Performance & B2B Sales Suite v3.1"
echo "  Handy-Modus (Android/Termux) — Schnell & Friends GmbH"
echo "================================================================"
echo

# --- Termux erkennen ---
IS_TERMUX=0
if [ -d "/data/data/com.termux" ] || command -v termux-info >/dev/null 2>&1; then
    IS_TERMUX=1
    echo "Termux erkannt — optimal, weiter geht's."
    echo
fi

# --- Python suchen / installieren ---
PY=""
for candidate in python python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
        if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null; then
            PY="$candidate"
            break
        fi
    fi
done

if [ -z "$PY" ]; then
    if [ "$IS_TERMUX" = "1" ] && command -v pkg >/dev/null 2>&1; then
        echo "Python nicht gefunden — installiere Python (+ Build-Werkzeuge) ..."
        echo "(das dauert beim ersten Mal einige Minuten)"
        pkg update -y || true
        pkg install -y python rust binutils clang
        PY="python"
    else
        echo "FEHLER: Python 3.9+ wurde nicht gefunden."
        echo "Unter Termux:  pkg install -y python rust binutils clang"
        echo "Unter Linux :  sudo apt install python3 python3-venv python3-pip"
        exit 1
    fi
fi
echo "Python gefunden: $($PY --version 2>&1)"

# --- Abhängigkeiten installieren (schnell, wenn schon vorhanden) ---
echo
echo "Prüfe/installiere Pakete (beim ersten Start einige Minuten) ..."
if ! $PY -m pip install --quiet --disable-pip-version-check -r requirements.txt 2>/dev/null; then
    echo "Erneuter Versuch mit Build-Werkzeugen (rust/clang) ..."
    if [ "$IS_TERMUX" = "1" ] && command -v pkg >/dev/null 2>&1; then
        pkg install -y rust binutils clang || true
    fi
    $PY -m pip install --disable-pip-version-check -r requirements.txt
fi

# --- Server starten (öffnen Browser automatisch via termux-open-url) ---
echo
echo "Starte Server auf http://127.0.0.1:$PORT ..."
echo "Beenden: Strg+C (oder Termux-Benachrichtigung antippen)."
echo

$PY run_server.py --port "$PORT"
