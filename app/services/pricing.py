"""AutoFaszination Suite — Preislogik nach AF-Garagen-Preisliste CH/DE 2026.

Quellen: AF_Preisliste_CH_DE_2026.pdf (Staffelpreise, Zubehör, Serviceleistungen)
und Offerten-Struktur Offerte_10900.pdf (Porto 14.50, MwSt 8.1 %).
"""
from typing import Any, Dict, List

from ..models import Vehicle

# ─── Konditionen ─────────────────────────────────────────────────────────────
VAT_RATE = 0.081           # CH-MwSt. 8.1 %
SHIPPING_CHF = 14.50       # Porto gem. Offerten-Struktur

PRICE_LIST_2026: Dict[str, Dict[str, Any]] = {
    "DA": {"code": "DA", "name": "Diesel Komplettsatz LET26", "ekNetto": 690.0, "uvpBrutto": 990.0,
           "tiers": {1: 690.0, 3: 620.0, 5: 580.0, 10: 520.0}},
    "BA": {"code": "BA", "name": "Benzin Komplettsatz LET26", "ekNetto": 790.0, "uvpBrutto": 1090.0,
           "tiers": {1: 790.0, 3: 710.0, 5: 660.0, 10: 590.0}},
    "K":  {"code": "K", "name": "LETx Hybrid-System", "ekNetto": 890.0, "uvpBrutto": 1290.0,
           "tiers": {1: 890.0, 3: 800.0, 5: 750.0}},
    "GA": {"code": "GA", "name": "Gaspedaltuning LET26", "ekNetto": 290.0, "uvpBrutto": 490.0,
           "tiers": {1: 290.0, 3: 275.5, 5: 261.0}},
}

ZUBEHOER = [
    {"code": "KA", "name": "Kabelsatz LET26 Motoroptimierung", "ekNetto": 105.0},
    {"code": "KB", "name": "Kabelsatz LET26 Gaspedaloptimierung", "ekNetto": 85.0},
    {"code": "PA", "name": "Software LET26 Motoroptimierung", "ekNetto": 990.0},
    {"code": "PB", "name": "Software LET26 Gaspedaloptimierung", "ekNetto": 499.0},
    {"code": "PC", "name": "Update Motor- und Gaspedaloptimierung", "ekNetto": 499.0},
    {"code": "PF", "name": "Dongle Motoroptimierung", "ekNetto": 25.0},
    {"code": "TA", "name": "Onboard Schnittstelle (Dongle)", "ekNetto": 49.0},
]

SERVICELEISTUNGEN = [
    {"code": "SLA", "name": "Umprogrammierung", "ekNetto": 105.0, "uvpBrutto": 150.0},
    {"code": "SLB", "name": "Prüfung", "ekNetto": 105.0, "uvpBrutto": 150.0},
    {"code": "SLC", "name": "Gutachten", "ekNetto": 150.0, "uvpBrutto": 200.0},
    {"code": "SLD", "name": "Software Installation", "ekNetto": 90.0, "uvpBrutto": None},
    {"code": "SLE", "name": "Datenlöschung mit Zertifikat", "ekNetto": 49.0, "uvpBrutto": None},
    {"code": "SLF", "name": "Fahrzeugcheck (FIN-VIN) / Fehlercodes auslesen", "ekNetto": 39.0, "uvpBrutto": None},
]

WARRANTY_OPTIONS: Dict[str, Dict[str, Any]] = {
    "none": {"id": "none", "label": "Keine Zusatzgarantie", "price": 0.0, "months": 0},
    "z3":   {"id": "z3", "label": "Motorgarantie Zürich Versicherung — 36 Monate", "price": 290.0, "months": 36},
    "z5":   {"id": "z5", "label": "Motorgarantie Zürich Versicherung — 60 Monate", "price": 490.0, "months": 60},
}

INSTALL_OPTIONS: Dict[str, Dict[str, Any]] = {
    "self":    {"id": "self", "label": "Selbsteinbau (Plug & Play, 15–25 Min.)", "hourlyRate": 0.0},
    "partner": {"id": "partner", "label": "Einbau bei Partner-Garage vor Ort", "hourlyRate": 180.0},
}
INSTALL_MIN_CHARGE = 60.0  # Mindespreis Einbau

B2B_TIERS = [  # (ab Stück, Rabatt auf EK netto)
    (10, 0.30),
    (5, 0.27),
    (3, 0.19),
    (1, 0.00),
]


def r2(n: float) -> float:
    return round(n * 100) / 100


