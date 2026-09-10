@echo off
REM ============================================================
REM  AutoFaszination Suite -> GitHub hochladen (Windows)
REM
REM  Verwendung:
REM    1. Auf github.com einen Personal Access Token erstellen
REM       (Settings - Developer settings - Personal access tokens -
REM        "Generate new token (classic)", Scope: repo)
REM    2. Token hier einsetzen (Zeile unten mit HIER_TOKEN_EINFUEGEN)
REM ============================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "REPO_NAME=autofaszination-suite"
set "REPO_DESC=AutoFaszination Performance & B2B Sales Suite - Mitarbeiter-Portal (FastAPI + React), LET26 Chiptuning Vertrieb"
set "TOKEN=HIER_TOKEN_EINFUEGEN"

if "%TOKEN%"=="HIER_TOKEN_EINFUEGEN" (
    echo FEHLER: Bitte in dieser Datei deinen GitHub-Token bei TOKEN= einsetzen.
    pause
    exit /b 1
)

echo Pruefe Token ...
curl -s -H "Authorization: token %TOKEN%" https://api.github.com/user > "%TEMP%\gh_user.json"
findstr /C:"\"login\"" "%TEMP%\gh_user.json" > "%TEMP%\gh_login.txt" 2>nul
if errorlevel 1 (
    echo FEHLER: Token ist ungueltig.
    pause
    exit /b 1
)
for /f "tokens=2 delims=:," %%a in (%TEMP%\gh_login.txt) do set "USER=%%~a"
set "USER=%USER: =%"
echo Angemeldet als: %USER%

echo Erstelle Repository %REPO_NAME% ...
curl -s -X POST -H "Authorization: token %TOKEN%" -H "Accept: application/vnd.github+json" ^
    https://api.github.com/user/repos ^
    -d "{\"name\":\"%REPO_NAME%\",\"description\":\"%REPO_DESC%\",\"private\":false}" > nul

git init
git add -A
git commit -m "AutoFaszination Performance & B2B Sales Suite v2.0 - Mitarbeiter-Portal (FastAPI + React + Tailwind)"
git branch -M main

git remote remove origin 2>nul
git remote add origin "https://%TOKEN%@github.com/%USER%/%REPO_NAME%.git"
echo Pushe nach github.com/%USER%/%REPO_NAME% ...
git push -u origin main

git remote set-url origin "https://github.com/%USER%/%REPO_NAME%.git"
echo.
echo FERTIG: https://github.com/%USER%/%REPO_NAME%
echo HINWEIS: Bitte den Token nach dem Push auf github.com widerrufen.
pause
