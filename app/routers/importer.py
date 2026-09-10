"""Router: Datenimport für Tuning-Listen & Markenhäuser (/api/v1/import)."""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..config import BEISPIELE_DIR
from ..database import get_db
from ..models import Employee, Partner, Vehicle
from ..schemas import ImportReportOut
from ..security import require_admin
from ..services.importer import normalize_partner, normalize_vehicle, parse_upload

router = APIRouter(prefix="/import", tags=["Datenimport"])


@router.post("/vehicles", response_model=ImportReportOut)
async def import_vehicles(file: UploadFile = File(...), db: Session = Depends(get_db),
                          admin: Employee = Depends(require_admin)):
    """Importiert Fahrzeuge aus JSON oder XLSX. Bestehende Fahrzeuge (Marke+Modell+Motor) werden aktualisiert."""
    content = await file.read()
    rows, errors = parse_upload(file.filename or "", content)
    added = updated = skipped = 0

    for i, row in enumerate(rows, start=2 if (file.filename or "").lower().endswith(".xlsx") else 1):
        data, err = normalize_vehicle(row)
        if err or data is None:
            errors.append(f"Zeile {i}: {err}")
            skipped += 1
            continue
        existing = (
            db.query(Vehicle)
            .filter(Vehicle.brand == data["brand"], Vehicle.model == data["model"],
                    Vehicle.engine == data["engine"])
            .first()
        )
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            updated += 1
        else:
            db.add(Vehicle(**data))
            added += 1

    if added or updated:
        db.commit()
    return ImportReportOut(added=added, updated=updated, skipped=skipped, errors=errors[:30])


@router.post("/partners", response_model=ImportReportOut)
async def import_partners(file: UploadFile = File(...), db: Session = Depends(get_db),
                          admin: Employee = Depends(require_admin)):
    """Importiert Markenhäuser aus JSON oder XLSX. Bestehende Häuser (Firma+PLZ) werden aktualisiert."""
    content = await file.read()
    rows, errors = parse_upload(file.filename or "", content)
    added = updated = skipped = 0

    for i, row in enumerate(rows, start=2 if (file.filename or "").lower().endswith(".xlsx") else 1):
        data, err = normalize_partner(row)
        if err or data is None:
            errors.append(f"Zeile {i}: {err}")
            skipped += 1
            continue
        existing = (
            db.query(Partner)
            .filter(Partner.company == data["company"], Partner.zip == data["zip"])
            .first()
        )
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            updated += 1
        else:
            db.add(Partner(**data))
            added += 1

    if added or updated:
        db.commit()
    return ImportReportOut(added=added, updated=updated, skipped=skipped, errors=errors[:30])


@router.get("/beispiele/{filename}")
def download_beispiel(filename: str, employee: Employee = Depends(require_admin)):
    """Lädt eine Vorlagenbeispieldatei herunter."""
    safe = filename.replace("/", "").replace("..", "")
    path = BEISPIELE_DIR / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="Beispieldatei nicht gefunden.")
    return FileResponse(path, filename=safe)
