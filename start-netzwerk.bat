@echo off
REM ============================================================
REM  AutoFaszination Performance & B2B Sales Suite v3.1
REM  NETZWERK-STARTER fuer Handy / Tablet:
REM  - Startet den Server im Netzwerkmodus (alle Geraete im
REM    selben WLAN koennen die Suite im Browser oeffnen)
REM  - Zeigt einen QR-Code an: einfach mit der Handy-Kamera
REM    scannen und die Suite oeffnet sich auf dem Handy
REM
REM  Perfekt fuer die Demo beim Chef: Am Windows-PC starten,
REM  QR scannen, fertig. (iPhone und Android, kein Setup noetig.)
REM ============================================================
chcp 65001 >nul

REM --- Netzwerkmodus aktivieren und den normalen Starter nutzen ---
set "AF_LAN=1"
call "%~dp0start.bat"