def chf(n: float) -> str:
    """CHF-Betrag schweizerisch formatieren: 1'290.00"""
    s = f"{n:,.2f}"
    return s.replace(",", "'")


# ─── Leistungssteigerung (Live-Rechner) ──────────────────────────────────────

def calc_performance(vehicle: Vehicle) -> Dict[str, Any]:
    hp_gain = vehicle.hp_tuned - vehicle.hp_orig
    nm_gain = vehicle.nm_tuned - vehicle.nm_orig
    return {
        "hpGain": hp_gain,
        "nmGain": nm_gain,
        "hpGainPct": round(hp_gain / vehicle.hp_orig * 100) if vehicle.hp_orig else 0,
        "nmGainPct": round(nm_gain / vehicle.nm_orig * 100) if vehicle.nm_orig else 0,
        "fuelSavingPct": vehicle.fuel_saving,
        "accelGainPct": round(hp_gain / vehicle.hp_orig * 100 * 0.8) if vehicle.hp_orig else 0,
    }


# ─── Offerten-Berechnung ─────────────────────────────────────────────────────

def _b2b_tier(qty: int):
    for min_qty, discount in B2B_TIERS:
        if qty >= min_qty:
            return min_qty, discount
    return 1, 0.0


def calc_quote(
    vehicle: Vehicle,
    warranty: str = "none",
    install: str = "self",
    channel: str = "b2c",
    b2b_qty: int = 1,
) -> Dict[str, Any]:
    """Vollständige Offerten-Berechnung: Grundpreis, Garantie, Einbau, Porto, MwSt, Total.

    Rückgabe enthält camelCase-Schlüssel (wie das JSON-Datenformat).
    """
    is_b2b = channel == "b2b"
    product = PRICE_LIST_2026.get(vehicle.product_code, PRICE_LIST_2026["BA"])

    # Grundpreis: B2C = UVP brutto, B2B = EK netto abzgl. Staffelrabatt
    unit_price = vehicle.price
    discount_pct = 0
    if is_b2b:
        tier_qty, discount = _b2b_tier(b2b_qty)
        unit_price = r2(product["ekNetto"] * (1 - discount))
        discount_pct = round(discount * 100)

    art_no = f"{vehicle.product_code}-{vehicle.brand[:2].upper()}{100 + (vehicle.hp_orig % 900)}"
    description = (
        f"{vehicle.brand} {vehicle.model}\n{product['name']}\n{vehicle.engine}\n"
        f"{vehicle.years or ''}\n{vehicle.hp_orig} » {vehicle.hp_tuned} PS / "
        f"{vehicle.nm_orig} » {vehicle.nm_tuned} Nm"
    )
    items: List[Dict[str, Any]] = [{
        "artNo": art_no,
        "description": description,
        "unit": "Stk.",
        "qty": b2b_qty if is_b2b else 1,
        "price": unit_price,
        "discountPct": discount_pct,
        "total": r2(unit_price * (b2b_qty if is_b2b else 1)),
    }]
    base_price = items[0]["total"]

    # Optionale Garantie (B2C)
    warranty_price = 0.0
    if not is_b2b and warranty in WARRANTY_OPTIONS and warranty != "none":
        opt = WARRANTY_OPTIONS[warranty]
        warranty_price = opt["price"]
        items.append({
            "artNo": f"GW-{opt['months']}",
            "description": opt["label"],
            "unit": "Stk.",
            "qty": 1,
            "price": warranty_price,
            "discountPct": 0,
            "total": warranty_price,
        })

    # Einbau durch Partner-Garage (Minutensatz, min. CHF 60)
    install_price = 0.0
    if install == "partner":
        install_price = r2(max(INSTALL_MIN_CHARGE, vehicle.install_min / 60 * INSTALL_OPTIONS["partner"]["hourlyRate"]))
        items.append({
            "artNo": "SL-INST",
            "description": f"Einbau durch Partner-Garage (ca. {vehicle.install_min} Min.)",
            "unit": "Stk.",
            "qty": 1,
            "price": install_price,
            "discountPct": 0,
            "total": install_price,
        })

    subtotal = r2(base_price + warranty_price + install_price)
    vat_amount = r2(subtotal * VAT_RATE)
    total = r2(subtotal + vat_amount + SHIPPING_CHF)

    return {
        "items": items,
        "basePrice": r2(base_price),
        "warrantyPrice": r2(warranty_price),
        "installPrice": r2(install_price),
        "shipping": SHIPPING_CHF,
        "subtotal": subtotal,
        "vatAmount": vat_amount,
        "total": total,
    }
