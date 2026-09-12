"""[BRAND]-Suite — globale Konfiguration, Pfade und Firmen-Stammdaten.

WHITE-LABEL: Das Wörterbuch BRANDING weiter unten ist die EINE Stelle,
um die Suite für ein anderes Projekt umzubenennen (Name, Tagline,
Login-Texte, Footer). Siehe TEMPLATE-GUIDE.md im Repo-Root.
Akzentfarbe: app/static/assets/css/af.css → Block «Design-Tokens».
"""
from pathlib import Path

APP_NAME = "AutoFaszination Performance & B2B Sales Suite"
APP_VERSION = "5.0.0"

# ─── WHITE-LABEL-KONFIGURATION (für andere Projekte hier abändern) ─────────
BRANDING = {
    "version": "5.0.0",
    "brand": {
        # nameParts: Teil 1 normal, Teil 2 in Akzentfarbe
        "nameParts": ["Auto", "Faszination"],
        "tagline": "Performance & B2B Sales Suite",
    },
    "login": {
        "eyebrow": "LET26 Performance Platform",
        "lead": (
            "Das Mitarbeiter-Portal für die LET26-Produktlinie: Fahrzeug-Konfigurator, "
            "Schweizer Offerten mit 8,1 % MwSt., B2B-Partner-Routing über 415 Markenhäuser "
            "und das Vertriebs-Cockpit mit Follow-up-Automatik — alles in einem Cockpit."
        ),
        "facts": [
            {"v": "415", "l": "Markenhäuser"},
            {"v": "68", "l": "Fahrzeuge"},
            {"v": "8,1 %", "l": "CH-MwSt."},
            {"v": "T1·3·7", "l": "Follow-up"},
        ],
        "footNote": "Schnell & Friends GmbH · Neuenhof AG · Swiss Made",
    },
    "shell": {
        "brandMark": "AF",  # Kürzel im Sidebar-Logo (2 Buchstaben)
        "legal": "LET26 · Motor- & Gaspedaloptimierung · Swiss Made",
        "live": "LET26 aktiv",
    },
}

# ─── Pfade (absolut, unabhängig vom Arbeitsverzeichnis) ─────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
QUOTES_DIR = DATA_DIR / "offerten"
BEISPIELE_DIR = DATA_DIR / "beispiele"
STATIC_DIR = Path(__file__).resolve().parent / "static"
DB_PATH = DATA_DIR / "db.sqlite3"
SECRET_PATH = DATA_DIR / ".secret"

for _d in (DATA_DIR, QUOTES_DIR, BEISPIELE_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ─── Firmen-Stammdaten (Quelle: Offerten-Vorlage 10900) ──────────────────────
COMPANY = {
    "name": "Schnell & Friends GmbH",
    "street": "Seestrasse 14b",
    "city": "5432 Neuenhof/AG",
    "tel": "+41 44 552 28 28",
    "fax": "+41 44 552 28 88",
    "email": "info@autofaszination.ch",
    "web": "www.autofaszination.ch",
    "salesContact": "Ümit Sapmaz",
    "b2bContact": "Mischa Huser",
    "management": "Adrian Schnell (Geschäftsführung)",
}

# ─── LET26-Vertriebs-Roadmap (Potentialanalyse, 10. September 2026) ──────────
ROADMAP = {
    "markenhaeuserTotal": 433,
    "mitAnsprechperson": 256,
    "adressierbareFahrzeuge": 736_024,
    "endkundenPotenzialChf": 88_000_000,
    "wellen": [
        {"welle": 1, "regionen": "AG + ZH", "kantone": ["AG", "ZH"], "zielHaeuser": 94},
        {"welle": 2, "regionen": "BE + LU", "kantone": ["BE", "LU"], "zielHaeuser": 87},
        {"welle": 3, "regionen": "VD + FR", "kantone": ["VD", "FR"], "zielHaeuser": 64},
        {"welle": 4, "regionen": "SG + TI + Rest", "kantone": [], "zielHaeuser": 188},
    ],
}
