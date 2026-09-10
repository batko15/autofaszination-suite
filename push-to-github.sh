#!/usr/bin/env bash
# ============================================================
#  AutoFaszination Suite → GitHub hochladen (Linux/macOS)
#
#  Verwendung:
#    1. Auf github.com einen Personal Access Token erstellen
#       (Settings → Developer settings → Personal access tokens →
#        "Generate new token (classic)", Scope: repo)
#    2. Token hier einsetzen oder als Umgebungsvariable übergeben:
#         GITHUB_TOKEN=ghp_xxxxxxxx ./push-to-github.sh
# ============================================================
set -e
cd "$(dirname "$0")"

REPO_NAME="${REPO_NAME:-autofaszination-suite}"
REPO_DESC="AutoFaszination Performance & B2B Sales Suite V3.1 — Mitarbeiter-Portal «Carbon Cockpit» (FastAPI, offline-fähig), LET26 Chiptuning Vertrieb, Windows/Linux/Android-Starter"
TOKEN="${GITHUB_TOKEN:-HIER_TOKEN_EINFUEGEN}"

if [ "$TOKEN" = "HIER_TOKEN_EINFUEGEN" ]; then
    echo "FEHLER: Bitte oben in dieser Datei deinen GitHub-Token einsetzen"
    echo "        (oder starten mit:  GITHUB_TOKEN=ghp_xxx ./push-to-github.sh)"
    exit 1
fi

echo "Prüfe Token ..."
USER=$(curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | grep '"login"' | head -1 | sed 's/.*: "\(.*\)",*/\1/')
if [ -z "$USER" ]; then
    echo "FEHLER: Token ist ungültig."
    exit 1
fi
echo "Angemeldet als: $USER"

echo "Erstelle Repository $REPO_NAME (falls es noch nicht existiert) ..."
curl -s -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false}" > /dev/null || true

git init -q 2>/dev/null || true
git add -A
git commit -q -m "AutoFaszination Performance & B2B Sales Suite v2.0 — Mitarbeiter-Portal (FastAPI + React + Tailwind)" || true
git branch -M main 2>/dev/null || true

git remote remove origin 2>/dev/null || true
git remote add origin "https://$TOKEN@github.com/$USER/$REPO_NAME.git"
echo "Pushe nach github.com/$USER/$REPO_NAME ..."
git push -u origin main

git remote set-url origin "https://github.com/$USER/$REPO_NAME.git"
echo
echo "FERTIG: https://github.com/$USER/$REPO_NAME"
echo "HINWEIS: Bitte den Token nach dem Push auf github.com widerrufen (er steht in der Shell-History)."
