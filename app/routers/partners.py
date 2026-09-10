"""Router: Partner-Netzwerk & PLZ-Routing (/api/v1/partners)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee, Partner
from ..schemas import PartnerOut, RouteIn, RouteResultOut
from ..security import get_current_employee, require_admin
from ..services.geo import is_valid_ch_zip, route_partners

router = APIRouter(prefix="/partners", tags=["Partner-Netzwerk"])


@router.get("")
def list_partners(
    search: Optional[str] = Query(None),
    canton: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    priority: Optional[str] = Query(None, description="A | B | C"),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=200, alias="perPage"),
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    query = db.query(Partner)
    if canton:
        query = query.filter(Partner.canton == canton.upper())
    if priority:
        query = query.filter(Partner.priority == priority.upper())
    if brand:
        # JSON-Spalte: LIKE-Filter (SQLite)
        query = query.filter(Partner.brands.ilike(f'%"{brand}"%'))
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            Partner.company.ilike(term) | Partner.city.ilike(term) | Partner.zip.ilike(term)
        )
    total = query.count()
    rows = (
        query.order_by(Partner.priority, Partner.company)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "perPage": per_page,
        "partners": [PartnerOut.model_validate(p) for p in rows],
    }


@router.get("/stats")
def partner_stats(db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    partners = db.query(Partner).all()
    active = [p for p in partners if p.active]
    with_contact = [p for p in active if p.contact_person]
    by_priority = {k: 0 for k in ("A", "B", "C")}
    by_canton: dict = {}
    for p in active:
        by_priority[p.priority] = by_priority.get(p.priority, 0) + 1
        by_canton[p.canton or "?"] = by_canton.get(p.canton or "?", 0) + 1
    return {
        "total": len(partners),
        "active": len(active),
        "withContactPerson": len(with_contact),
        "byPriority": by_priority,
        "byCanton": dict(sorted(by_canton.items(), key=lambda kv: -kv[1])),
    }


@router.post("/route", response_model=List[RouteResultOut])
def route(zip_payload: RouteIn, db: Session = Depends(get_db),
          employee: Employee = Depends(get_current_employee)):
    """Ermittelt die nächstgelegenen aktiven Markenhäuser zu einer Kunden-PLZ."""
    if not is_valid_ch_zip(zip_payload.zip):
        raise HTTPException(status_code=422, detail="Bitte eine gültige Schweizer PLZ (4-stellig) eingeben.")
    candidates = db.query(Partner).filter(Partner.active == True).all()  # noqa: E712
    ranked = route_partners(candidates, zip_payload.zip, zip_payload.brand, top=5)
    return [
        {
            "partner": PartnerOut.model_validate(r["partner"]),
            "distance_km": r["distanceKm"],
            "effective_km": r["effectiveKm"],
            "brand_match": r["brandMatch"],
        }
        for r in ranked
    ]


@router.patch("/{partner_id}", response_model=PartnerOut)
def patch_partner(partner_id: int, payload: dict, db: Session = Depends(get_db),
                  admin: Employee = Depends(require_admin)):
    partner = db.get(Partner, partner_id)
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner nicht gefunden.")
    if "active" in payload:
        partner.active = bool(payload["active"])
    if "capacity" in payload:
        try:
            partner.capacity = max(0, int(payload["capacity"]))
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="Kapazität muss eine Zahl sein.")
    db.commit()
    db.refresh(partner)
    return partner
