"""Router: Kunden-CRM (/api/v1/customers)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Customer, Employee, Quote
from ..schemas import CustomerIn, CustomerOut, CustomerPatchIn, QuoteOut
from ..security import get_current_employee
from ..routers.quotes import _next_customer_nr

router = APIRouter(prefix="/customers", tags=["Kunden"])

LEAD_STATUSES = ["neu", "interessiert", "offerte_erstellt", "offerte_versendet", "verhandlung", "gewonnen", "verloren"]


@router.get("", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None, alias="leadStatus"),
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    query = db.query(Customer)
    if channel:
        query = query.filter(Customer.channel == channel)
    if lead_status:
        query = query.filter(Customer.lead_status == lead_status)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            Customer.name.ilike(term) | Customer.city.ilike(term) | Customer.zip.ilike(term)
        )
    return query.order_by(Customer.created_at.desc()).limit(500).all()


@router.post("", response_model=CustomerOut)
def create_customer(payload: CustomerIn, db: Session = Depends(get_db),
                    employee: Employee = Depends(get_current_employee)):
    data = payload.model_dump()
    data["customer_nr"] = _next_customer_nr(db)
    customer = Customer(**data)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db),
                 employee: Employee = Depends(get_current_employee)):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden.")
    return customer


@router.get("/{customer_id}/quotes", response_model=List[QuoteOut])
def customer_quotes(customer_id: int, db: Session = Depends(get_db),
                    employee: Employee = Depends(get_current_employee)):
    if db.get(Customer, customer_id) is None:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden.")
    return db.query(Quote).filter(Quote.customer_id == customer_id).order_by(Quote.created_at.desc()).all()


@router.patch("/{customer_id}", response_model=CustomerOut)
def patch_customer(customer_id: int, payload: CustomerPatchIn, db: Session = Depends(get_db),
                   employee: Employee = Depends(get_current_employee)):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden.")
    if payload.lead_status is not None:
        if payload.lead_status not in LEAD_STATUSES:
            raise HTTPException(status_code=422, detail=f"Ungültiger Status. Erlaubt: {', '.join(LEAD_STATUSES)}")
        customer.lead_status = payload.lead_status
    if payload.notes is not None:
        customer.notes = payload.notes
    if payload.phone is not None:
        customer.phone = payload.phone
    if payload.email is not None:
        customer.email = payload.email
    db.commit()
    db.refresh(customer)
    return customer
