"""Router: Einstellungen — Stammdaten, Preisliste, Mitarbeiter-Verwaltung (/api/v1/settings)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import APP_VERSION, COMPANY
from ..database import get_db
from ..models import Customer, Employee, Followup, Partner, Quote, Vehicle
from ..schemas import EmployeeCreateIn, EmployeeOut, EmployeePatchIn
from ..security import (get_current_employee, hash_password, make_salt,
                        require_admin, verify_password)
from ..services.pricing import (B2B_TIERS, INSTALL_OPTIONS, PRICE_LIST_2026,
                                 SERVICELEISTUNGEN, SHIPPING_CHF, VAT_RATE,
                                 WARRANTY_OPTIONS, ZUBEHOER)

router = APIRouter(prefix="/settings", tags=["Einstellungen"])


@router.get("")
def get_settings(db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    return {
        "company": COMPANY,
        "appVersion": APP_VERSION,
        "vatRate": VAT_RATE,
        "shippingChf": SHIPPING_CHF,
        "priceList": list(PRICE_LIST_2026.values()),
        "zubehoer": ZUBEHOER,
        "serviceleistungen": SERVICELEISTUNGEN,
        "warrantyOptions": list(WARRANTY_OPTIONS.values()),
        "installOptions": list(INSTALL_OPTIONS.values()),
        "b2bTiers": [{"abStueck": t, "rabattPct": round(d * 100)} for t, d in B2B_TIERS],
        "system": {
            "vehicles": db.query(Vehicle).count(),
            "partners": db.query(Partner).count(),
            "customers": db.query(Customer).count(),
            "quotes": db.query(Quote).count(),
            "followups": db.query(Followup).count(),
        },
    }


# ─── Mitarbeiter-Verwaltung (nur Admin) ──────────────────────────────────────

@router.get("/employees", response_model=List[EmployeeOut])
def list_employees(db: Session = Depends(get_db), admin: Employee = Depends(require_admin)):
    return db.query(Employee).order_by(Employee.id).all()


@router.post("/employees", response_model=EmployeeOut)
def create_employee(payload: EmployeeCreateIn, db: Session = Depends(get_db),
                    admin: Employee = Depends(require_admin)):
    username = payload.username.strip().lower()
    if not username or len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Benutzername und Passwort (min. 6 Zeichen) sind erforderlich.")
    if db.query(Employee).filter(Employee.username == username).first():
        raise HTTPException(status_code=409, detail="Dieser Benutzername existiert bereits.")
    salt = make_salt()
    employee = Employee(
        username=username,
        salt=salt,
        password_hash=hash_password(payload.password, salt),
        name=payload.name.strip(),
        role=payload.role,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/employees/{employee_id}", response_model=EmployeeOut)
def patch_employee(employee_id: int, payload: EmployeePatchIn, db: Session = Depends(get_db),
                   admin: Employee = Depends(require_admin)):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden.")
    if payload.name is not None:
        employee.name = payload.name.strip()
    if payload.role is not None:
        employee.role = payload.role
    if payload.active is not None:
        if employee.id == admin.id and not payload.active:
            raise HTTPException(status_code=422, detail="Man kann sich nicht selbst deaktivieren.")
        employee.active = payload.active
    if payload.password is not None:
        if len(payload.password) < 6:
            raise HTTPException(status_code=422, detail="Passwort muss mindestens 6 Zeichen haben.")
        employee.salt = make_salt()
        employee.password_hash = hash_password(payload.password, employee.salt)
    db.commit()
    db.refresh(employee)
    return employee


@router.post("/employees/{employee_id}/verify-password")
def verify_employee_password(employee_id: int, payload: dict, db: Session = Depends(get_db),
                             admin: Employee = Depends(require_admin)):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden.")
    ok = verify_password(str(payload.get("password", "")), employee.salt, employee.password_hash)
    return {"ok": ok}
