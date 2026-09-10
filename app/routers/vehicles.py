"""Router: Fahrzeuge (/api/v1/vehicles)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee, Vehicle
from ..schemas import VehicleOut
from ..security import get_current_employee

router = APIRouter(prefix="/vehicles", tags=["Fahrzeuge"])


@router.get("", response_model=List[VehicleOut])
def list_vehicles(
    brand: Optional[str] = Query(None, description="Nach Marke filtern"),
    fuel: Optional[str] = Query(None, description="diesel | benzin | hybrid"),
    search: Optional[str] = Query(None, description="Suche in Marke/Modell/Motor"),
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    query = db.query(Vehicle)
    if brand:
        query = query.filter(Vehicle.brand == brand)
    if fuel:
        query = query.filter(Vehicle.fuel == fuel.lower())
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            (Vehicle.brand.ilike(term)) | (Vehicle.model.ilike(term)) | (Vehicle.engine.ilike(term))
        )
    return query.order_by(Vehicle.brand, Vehicle.model, Vehicle.hp_orig).all()


@router.get("/brands", response_model=List[str])
def list_brands(db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    rows = db.query(Vehicle.brand).distinct().order_by(Vehicle.brand).all()
    return [r[0] for r in rows]


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), employee: Employee = Depends(get_current_employee)):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden.")
    return vehicle
