#!/usr/bin/env python3
"""Erstellt Beispieldateien für den Datenimport (JSON + XLSX) in data/beispiele/."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from openpyxl import Workbook

from app.config import DATA_DIR

BEISPIELE = DATA_DIR / "beispiele"
BEISPIELE.mkdir(parents=True, exist_ok=True)

# ─── Fahrzeuge-Beispiele (Import-Format: camelCase oder deutsch) ─────────────
fahrzeuge = [
    {
        "brand": "Toyota", "model": "Corolla Touring Sports", "engine": "1.8 Hybrid (122 PS)",
        "fuel": "hybrid", "euroNorm": "Euro 6d", "years": "2019-2026",
        "hpOrig": 122, "nmOrig": 142, "hpTuned": 140, "nmTuned": 166,
        "fuelSaving": 8, "price": 1290, "productCode": "K", "installMin": 20,
    },
    {
        "brand": "Peugeot", "model": "308", "engine": "1.5 BlueHDi (130 PS)",
        "fuel": "diesel", "euroNorm": "Euro 6d", "years": "2021-2026",
        "hpOrig": 130, "nmOrig": 300, "hpTuned": 160, "nmTuned": 360,
        "fuelSaving": 10, "price": 990, "productCode": "DA", "installMin": 15,
    },
    {
        "brand": "Opel", "model": "Astra", "engine": "1.2 Turbo (130 PS)",
        "fuel": "benzin", "euroNorm": "Euro 6d", "years": "2022-2026",
        "hpOrig": 130, "nmOrig": 230, "hpTuned": 155, "nmTuned": 275,
        "fuelSaving": 8, "price": 1090, "productCode": "BA", "installMin": 15,
    },
]

# ─── Markenhäuser-Beispiele ──────────────────────────────────────────────────
haeuser = [
    {
        "company": "Garage Beispiel AG", "brands": ["Toyota", "Lexus"],
        "primaryBrand": "Toyota", "contactPerson": "Frau Beispiel",
        "street": "Beispielstrasse 1", "zip": "8001", "city": "Zürich",
        "canton": "ZH", "country": "CH", "phone": "+41 44 000 00 00",
        "email": "info@garage-beispiel.ch", "website": "https://www.garage-beispiel.ch",
        "priority": "A", "capacityVehiclesPerMonth": 10,
    },
    {
        "company": "Auto Beispiel Bern GmbH", "brands": ["Peugeot", "Opel"],
        "primaryBrand": "Peugeot", "contactPerson": "",
        "street": "Beispielweg 5", "zip": "3011", "city": "Bern",
        "canton": "BE", "country": "CH", "phone": "+41 31 000 00 00",
        "email": "", "website": "", "priority": "B", "capacityVehiclesPerMonth": 5,
    },
]

# JSON schreiben
(BEISPIELE / "fahrzeuge_beispiel.json").write_text(
    json.dumps(fahrzeuge, ensure_ascii=False, indent=2), encoding="utf-8")
(BEISPIELE / "markenhaeuser_beispiel.json").write_text(
    json.dumps(haeuser, ensure_ascii=False, indent=2), encoding="utf-8")

# XLSX schreiben
def write_xlsx(path, rows, headers):
    wb = Workbook()
    ws = wb.active
    ws.title = "Import"
    ws.append(headers)
    for row in rows:
        values = []
        for h in headers:
            v = row.get(h, "")
            if isinstance(v, list):
                v = "; ".join(str(x) for x in v)
            values.append(v)
        ws.append(values)
    for col in "ABCDEFGHIJKLMNOP":
        ws.column_dimensions[col].width = 22
    wb.save(path)

write_xlsx(BEISPIELE / "fahrzeuge_beispiel.xlsx", fahrzeuge,
           ["brand", "model", "engine", "fuel", "euroNorm", "years", "hpOrig", "nmOrig",
            "hpTuned", "nmTuned", "fuelSaving", "price", "productCode", "installMin"])

write_xlsx(BEISPIELE / "markenhaeuser_beispiel.xlsx", haeuser,
           ["company", "brands", "primaryBrand", "contactPerson", "street", "zip", "city",
            "canton", "country", "phone", "email", "website", "priority", "capacityVehiclesPerMonth"])

print("Beispieldateien erstellt:")
for f in sorted(BEISPIELE.iterdir()):
    print(f"  {f.name} ({f.stat().st_size} Bytes)")
