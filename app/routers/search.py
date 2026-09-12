"""Router: Globale Suche (/api/v1/search) — V4.1.

GET ?q=… : durchsucht Fahrzeuge · Kunden/Offerten · Partner · Termine · Rechnungen
(für die Command-Palette Ctrl+K).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Appointment, Customer, Employee, Invoice, Partner, Quote, Vehicle
from ..security import get_current_employee

router = APIRouter(prefix="/search", tags=["Suche"])


@router.get("")
def global_search(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    term = (q or "").strip().lower()
    if len(term) < 2:
        return {"q": term, "groups": [], "total": 0}

    like = f"%{term}%"

    # ─── Fahrzeuge ──────────────────────────────────────────────────────
    vehicles = (
        db.query(Vehicle)
        .filter(or_(
            Vehicle.brand.ilike(like), Vehicle.model.ilike(like),
            Vehicle.engine.ilike(like), Vehicle.product_code.ilike(like),
        ))
        .limit(6)
        .all()
    )

    # ─── Kunden & Offerten ──────────────────────────────────────────────
    term_like = or_(
        Customer.name.ilike(like), Customer.city.ilike(like),
        Customer.zip.ilike(like), Customer.email.ilike(like),
        Quote.note.ilike(like),
    )
    if term.isdigit():
        term_like = or_(term_like, Quote.ref_number == int(term))
    quotes = (
        db.query(Quote)
        .join(Customer)
        .filter(term_like)
        .order_by(Quote.created_at.desc())
        .limit(6)
        .all()
    )

    # ─── Partner ────────────────────────────────────────────────────────
    partners = (
        db.query(Partner)
        .filter(or_(
            Partner.company.ilike(like), Partner.city.ilike(like),
            Partner.zip.ilike(like), Partner.canton.ilike(like),
        ))
        .limit(6)
        .all()
    )

    # ─── Termine ────────────────────────────────────────────────────────
    appointments = (
        db.query(Appointment)
        .filter(or_(
            Appointment.title.ilike(like), Appointment.customer_name.ilike(like),
        ))
        .order_by(Appointment.start_at.asc())
        .limit(5)
        .all()
    )

    # ─── Rechnungen ─────────────────────────────────────────────────────
    invoices = (
        db.query(Invoice)
        .filter(or_(
            Invoice.invoice_number.ilike(like), Invoice.customer_name.ilike(like),
        ))
        .limit(5)
        .all()
    )

    def _appt_subtitle(a: Appointment) -> str:
        when = a.start_at.strftime("%d. %b %H:%M")
        return f"{a.customer_name} · {when} · {a.status}"

    groups = [
        {
            "key": "fahrzeuge",
            "label": "Fahrzeuge",
            "items": [{
                "id": v.id,
                "title": f"{v.brand} {v.model}",
                "subtitle": f"{v.engine} · {v.hp_orig} → {v.hp_tuned} PS · {v.price:,.0f} CHF".replace(",", "'"),
                "view": "fahrzeuge",
            } for v in vehicles],
        },
        {
            "key": "kunden",
            "label": "Kunden & Offerten",
            "items": [{
                "id": qt.id,
                "title": qt.customer.name,
                "subtitle": f"Offerte #{qt.ref_number} · {qt.customer.city or ''} · {qt.total:,.0f} CHF · {qt.status}".replace(",", "'"),
                "view": "kunden",
            } for qt in quotes],
        },
        {
            "key": "partner",
            "label": "Partner-Garagen",
            "items": [{
                "id": p.id,
                "title": p.company,
                "subtitle": f"{p.zip} {p.city} · Priorität {p.priority} · {', '.join(p.brands[:4])}",
                "view": "partner",
            } for p in partners],
        },
        {
            "key": "termine",
            "label": "Termine",
            "items": [{
                "id": a.id,
                "title": a.title,
                "subtitle": _appt_subtitle(a),
                "view": "termine",
            } for a in appointments],
        },
        {
            "key": "rechnungen",
            "label": "Rechnungen",
            "items": [{
                "id": i.id,
                "title": i.invoice_number,
                "subtitle": f"{i.customer_name} · {i.total:,.0f} CHF · {i.status}".replace(",", "'"),
                "view": "rechnungen",
            } for i in invoices],
        },
    ]
    groups = [g for g in groups if g["items"]]

    return {
        "q": term,
        "groups": groups,
        "total": sum(len(g["items"]) for g in groups),
    }
