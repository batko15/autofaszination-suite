"""AutoFaszination Suite — globale Konfiguration, Pfade und Firmen-Stammdaten."""
from pathlib import Path

APP_NAME = "AutoFaszination Performance & B2B Sales Suite"
APP_VERSION = "3.0.0"

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
