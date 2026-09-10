"""Router: Follow-up-Aufgaben (/api/v1/followups)."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Customer, Employee, Followup
from ..schemas import FollowupOut, FollowupPatchIn
from ..security import get_current_employee

router = APIRouter(prefix="/followups", tags=["Follow-ups"])


def _to_out(f: Followup) -> FollowupOut:
    out = FollowupOut.model_validate(f)
    if f.quote is not None:
        out.customer_name = f.quote.customer.name if f.quote.customer else None
        out.quote_ref = f.quote.ref_number
    return out


@router.get("", response_model=List[FollowupOut])
def list_followups(
    scope: str = Query("mine", description="mine | all (all nur für Admins)"),
    status: Optional[str] = Query(None, description="offen | erledigt | heute | ueberfaellig"),
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    query = db.query(Followup)
    if scope != "all" or employee.role != "admin":
        query = query.filter(Followup.employee_id == employee.id)
    now = datetime.now()
    if status == "offen":
        query = query.filter(Followup.done == False)  # noqa: E712
    elif status == "erledigt":
        query = query.filter(Followup.done == True)  # noqa: E712
    elif status == "ueberfaellig":
        query = query.filter(Followup.done == False, Followup.due_at < now)  # noqa: E712
    elif status == "heute":
        end_of_day = now.replace(hour=23, minute=59, second=59)
        query = query.filter(Followup.done == False, Followup.due_at <= end_of_day)  # noqa: E712
    followups = query.order_by(Followup.done, Followup.due_at).limit(300).all()
    return [_to_out(f) for f in followups]


@router.patch("/{followup_id}", response_model=FollowupOut)
def patch_followup(followup_id: int, payload: FollowupPatchIn, db: Session = Depends(get_db),
                   employee: Employee = Depends(get_current_employee)):
    followup = db.get(Followup, followup_id)
    if followup is None:
        raise HTTPException(status_code=404, detail="Follow-up nicht gefunden.")
    if followup.employee_id != employee.id and employee.role != "admin":
        raise HTTPException(status_code=403, detail="Diese Aufgabe gehört einem anderen Mitarbeiter.")
    followup.done = payload.done
    followup.done_at = datetime.now() if payload.done else None
    db.commit()
    db.refresh(followup)
    return _to_out(followup)
