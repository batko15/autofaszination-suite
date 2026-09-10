"""Router: Authentifizierung (/api/v1/auth)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee
from ..schemas import EmployeeOut, LoginIn, TokenOut
from ..security import get_current_employee, issue_token, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.username == payload.username.strip().lower()).first()
    if employee is None or not verify_password(payload.password, employee.salt, employee.password_hash):
        raise HTTPException(status_code=401, detail="Benutzername oder Passwort ist falsch.")
    if not employee.active:
        raise HTTPException(status_code=403, detail="Dieses Mitarbeiterkonto ist deaktiviert.")
    return {"token": issue_token(employee), "employee": EmployeeOut.model_validate(employee)}


@router.get("/me", response_model=EmployeeOut)
def me(employee: Employee = Depends(get_current_employee)):
    return EmployeeOut.model_validate(employee)
