"""AutoFaszination Suite — Follow-up-Sequenz nach LET26-Vertriebs-Guide (Tag 1 / 3 / 7).

Skript-Snippets aus «Leitfaden Mischa» (Gradliniges Verkaufssystem LET26).
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List

FOLLOWUP_SEQUENCE: List[Dict[str, Any]] = [
    {
        "dayOffset": 1,
        "action": "Tag 1 — Telefonat: Offerte kurz durchgehen, Einwände behandeln",
        "channel": "Telefon",
        "script": (
            "«Ich schicke Ihnen das Ganze so zu — Einbauanleitung und Originalstecker sind mit dabei. "
            "Habe ich alles richtig zusammengefasst, oder sollen wir noch etwas anpassen?»"
        ),
    },
    {
        "dayOffset": 3,
        "action": "Tag 3 — E-Mail: Nutzen vertiefen (Marge CHF 350+ / 15 Min. Einbau)",
        "channel": "E-Mail",
        "script": (
            "«Kurze Erinnerung: Bei ca. 15 Minuten Einbauzeit entspricht das über CHF 1'400 Ertrag pro Arbeitsstunde. "
            "Mit der Zürich-Versicherung ist die Motorgarantie abgesichert. Sollen wir das erste Fahrzeug zusammen machen?»"
        ),
    },
    {
        "dayOffset": 7,
        "action": "Tag 7 — Telefonat: Abschluss oder Nachfassen (Türöffner Gaspedaloptimierung)",
        "channel": "Telefon",
        "script": (
            "«Wir haben neu auch Gaspedaltuning, welches bei der ESA gelistet ist — eintragungsfrei, UVP CHF 490. "
            "Falls für Sie alles klar ist: Gut, dann schicke ich Ihnen das Ganze definitiv so zu.»"
        ),
    },
]


def build_followup_dates(quote_created: datetime) -> List[Dict[str, Any]]:
    """Fälligkeitszeiten: Tag 1 / 3 / 7, jeweils um 09:30."""
    out = []
    for f in FOLLOWUP_SEQUENCE:
        due = quote_created + timedelta(days=f["dayOffset"])
        due = due.replace(hour=9, minute=30, second=0, microsecond=0)
        out.append({**f, "dueAt": due})
    return out
