"""AutoFaszination Suite — Authentifizierung (Token-basiert, ohne externe Deps)."""
import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .config import SECRET_PATH
from .database import get_db
from .models import Employee

TOKEN_LIFETIME_HOURS = 12
_scheme = HTTPBearer(auto_error=False)


# ─── Passwort-Hashing (PBKDF2-HMAC-SHA256, stdlib) ───────────────────────────

def make_salt() -> str:
    return secrets.token_hex(16)


def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password, salt), expected_hash)


# ─── Token (HMAC-signiertes JSON) ────────────────────────────────────────────

def _get_secret() -> bytes:
    if SECRET_PATH.exists():
        return SECRET_PATH.read_text().strip().encode("utf-8")
    secret = secrets.token_hex(32)
    SECRET_PATH.write_text(secret)
    SECRET_PATH.chmod(0o600)
    return secret.encode("utf-8")


def issue_token(employee: Employee) -> str:
    payload = {
        "emp": employee.id,
        "role": employee.role,
        "name": employee.name,
        "exp": int(time.time()) + TOKEN_LIFETIME_HOURS * 3600,
    }
    body = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii")
    sig = hmac.new(_get_secret(), body.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def verify_token(token: str) -> Optional[dict]:
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(_get_secret(), body.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(body.encode("ascii")))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


# ─── FastAPI-Dependencies ────────────────────────────────────────────────────

def get_current_employee(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_scheme),
    db: Session = Depends(get_db),
) -> Employee:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nicht angemeldet — bitte einloggen.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Sitzung ungültig oder abgelaufen.")
    employee = db.get(Employee, payload.get("emp"))
    if employee is None or not employee.active:
        raise HTTPException(status_code=401, detail="Mitarbeiterkonto nicht gefunden oder deaktiviert.")
    return employee


def require_admin(employee: Employee = Depends(get_current_employee)) -> Employee:
    if employee.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratorinnen/Administratoren haben Zugriff auf diese Funktion.")
    return employee
