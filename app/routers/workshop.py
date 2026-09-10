"""Router: Werkstatt-Aufträge (/api/v1/workshop) — V4.1.

GET  : Aufträge + Auslastungs-KPIs (Status-Flow, Bühnen-Kapazität heute)
PATCH: Auftrag weiterstellen (Status-Kette) + Fortschritt setzen
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee, WorkshopOrder
from ..schemas import WorkshopPatchIn, WorkshopOrderOut
from ..security import get_current_employee

router = APIRouter(prefix="/workshop", tags=["Werkstatt"])

STATUS_CHAIN = ["geplant", "in_arbeit", "qualitaet", "abgeschlossen"]

# Kapazität: 2 Hebebühnen × 8 h = 960 Min/Tag
CAPACITY_MIN_PER_DAY = 960


def _serialize(o: WorkshopOrder) -> dict:
    return {
        "id": o.id, "orderNumber": o.order_number,
        "customerName": o.customer_name, "customerPhone": o.customer_phone,
        "status": o.status, "mechanic": o.mechanic,
        "scheduledAt": o.scheduled_at, "installMin": o.install_min,
        "progress": o.progress, "notes": o.notes,
        "vehicle": o.vehicle and {
            "brand": o.vehicle.brand, "model": o.vehicle.model,
            "engine": o.vehicle.engine, "hpOrig": o.vehicle.hp_orig,
            "hpTuned": o.vehicle.hp_tuned,
        },
        "partner": o.partner and {"company": o.partner.company, "city": o.partner.city},
        "quote": o.quote and {"refNumber": o.quote.ref_number, "total": o.quote.total},
    }


@router.get("")
def list_orders(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    rows = db.query(WorkshopOrder).order_by(WorkshopOrder.scheduled_at.asc()).limit(500).all()

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    today_rows = [o for o in rows if today <= o.scheduled_at < tomorrow]
    booked_today = sum(o.install_min for o in today_rows)

    active = [o for o in rows if o.status in ("in_arbeit", "qualitaet")]

    return {
        "count": len(rows),
        "kpis": {
            "active": len(active),
            "todayCount": len(today_rows),
            "utilizationPct": min(100, round(booked_today / CAPACITY_MIN_PER_DAY * 100)),
            "bookedMinToday": booked_today,
            "capacityMinPerDay": CAPACITY_MIN_PER_DAY,
            "done": sum(1 for o in rows if o.status == "abgeschlossen"),
            "planned": sum(1 for o in rows if o.status == "geplant"),
            "openWorkMin": sum(o.install_min for o in rows if o.status != "abgeschlossen"),
        },
        "orders": [_serialize(o) for o in rows],
    }


@router.patch("/{order_id}")
def patch_order(
    order_id: int,
    payload: WorkshopPatchIn,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    order = db.get(WorkshopOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden.")

    if payload.action == "advance":
        idx = STATUS_CHAIN.index(order.status) if order.status in STATUS_CHAIN else 0
        order.status = STATUS_CHAIN[min(idx + 1, len(STATUS_CHAIN) - 1)]
        if order.status == "in_arbeit":
            order.progress = max(order.progress, 40)
        elif order.status == "qualitaet":
            order.progress = max(order.progress, 85)
        elif order.status == "abgeschlossen":
            order.progress = 100
    elif payload.action == "set-progress" and payload.progress is not None:
        order.progress = max(0, min(100, round(payload.progress)))
    else:
        raise HTTPException(status_code=400, detail="action=advance|set-progress erforderlich.")

    db.commit()
    db.refresh(order)
    return {"order": _serialize(order)}
