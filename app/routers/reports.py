"""Router: Berichte (/api/v1/reports) — V4.1.

GET: Vertriebs- & Finanzberichte — Konversions-Trichter · Deal-Velocity ·
     Umsatz-Trend · Top-Fahrzeuge · Top-Partner · Kanal-Performance ·
     Follow-up-Effektivität
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Customer, Employee, Followup, Invoice, Partner, Quote, Vehicle
from ..security import get_current_employee

router = APIRouter(prefix="/reports", tags=["Berichte"])

MONTHS_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]


@router.get("")
def get_reports(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    quotes = db.query(Quote).all()
    invoices = db.query(Invoice).all()
    followups = db.query(Followup).all()
    partners = db.query(Partner).count()
    vehicles_count = db.query(Vehicle).count()

    now = datetime.now()
    won = [q for q in quotes if q.status == "gewonnen"]
    lost = [q for q in quotes if q.status == "verloren"]
    decided = len(won) + len(lost)

    # ─── Konversions-Trichter ────────────────────────────────────────────
    def _count(statuses):
        return sum(1 for q in quotes if q.status in statuses)

    funnel = [
        {"stage": "Erstellt", "count": len(quotes)},
        {"stage": "Versendet", "count": _count(("versendet", "gewonnen", "verloren"))},
        {"stage": "In Verhandlung", "count": _count(("gewonnen", "verloren"))},
        {"stage": "Gewonnen", "count": len(won)},
    ]

    # ─── Deal-Velocity: Ø Tage Erstellung → Entscheidung ────────────────
    # Entscheidung approximiert über sent_at (bester verfügbarer Zeitstempel)
    durations = [
        (q.sent_at - q.created_at).days
        for q in (won + lost) if q.sent_at and q.sent_at > q.created_at
    ]
    deal_velocity_days = (
        round(sum(durations) / len(durations) * 10) / 10 if durations else None
    )

    # ─── Umsatz-Trend (6 Monate: Offerten-Volumen + Rechnungs-Umsatz) ───
    months = []
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for m in range(5, -1, -1):
        year = first_of_month.year - (1 if first_of_month.month - m <= 0 else 0)
        month = (first_of_month.month - m - 1) % 12 + 1
        start = datetime(year, month, 1)
        end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
        qm = [q for q in quotes if start <= q.created_at < end]
        im = [i for i in invoices if start <= i.issued_at < end]
        months.append({
            "label": f"{MONTHS_DE[month - 1]} {str(year)[2:]}",
            "quoteVolume": round(sum(q.total for q in qm), 2),
            "quoteCount": len(qm),
            "revenue": round(sum(i.total for i in im), 2),
            "invoiceCount": len(im),
        })

    # ─── Top-Fahrzeuge nach Offertvolumen ───────────────────────────────
    vehicle_map: dict = {}
    for q in quotes:
        key = f"{q.vehicle.brand} {q.vehicle.model}" if q.vehicle else "Unbekannt"
        cur = vehicle_map.setdefault(key, {"count": 0, "volume": 0.0, "won": 0})
        cur["count"] += 1
        cur["volume"] += q.total
        if q.status == "gewonnen":
            cur["won"] += 1
    top_vehicles = sorted(
        ({"name": k, **v} for k, v in vehicle_map.items()),
        key=lambda x: -x["volume"],
    )[:8]

    # ─── Top-Partner nach gerouteten Offerten ───────────────────────────
    partner_map: dict = {}
    for q in quotes:
        if not q.partner:
            continue
        cur = partner_map.setdefault(q.partner.company, {"count": 0, "volume": 0.0})
        cur["count"] += 1
        cur["volume"] += q.total
    top_partners = sorted(
        ({"company": k, **v} for k, v in partner_map.items()),
        key=lambda x: -x["volume"],
    )[:8]

    # ─── Kanal-Performance B2C vs B2B ───────────────────────────────────
    channels = []
    for channel in ("b2c", "b2b"):
        cq = [q for q in quotes if q.channel == channel]
        c_won = [q for q in cq if q.status == "gewonnen"]
        c_decided = sum(1 for q in cq if q.status in ("gewonnen", "verloren"))
        channels.append({
            "channel": channel,
            "count": len(cq),
            "volume": round(sum(q.total for q in cq), 2),
            "won": len(c_won),
            "winRate": round(len(c_won) / c_decided * 100) if c_decided else 0,
            "avgQuote": round(sum(q.total for q in cq) / len(cq)) if cq else 0,
        })

    # ─── Follow-up-Effektivität ─────────────────────────────────────────
    won_ids = {q.id for q in won}
    f_for_won = [f for f in followups if f.quote_id in won_ids]
    f_for_others = [f for f in followups if f.quote_id not in won_ids]

    def _done_rate(rows):
        return round(sum(1 for f in rows if f.done) / len(rows) * 100) if rows else 0

    followup_effectiveness = {
        "total": len(followups),
        "doneRate": _done_rate(followups),
        "doneRateWon": _done_rate(f_for_won),
        "doneRateOthers": _done_rate(f_for_others),
    }

    # ─── KPIs ───────────────────────────────────────────────────────────
    kpis = {
        "quotesTotal": len(quotes),
        "winRate": round(len(won) / decided * 100) if decided else 0,
        "dealVelocityDays": deal_velocity_days,
        "avgQuote": round(sum(q.total for q in quotes) / len(quotes)) if quotes else 0,
        "revenueTotal": round(sum(i.total for i in invoices if i.status != "storniert"), 2),
        "vehiclesTotal": vehicles_count,
        "partnersTotal": partners,
    }

    return {
        "kpis": kpis,
        "funnel": funnel,
        "months": months,
        "topVehicles": top_vehicles,
        "topPartners": top_partners,
        "channels": channels,
        "followupEffectiveness": followup_effectiveness,
    }
