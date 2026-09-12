"""White-Label-Branding-Endpoint — liefert die Konfiguration aus config.py.

Das Frontend (af-app.js) lädt diese Werte beim Start und rendert Marke,
Version und Texte dynamisch — so reicht für ein Rebrand eine Änderung in
config.py (BRANDING-Dict), ohne den JS/CSS-Code anzufassen.
"""
from fastapi import APIRouter

from ..config import BRANDING, APP_NAME, APP_VERSION

router = APIRouter(tags=["branding"])


@router.get("/branding")
def get_branding() -> dict:
    """White-Label-Konfiguration für das Frontend (Name, Tagline, Texte)."""
    return {
        "appName": APP_NAME,
        "appVersion": APP_VERSION,
        **BRANDING,
    }
