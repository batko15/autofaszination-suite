"""Router: Vertriebs-Cockpit / Dashboard-KPIs (/api/v1/dashboard)."""
from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import APP_VERSION, ROADMAP
from ..database import get_db
from ..models import Customer, Employee, Followup, Partner, Quote, Vehicle
from ..schemas import DashboardOut
from ..security import get_current_employee

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]


@router.get("/stats", response_model=DashboardOut)
def stats(db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    quotes = db.query(Quote).all()
    now = datetime.now()

    counts = {"offen": 0, "versendet": 0, "gewonnen": 0, "verloren": 0}
    volume = {"offen": 0.0, "versendet": 0.0, "gewonnen": 0.0, "verloren": 0.0}
    brand_counts: Dict[str, int] = {}
    monthly_map: Dict[str, Dict[str, float]] = {}
    channel_map = {"b2c": 0, "b2b": 0}

    for q in quotes:
        if q.status in counts:
            counts[q.status] += 1
            volume[q.status] += q.total or 0
        if q.vehicle is not None:
            brand_counts[q.vehicle.brand] = brand_counts.get(q.vehicle.brand, 0) + 1
        key = f"{q.created_at.year}-{q.created_at.month:02d}"
        monthly_map.setdefault(key, {"volume": 0.0, "count": 0})
        monthly_map[key]["volume"] += q.total or 0
        monthly_map[key]["count"] += 1
        if q.channel in channel_map:
            channel_map[q.channel] += 1

    decided = counts["gewonnen"] + counts["verloren"]
    win_rate = round(counts["gewonnen"] / decided * 100, 1) if decided else 0.0
    volume_total = sum(volume.values())
    avg_value = round(volume_total / len(quotes), 2) if quotes else 0.0

    # Letzte 6 Monate (auch Monate ohne Offerten auffüllen)
    monthly = []
    for i in range(5, -1, -1):
        d = (now.replace(day=1) - timedelta(days=32 * i)).replace(day=1)
        key = f"{d.year}-{d.month:02d}"
        m = monthly_map.get(key, {"volume": 0.0, "count": 0})
        monthly.append({"label": MONTH_LABELS[d.month - 1], "volume": round(m["volume"], 2), "count": m["count"]})

    top_brands = [
        {"brand": b, "count": c}
        for b, c in sorted(brand_counts.items(), key=lambda kv: -kv[1])[:5]
    ]

    # Follow-up-KPIs
    followups = db.query(Followup).all()
    f_overdue = f_today = f_upcoming = 0
    end_of_day = now.replace(hour=23, minute=59, second=59)
    for f in followups:
        if f.done:
            continue
        if f.due_at < now:
            f_overdue += 1
        elif f.due_at <= end_of_day:
            f_today += 1
        else:
            f_upcoming += 1

    recent = (
        db.query(Quote).order_by(Quote.created_at.desc()).limit(8).all()
    )
    recent_quotes = [
        {
            "id": q.id,
            "refNumber": q.ref_number,
            "customerName": q.customer.name if q.customer else "?",
            "vehicleLabel": f"{q.vehicle.brand} {q.vehicle.model}" if q.vehicle else "?",
            "channel": q.channel,
            "total": q.total,
            "status": q.status,
            "createdAt": q.created_at.isoformat(),
        }
        for q in recent
    ]

    upcoming = (
        db.query(Followup)
        .filter(Followup.done == False)  # noqa: E712
        .order_by(Followup.due_at)
        .limit(6)
        .all()
    )
    upcoming_followups = [
        {
            "id": f.id,
            "dayOffset": f.day_offset,
            "action": f.action,
            "channel": f.channel,
            "dueAt": f.due_at.isoformat(),
            "customerName": f.quote.customer.name if f.quote and f.quote.customer else "?",
            "quoteRef": f.quote.ref_number if f.quote else None,
        }
        for f in upcoming
    ]

    # B2B-Potenzial (LET26-Roadmap)
    partner_rows = db.query(Partner).all()
    active_partners = [p for p in partner_rows if p.active]
    wave_stats = []
    for w in ROADMAP["wellen"]:
        if w["kantone"]:
            actual = sum(1 for p in active_partners if p.canton in w["kantone"])
        else:
            excluded = {k for ww in ROADMAP["wellen"] if ww["kantone"] for k in ww["kantone"]}
            actual = sum(1 for p in active_partners if p.canton not in excluded)
        wave_stats.append({**w, "actualHaeuser": actual})

    b2b_potential = {
        "markenhaeuserTotal": ROADMAP["markenhaeuserTotal"],
        "mitAnsprechperson": ROADMAP["mitAnsprechperson"],
        "adressierbareFahrzeuge": ROADMAP["adressierbareFahrzeuge"],
        "endkundenPotenzialChf": ROADMAP["endkundenPotenzialChf"],
        "wellen": wave_stats,
    }

    system = {
        "version": APP_VERSION,
        "vehicles": db.query(Vehicle).count(),
        "partners": len(partner_rows),
        "customers": db.query(Customer).count(),
        "employees": db.query(Employee).count(),
    }

    return DashboardOut(
        quotes_total=len(quotes),
        quotes_open=counts["offen"],
        quotes_sent=counts["versendet"],
        quotes_won=counts["gewonnen"],
        quotes_lost=counts["verloren"],
        volume_total=round(volume_total, 2),
        volume_open=round(volume["offen"] + volume["versendet"], 2),
        volume_won=round(volume["gewonnen"], 2),
        win_rate=win_rate,
        avg_quote_value=avg_value,
        top_brands=top_brands,
        monthly=monthly,
        channel_split=[{"label": "B2C Direktvertrieb", "value": channel_map["b2c"]},
                        {"label": "B2B Markenhäuser", "value": channel_map["b2b"]}],
        followups_overdue=f_overdue,
        followups_today=f_today,
        followups_upcoming=f_upcoming,
        recent_quotes=recent_quotes,
        upcoming_followups=upcoming_followups,
        b2b_potential=b2b_potential,
        system=system,
    )
