"""AutoFaszination Suite — Geo-Routing: PLZ → nächste Partner-Garage.

Approximative Zonen-Zentren je PLZ-Präfix (erste 2 Ziffern) + Haversine-Distanz.
Marke des Kunden-Fahrzeugs bringt einen Distanz-Bonus (Markenhaus bevorzugt).
"""
import math
from typing import Any, Dict, List, Optional, Tuple

# ─── Zonen-Zentren je PLZ-Präfix (erste 2 Ziffern) ───────────────────────────
PLZ_ZONES: Dict[str, Tuple[float, float]] = {
    "10": (46.21, 6.15), "11": (46.22, 6.12), "12": (46.25, 6.10), "13": (46.26, 6.09),
    "14": (46.78, 6.64), "15": (46.82, 6.94), "16": (46.62, 7.06), "17": (46.80, 7.15),
    "18": (46.46, 6.85), "19": (46.25, 6.95),
    "20": (46.99, 6.93), "21": (47.05, 6.88), "22": (47.02, 6.85), "23": (47.10, 6.82),
    "24": (47.06, 6.74), "25": (47.14, 7.24), "26": (47.15, 7.00), "27": (47.28, 7.37),
    "28": (47.36, 7.35), "29": (47.42, 7.07),
    "30": (46.95, 7.45), "31": (46.88, 7.55), "32": (46.95, 7.12), "33": (47.10, 7.55),
    "34": (47.06, 7.62), "35": (46.90, 7.60), "36": (46.76, 7.63), "37": (46.65, 7.68),
    "38": (46.69, 7.87), "39": (46.29, 7.98),
    "40": (47.56, 7.60), "41": (47.53, 7.62), "42": (47.42, 7.55), "43": (47.55, 7.79),
    "44": (47.48, 7.73), "45": (47.21, 7.54), "46": (47.35, 7.90), "47": (47.28, 7.80),
    "48": (47.48, 7.97), "49": (47.25, 7.80),
    "50": (47.39, 8.05), "51": (47.45, 8.15), "52": (47.48, 8.20), "53": (47.49, 8.28),
    "54": (47.47, 8.34), "55": (47.33, 8.28), "56": (47.35, 8.25), "57": (47.30, 8.12),
    "58": (47.25, 8.05), "59": (47.25, 8.05),
    "60": (47.05, 8.30), "61": (47.12, 8.02), "62": (47.18, 8.10), "63": (47.15, 8.45),
    "64": (46.90, 8.60), "65": (46.19, 9.02), "66": (47.15, 8.50), "67": (46.40, 8.85),
    "68": (45.87, 8.98), "69": (46.00, 8.95),
    "70": (46.85, 9.53), "71": (46.78, 9.20), "72": (46.97, 9.55), "73": (47.05, 9.45),
    "74": (46.70, 9.42), "75": (46.50, 9.90), "77": (46.33, 10.05),
    "80": (47.38, 8.54), "81": (47.32, 8.52), "82": (47.35, 8.70), "83": (47.44, 8.60),
    "84": (47.50, 8.72), "85": (47.55, 9.05), "86": (47.27, 8.80), "87": (47.22, 8.83),
    "88": (47.20, 8.90), "89": (47.10, 9.35),
    "90": (47.45, 9.30), "91": (47.39, 9.28), "92": (47.40, 9.10), "93": (47.55, 8.90),
    "94": (47.35, 9.50), "95": (47.46, 9.04), "96": (47.30, 9.09),
}

# Kanton-Zentren als Fallback
CANTON_CENTERS: Dict[str, Tuple[float, float]] = {
    "AG": (47.42, 8.21), "ZH": (47.38, 8.54), "BE": (46.93, 7.55), "VD": (46.60, 6.55),
    "SG": (47.25, 9.05), "TI": (46.30, 8.80), "LU": (47.09, 8.10), "FR": (46.70, 7.10),
    "VS": (46.21, 7.60), "TG": (47.55, 9.05), "SO": (47.30, 7.60), "BL": (47.45, 7.70),
    "BS": (47.56, 7.60), "SZ": (47.03, 8.65), "AR": (47.32, 9.25), "AI": (47.32, 9.40),
    "UR": (46.65, 8.60), "GL": (47.00, 9.10), "ZG": (47.15, 8.50), "NE": (46.95, 6.85),
    "GE": (46.20, 6.10), "JU": (47.35, 7.15), "SH": (47.70, 8.60), "GR": (46.65, 9.58),
    "NW": (46.95, 8.35), "OW": (46.85, 8.25), "FL": (47.15, 9.55),
}

BRAND_BONUS_KM = 15.0  # Markenhaus mit passender Marke wird bevorzugt


def _jitter(zip_code: str) -> Tuple[float, float]:
    """Deterministischer Jitter (± ca. 3 km), damit Häuser derselben Zone nicht identisch liegen."""
    h = 0
    for ch in zip_code:
        h = (h * 31 + ord(ch)) % 1000
    d_lat = ((h % 100) / 100 - 0.5) * 0.05
    d_lng = (((h // 100) % 100) / 100 - 0.5) * 0.07
    return d_lat, d_lng


def plz_to_coords(zip_code: str, canton: Optional[str] = None) -> Tuple[float, float]:
    digits = "".join(c for c in (zip_code or "") if c.isdigit())[:2]
    base = PLZ_ZONES.get(digits) or CANTON_CENTERS.get((canton or "").upper()) or CANTON_CENTERS["AG"]
    d_lat, d_lng = _jitter(zip_code or "0")
    return base[0] + d_lat, base[1] + d_lng


def distance_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    r = 6371.0
    d_lat = math.radians(b[0] - a[0])
    d_lng = math.radians(b[1] - a[1])
    la1 = math.radians(a[0])
    la2 = math.radians(b[0])
    h = math.sin(d_lat / 2) ** 2 + math.sin(d_lng / 2) ** 2 * math.cos(la1) * math.cos(la2)
    return 2 * r * math.asin(math.sqrt(h))


def is_valid_ch_zip(zip_code: str) -> bool:
    return bool(zip_code) and zip_code.strip().isdigit() and len(zip_code.strip()) == 4 and zip_code.strip()[0] != "0"


def route_partners(partners: List[Any], zip_code: str, brand: Optional[str] = None, top: int = 5) -> List[Dict[str, Any]]:
    """Sortiert Partner nach effektiver Distanz zur Kunden-PLZ (Marken-Bonus berücksichtigt)."""
    if not is_valid_ch_zip(zip_code):
        return []
    origin = plz_to_coords(zip_code)
    brand_lower = (brand or "").strip().lower()
    results: List[Dict[str, Any]] = []
    for p in partners:
        if not getattr(p, "active", True):
            continue
        p_coords = plz_to_coords(p.zip, p.canton)
        dist = distance_km(origin, p_coords)
        brands = [str(b).lower() for b in (p.brands or [])]
        brand_match = bool(brand_lower and brand_lower in brands)
        effective = max(0.5, dist - BRAND_BONUS_KM) if brand_match else dist
        results.append({
            "partner": p,
            "distanceKm": round(dist, 1),
            "effectiveKm": round(effective, 1),
            "brandMatch": brand_match,
        })
    results.sort(key=lambda r: (r["effectiveKm"], -(r["partner"].capacity - r["partner"].capacity_used)))
    return results[:top]
