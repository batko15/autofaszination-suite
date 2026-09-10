"""Router: Offerten — Berechnung, Erstellung, Verwaltung, PDF (/api/v1)."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..config import QUOTES_DIR
from ..database import get_db
from ..models import Customer, Employee, Followup, Partner, Quote, Vehicle
from ..schemas import CalcIn, QuoteCreateIn, QuoteOut, QuoteStatusIn, VehicleOut
from ..security import get_current_employee
from ..services.emails import build_quote_emails
from ..services.followups import build_followup_dates
from ..services.geo import is_valid_ch_zip, route_partners
from ..services.pdf_engine import build_pdf_data, generate_quote_pdf
from ..services.pricing import PRICE_LIST_2026, WARRANTY_OPTIONS, calc_performance, calc_quote

router = APIRouter(tags=["Offerten"])


# ─── Live-Berechnung (Schritt 2/3 des Konfigurators) ─────────────────────────

@router.post("/calculate-performance")
def calculate_performance(payload: CalcIn, db: Session = Depends(get_db),
                          employee: Employee = Depends(get_current_employee)):
    vehicle = db.get(Vehicle, payload.vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden.")
    totals = calc_quote(vehicle, payload.warranty, payload.install, payload.channel, payload.b2b_qty)
    product = PRICE_LIST_2026.get(vehicle.product_code, PRICE_LIST_2026["BA"])
    return {
        "vehicle": VehicleOut.model_validate(vehicle),
        "performance": calc_performance(vehicle),
        "totals": totals,
        "product": {
            "code": product["code"],
            "name": product["name"],
            "ekNetto": product["ekNetto"],
            "uvpBrutto": product["uvpBrutto"],
        },
        "warrantyOptions": list(WARRANTY_OPTIONS.values()),
    }


# ─── Offerte erstellen ───────────────────────────────────────────────────────

def _next_ref_number(db: Session) -> int:
    max_ref = db.query(Quote.ref_number).order_by(Quote.ref_number.desc()).first()
    return (max_ref[0] + 1) if max_ref else 14570


def _next_customer_nr(db: Session) -> int:
    max_nr = db.query(Customer.customer_nr).order_by(Customer.customer_nr.desc()).first()
    return (max_nr[0] + 1) if max_nr else 10901


@router.post("/generate-quote", response_model=QuoteOut)
def generate_quote(payload: QuoteCreateIn, db: Session = Depends(get_db),
                   employee: Employee = Depends(get_current_employee)):
    vehicle = db.get(Vehicle, payload.vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden.")

    # Kunde: bestehend oder neu
    if payload.customer_id:
        customer = db.get(Customer, payload.customer_id)
        if customer is None:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden.")
    elif payload.customer:
        data = payload.customer.model_dump()
        data["customer_nr"] = _next_customer_nr(db)
        customer = Customer(**data)
        db.add(customer)
        db.flush()
    else:
        raise HTTPException(status_code=422, detail="Bitte bestehenden Kunde wählen oder Neukunden erfassen.")

    # Partner-Routing: gewählt oder automatisch anhand Kunden-PLZ
    partner = None
    if payload.install == "partner":
        if payload.partner_id:
            partner = db.get(Partner, payload.partner_id)
            if partner is None:
                raise HTTPException(status_code=404, detail="Partner-Garage nicht gefunden.")
        elif customer.zip and is_valid_ch_zip(customer.zip):
            candidates = db.query(Partner).filter(Partner.active == True).all()  # noqa: E712
            ranked = route_partners(candidates, customer.zip, vehicle.brand, top=1)
            if ranked:
                partner = ranked[0]["partner"]
        if partner is None:
            raise HTTPException(status_code=422, detail="Keine passende Partner-Garage gefunden — bitte PLZ prüfen oder Partner manuell wählen.")

    totals = calc_quote(vehicle, payload.warranty, payload.install, payload.channel, payload.b2b_qty)
    quote = Quote(
        ref_number=_next_ref_number(db),
        customer_id=customer.id,
        vehicle_id=vehicle.id,
        partner_id=partner.id if partner else None,
        employee_id=employee.id,
        channel=payload.channel,
        install_mode=payload.install,
        warranty=payload.warranty,
        b2b_qty=payload.b2b_qty,
        items=totals["items"],
        base_price=totals["basePrice"],
        warranty_price=totals["warrantyPrice"],
        install_price=totals["installPrice"],
        shipping=totals["shipping"],
        subtotal=totals["subtotal"],
        vat_amount=totals["vatAmount"],
        total=totals["total"],
        note=payload.note,
        status="offen",
    )
    db.add(quote)
    db.flush()

    # Follow-up-Sequenz Tag 1 / 3 / 7
    for f in build_followup_dates(quote.created_at or datetime.now()):
        db.add(Followup(
            quote_id=quote.id,
            employee_id=employee.id,
            day_offset=f["dayOffset"],
            action=f["action"],
            channel=f["channel"],
            script=f["script"],
            due_at=f["dueAt"],
        ))

    # PDF erzeugen
    pdf_data = build_pdf_data(quote, customer, vehicle, partner, employee)
    pdf_name = f"Offerte_{quote.ref_number}.pdf"
    generate_quote_pdf(pdf_data, str(QUOTES_DIR / pdf_name))
    quote.pdf_file = pdf_name

    # Kundenstatus fortschreiben
    if customer.lead_status in ("neu", "interessiert", ""):
        customer.lead_status = "offerte_erstellt"

    db.commit()
    db.refresh(quote)
    return _quote_detail(db, quote, include_emails=True)


# ─── Listen & Details ────────────────────────────────────────────────────────

def _quote_detail(db: Session, quote: Quote, include_emails: bool = False) -> QuoteOut:
    out = QuoteOut.model_validate(quote)
    if include_emails and quote.customer and quote.vehicle:
        out.emails = build_quote_emails(quote, quote.customer, quote.vehicle, quote.partner)
    return out


@router.get("/quotes", response_model=List[QuoteOut])
def list_quotes(
    status: Optional[str] = Query(None, description="offen | versendet | gewonnen | verloren"),
    channel: Optional[str] = Query(None, description="b2c | b2b"),
    search: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None, alias="employeeId"),
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    query = db.query(Quote)
    if status:
        query = query.filter(Quote.status == status)
    if channel:
        query = query.filter(Quote.channel == channel)
    if employee_id:
        query = query.filter(Quote.employee_id == employee_id)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.join(Customer).filter(
            Customer.name.ilike(term) | Quote.ref_number.cast(str).ilike(term)
        )
    quotes = query.order_by(Quote.created_at.desc()).limit(500).all()
    return [_quote_detail(db, q) for q in quotes]


@router.get("/quotes/{quote_id}", response_model=QuoteOut)
def get_quote(quote_id: int, db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    quote = db.get(Quote, quote_id)
    if quote is None:
        raise HTTPException(status_code=404, detail="Offerte nicht gefunden.")
    return _quote_detail(db, quote, include_emails=True)


@router.patch("/quotes/{quote_id}", response_model=QuoteOut)
def patch_quote(quote_id: int, payload: QuoteStatusIn, db: Session = Depends(get_db),
                employee: Employee = Depends(get_current_employee)):
    quote = db.get(Quote, quote_id)
    if quote is None:
        raise HTTPException(status_code=404, detail="Offerte nicht gefunden.")
    old_status = quote.status
    quote.status = payload.status

    if payload.status == "versendet" and old_status != "versendet":
        quote.sent_at = datetime.now()
        if quote.customer:
            quote.customer.lead_status = "offerte_versendet"

    if payload.status == "gewonnen":
        if quote.customer:
            quote.customer.lead_status = "gewonnen"
        if quote.partner is not None:
            quote.partner.capacity_used += 1

    if payload.status == "verloren" and quote.customer:
        quote.customer.lead_status = "verloren"

    db.commit()
    db.refresh(quote)
    return _quote_detail(db, quote, include_emails=True)


@router.get("/quotes/{quote_id}/pdf")
def download_quote_pdf(quote_id: int, db: Session = Depends(get_db),
                       employee: Employee = Depends(get_current_employee)):
    quote = db.get(Quote, quote_id)
    if quote is None:
        raise HTTPException(status_code=404, detail="Offerte nicht gefunden.")
    if not quote.pdf_file:
        # Bei Bedarf neu erzeugen (z. B. nach Datenimport)
        pdf_data = build_pdf_data(quote, quote.customer, quote.vehicle, quote.partner, quote.employee)
        generate_quote_pdf(pdf_data, str(QUOTES_DIR / f"Offerte_{quote.ref_number}.pdf"))
        quote.pdf_file = f"Offerte_{quote.ref_number}.pdf"
        db.commit()
    path = QUOTES_DIR / quote.pdf_file
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF-Datei fehlt.")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"Offerte_{quote.ref_number}_AutoFaszination.pdf",
    )
