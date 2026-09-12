#!/usr/bin/env python3
"""
AutoFaszination Performance & B2B Sales Suite
Universeller Server-Starter — lauffähig auf Windows, Linux, macOS und Android (Termux).

Aufrufbeispiele:
    python run_server.py                 # Standard: http://127.0.0.1:8000
    python run_server.py --port 9000     # Anderer Port
    python run_server.py --lan           # Im Netzwerk freigeben (Handy/Tablet im selben WLAN)
    python run_server.py --lan --qr      # zusätzlich QR-Code für Handy-Kamera ausgeben
    python run_server.py --no-browser    # Browser nicht automatisch öffnen
    python run_server.py --reload        # Entwicklungsmodus (Auto-Reload)
"""
import argparse
import os
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

APP_NAME = "AutoFaszination Performance & B2B Sales Suite"
VERSION = "5.0.0"


def _utf8_console() -> None:
    """Konsole auf UTF-8 umstellen (für Umlaute unter Windows)."""
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def _is_termux() -> bool:
    """Erkennt Android/Termux (dort gibt es termux-open-url statt webbrowser)."""
    return "com.termux" in os.environ.get("PREFIX", "") or bool(os.environ.get("TERMUX_VERSION"))


def port_is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex((host, port)) != 0


def find_free_port(preferred: int) -> int:
    if port_is_free("127.0.0.1", preferred):
        return preferred
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def lan_ip_addresses() -> list[str]:
    """Liefert die privaten LAN-IP-Adressen dieses Geräts (z. B. 192.168.x.x)."""
    ips: list[str] = []
    # Trick: UDP-Socket an eine externe Adresse binden — die gewählte lokale
    # IP zeigt, wie das Gerät im LAN erreichbar ist (kein Traffic nötig).
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(0.6)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    if not ips:
        try:
            for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
                ip = info[4][0]
                if not ip.startswith("127.") and ip not in ips:
                    ips.append(ip)
        except Exception:
            pass
    return ips


def print_qr(url: str) -> bool:
    """Gibt einen QR-Code als ASCII-Art im Terminal aus (für Handy-Kamera)."""
    try:
        import qrcode
    except ImportError:
        return False
    qr = qrcode.QRCode(border=1)
    qr.add_data(url)
    qr.make(fit=True)
    print()
    qr.print_ascii(invert=True)
    print("  Mit der Handy-Kamera scannen → Suite im Browser öffnen.")
    return True


def open_url(url: str) -> None:
    """Öffnet eine URL — unter Android/Termux mit termux-open-url."""
    try:
        if _is_termux():
            subprocess.Popen(["termux-open-url", url],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            webbrowser.open(url)
    except Exception:
        pass


def open_browser_later(url: str) -> None:
    def _run() -> None:
        time.sleep(1.6)
        open_url(url)
    threading.Thread(target=_run, daemon=True).start()


def main() -> None:
    _utf8_console()
    ap = argparse.ArgumentParser(description=f"{APP_NAME} v{VERSION}")
    ap.add_argument("--host", default="127.0.0.1", help="Bind-Adresse (Standard 127.0.0.1)")
    ap.add_argument("--port", type=int, default=int(os.environ.get("AF_PORT", "8000")),
                    help="Port (Standard 8000; falls belegt, wird automatisch ein freier gewählt)")
    ap.add_argument("--lan", action="store_true",
                    help="Im Netzwerk freigeben (Handy/Tablet im selben WLAN, Host 0.0.0.0)")
    ap.add_argument("--qr", action="store_true",
                    help="QR-Code im Terminal ausgeben (praktisch für Handy-Kamera)")
    ap.add_argument("--no-browser", action="store_true", help="Browser nicht automatisch öffnen")
    ap.add_argument("--reload", action="store_true", help="Entwicklungsmodus mit Auto-Reload")
    args = ap.parse_args()

    if args.lan:
        args.host = "0.0.0.0"

    port = find_free_port(args.port)
    if port != args.port:
        print(f"HINWEIS: Port {args.port} ist belegt — es wird Port {port} verwendet.")

    url = f"http://127.0.0.1:{port}"
    lan_urls = [f"http://{ip}:{port}" for ip in lan_ip_addresses()] if args.host == "0.0.0.0" else []

    print()
    print("=" * 62)
    print(f"  {APP_NAME}  v{VERSION}")
    print("  Schnell & Friends GmbH · AutoFaszination · Neuenhof AG")
    print("=" * 62)
    print(f"  Mitarbeiter-Oberfläche : {url}")
    print(f"  API-Dokumentation      : {url}/docs")
    print(f"  Datenbank              : {ROOT / 'data' / 'db.sqlite3'}")
    if lan_urls:
        print("-" * 62)
        print("  NETZWERK-MODUS — Suite im selben WLAN auch auf Handy/Tablet nutzbar:")
        for u in lan_urls:
            print(f"    {u}")
    print("=" * 62)
    print("  Beenden: Strg+C")
    print()

    if args.qr or lan_urls:
        qr_url = lan_urls[0] if lan_urls else url
        if not print_qr(qr_url):
            print("  HINWEIS: QR-Code nicht verfügbar (Paket 'qrcode' fehlt).")
            print(f"           URL manuell eingeben: {qr_url}")

    if not args.no_browser:
        open_browser_later(url)

    import uvicorn
    uvicorn.run("app.main:app", host=args.host, port=port, reload=args.reload, log_level="info")


if __name__ == "__main__":
    main()
