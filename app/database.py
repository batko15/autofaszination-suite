"""AutoFaszination Suite — Datenbank-Grundlage (SQLite via SQLAlchemy)."""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DB_PATH


class Base(DeclarativeBase):
    pass


engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI-Dependency: eine Datenbank-Session pro Request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Tabellen anlegen (idempotent)."""
    from . import models  # noqa: F401 — Modelle registrieren
    Base.metadata.create_all(bind=engine)
