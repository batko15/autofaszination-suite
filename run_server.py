#!/usr/bin/env python3
"""
AutoFaszination Performance & B2B Sales Suite
Universeller Server-Starter — lauffähig auf Windows, Linux und macOS.

Aufrufbeispiele:
    python run_server.py                # Standard: http://127.0.0.1:8000
    python run_server.py --port 9000    # Anderer Port
    python run_server.py --no-browser   # Browser nicht automatisch öffnen
    python run_server.py --reload       # Entwicklungsmodus (Auto-Reload)
"""
import argparse
import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

APP_NAME = "AutoFaszination Performance & B2B Sales Suite"
VERSION = "3.0.0"


def _utf8_console() -> None:
    """Konsole auf UTF-8 umstellen (für Umlaute unter Windows)."""
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


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


def open_browser_later(url: str) -> None:
    def _run() -> None:
        time.sleep(1.6)
        try:
            webbrowser.open(url)
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()


def main() -> None:
    _utf8_console()
    ap = argparse.ArgumentParser(description=f"{APP_NAME} v{VERSION}")
    ap.add_argument("--host", default="127.0.0.1", help="Bind-Adresse (Standard 127.0.0.1)")
    ap.add_argument("--port", type=int, default=int(os.environ.get("AF_PORT", "8000")),
                    help="Port (Standard 8000; falls belegt, wird automatisch ein freier gewählt)")
    ap.add_argument("--no-browser", action="store_true", help="Browser nicht automatisch öffnen")
    ap.add_argument("--reload", action="store_true", help="Entwicklungsmodus mit Auto-Reload")
    args = ap.parse_args()

    port = find_free_port(args.port)
    if port != args.port:
        print(f"HINWEIS: Port {args.port} ist belegt — es wird Port {port} verwendet.")

    url = f"http://{args.host}:{port}"
    print()
    print("=" * 62)
    print(f"  {APP_NAME}  v{VERSION}")
    print("  Schnell & Friends GmbH · AutoFaszination · Neuenhof AG")
    print("=" * 62)
    print(f"  Mitarbeiter-Oberfläche : {url}")
    print(f"  API-Dokumentation      : {url}/docs")
    print(f"  Datenbank              : {ROOT / 'data' / 'db.sqlite3'}")
    print("=" * 62)
    print("  Beenden: Strg+C")
    print()

    if not args.no_browser:
        open_browser_later(url)

    import uvicorn
    uvicorn.run("app.main:app", host=args.host, port=port, reload=args.reload, log_level="info")


if __name__ == "__main__":
    main()
