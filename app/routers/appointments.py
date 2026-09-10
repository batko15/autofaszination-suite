"""Router: Termine (/api/v1/appointments) — V4.1.

GET  : Termine für 2 Wochen (aktuelle + nächste, Wochenstart Montag)
POST : Neuen Termin anlegen
PATCH: Termin-Status ändern (geplant | bestaetigt | abgeschlossen | abgesagt)
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Appointment, Employee
from ..schemas import AppointmentIn, AppointmentOut, AppointmentPatchIn
from ..security import get_current_employee

router = APIRouter(prefix="/appointments", tags=["Termine"])

APPOINTMENT_TYPES = ["testfahrt", "einbau", "beratung", "followup"]


def _week_start(d: datetime) -> datetime:
    """Montag 00:00 der Kalenderwoche von d (weekday(): Montag = 0)."""
    ws = d - timedelta(days=d.weekday())
    return ws.replace(hour=0, minute=0, second=0, microsecond=0)


def _serialize(a: Appointment) -> dict:
    return {
        "id": a.id, "title": a.title, "type": a.type,
        "startAt": a.start_at, "durationMin": a.duration_min, "status": a.status,
        "customerName": a.customer_name, "customerEmail": a.customer_email,
        "customerPhone": a.customer_phone, "location": a.location, "notes": a.notes,
        "vehicle": a.vehicle and {
            "brand": a.vehicle.brand, "model": a.vehicle.model,
            "hpOrig": a.vehicle.hp_orig, "hpTuned": a.vehicle.hp_tuned,
        },
        "quote": a.quote and {"refNumber": a.quote.ref_number, "total": a.quote.total},
        "partner": a.partner and {"company": a.partner.company, "city": a.partner.city},
    }


@router.get("")
def list_appointments(
    week: Optional[str] = Query(None, description="ISO-Datum im Zielzeitraum; Default = aktuelle Woche"),
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    base = datetime.strptime(week[:10], "%Y-%m-%d") if week else datetime.now()
    ws = _week_start(base)
    we = ws + timedelta(days=14)

    rows = (
        db.query(Appointment)
        .filter(Appointment.start_at >= ws, Appointment.start_at < we)
        .order_by(Appointment.start_at.asc())
        .all()
    )

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    return {
        "weekStart": ws,
        "count": len(rows),
        "today": sum(1 for a in rows if today <= a.start_at < tomorrow),
        "byType": [
            {"type": t, "count": sum(1 for a in rows if a.type == t)}
            for t in APPOINTMENT_TYPES
        ],
        "appointments": [_serialize(a) for a in rows],
    }


@router.post("", status_code=201)
def create_appointment(
    payload: AppointmentIn,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    apt = Appointment(
        title=payload.title,
        type=payload.type,
        start_at=payload.start_at,
        duration_min=payload.duration_min,
        status="geplant",
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        location=payload.location or "Neuenhof",
        notes=payload.notes,
        vehicle_id=payload.vehicle_id,
        quote_id=payload.quote_id,
    )
    db.add(apt)
    db.commit()
    db.refresh(apt)
    return {"appointment": _serialize(apt)}


@router.patch("/{appointment_id}")
def patch_appointment(
    appointment_id: int,
    payload: AppointmentPatchIn,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    apt = db.get(Appointment, appointment_id)
    if apt is None:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden.")
    apt.status = payload.status
    db.commit()
    db.refresh(apt)
    return {"appointment": _serialize(apt)}
