"""Router: Rechnungen (/api/v1/invoices) — V4.1.

GET  : Rechnungsliste + Forderungs-KPIs (Umsatz, offene Posten, Überfälliges)
PATCH: Zahlung verbuchen (bezahlt) oder Status ändern
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee, Invoice
from ..schemas import InvoiceOut, InvoicePatchIn
from ..security import get_current_employee

router = APIRouter(prefix="/invoices", tags=["Rechnungen"])

MONTHS_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]


def _serialize(i: Invoice, now: datetime) -> dict:
    overdue = i.status not in ("bezahlt", "storniert") and i.due_at < now
    return {
        "id": i.id, "invoiceNumber": i.invoice_number,
        "customerName": i.customer_name, "customerEmail": i.customer_email,
        "customerZip": i.customer_zip, "customerCity": i.customer_city,
        "subtotal": i.subtotal, "vatAmount": i.vat_amount, "total": i.total,
        "status": i.status, "issuedAt": i.issued_at, "dueAt": i.due_at,
        "paidAt": i.paid_at, "paymentTerms": i.payment_terms,
        "vehicle": i.vehicle and {
            "brand": i.vehicle.brand, "model": i.vehicle.model, "engine": i.vehicle.engine,
        },
        "quote": i.quote and {"refNumber": i.quote.ref_number, "channel": i.quote.channel},
        "overdue": overdue,
    }


@router.get("")
def list_invoices(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    rows = db.query(Invoice).order_by(Invoice.issued_at.desc()).limit(500).all()
    now = datetime.now()

    paid = [i for i in rows if i.status == "bezahlt"]
    open_ = [i for i in rows if i.status == "offen"]
    overdue_rows = [i for i in rows if i.status == "ueberfaellig" or (i.status == "offen" and i.due_at < now)]

    revenue_paid = sum(i.total for i in paid)
    receivables = sum(i.total for i in open_) + sum(
        i.total for i in overdue_rows if i.status == "ueberfaellig")

    # Monats-Umsatz (letzte 6 Monate)
    months = []
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for m in range(5, -1, -1):
        year = first_of_month.year - (1 if first_of_month.month - m <= 0 else 0)
        month = (first_of_month.month - m - 1) % 12 + 1
        start = datetime(year, month, 1)
        end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
        in_month = [i for i in rows if start <= i.issued_at < end]
        months.append({
            "label": f"{MONTHS_DE[month - 1]} {str(year)[2:]}",
            "revenue": round(sum(i.total for i in in_month), 2),
            "count": len(in_month),
        })

    # Ø Zahlungsdauer (Tage) der bezahlten Rechnungen
    durations = [
        (i.paid_at - i.issued_at).days for i in paid if i.paid_at
    ]
    avg_payment_days = round(sum(durations) / len(durations)) if durations else None

    return {
        "count": len(rows),
        "kpis": {
            "revenuePaid": round(revenue_paid, 2),
            "receivables": round(receivables, 2),
            "openCount": len(open_),
            "overdueCount": len(overdue_rows),
            "overdueAmount": round(sum(i.total for i in overdue_rows), 2),
            "avgPaymentDays": avg_payment_days,
        },
        "months": months,
        "invoices": [_serialize(i, now) for i in rows],
    }


@router.patch("/{invoice_id}")
def patch_invoice(
    invoice_id: int,
    payload: InvoicePatchIn,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    inv = db.get(Invoice, invoice_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden.")
    inv.status = payload.status
    inv.paid_at = datetime.now() if payload.status == "bezahlt" else None
    db.commit()
    db.refresh(inv)
    return {"invoice": _serialize(inv, datetime.now())}
