"""AutoFaszination Suite — ORM-Modelle (SQLAlchemy 2.0)."""
from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now()


class Employee(Base):
    """Mitarbeiter/in des Mitarbeiter-Portals (Login)."""
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    salt: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), default="vertrieb")  # admin | vertrieb | technik
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    quotes: Mapped[List["Quote"]] = relationship(back_populates="employee")


class Customer(Base):
    """Kunde (B2C-Endkunde oder B2B-Markenhaus)."""
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_nr: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    street: Mapped[Optional[str]] = mapped_column(String(160))
    zip: Mapped[Optional[str]] = mapped_column(String(10), index=True)
    city: Mapped[Optional[str]] = mapped_column(String(80))
    email: Mapped[Optional[str]] = mapped_column(String(160))
    phone: Mapped[Optional[str]] = mapped_column(String(40))
    channel: Mapped[str] = mapped_column(String(10), default="b2c")  # b2c | b2b
    lead_status: Mapped[str] = mapped_column(String(30), default="neu")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    quotes: Mapped[List["Quote"]] = relationship(back_populates="customer")


class Vehicle(Base):
    """Fahrzeug mit LET26-Tuning-Werten (Datenbasis: Preisliste 2026 / Tuning-Listen)."""
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    brand: Mapped[str] = mapped_column(String(40), index=True)
    model: Mapped[str] = mapped_column(String(80))
    engine: Mapped[str] = mapped_column(String(120))
    fuel: Mapped[str] = mapped_column(String(20))          # diesel | benzin | hybrid
    euro_norm: Mapped[Optional[str]] = mapped_column(String(20))
    years: Mapped[Optional[str]] = mapped_column(String(30))
    hp_orig: Mapped[int] = mapped_column(Integer)
    nm_orig: Mapped[int] = mapped_column(Integer)
    hp_tuned: Mapped[int] = mapped_column(Integer)
    nm_tuned: Mapped[int] = mapped_column(Integer)
    fuel_saving: Mapped[int] = mapped_column(Integer, default=0)  # %
    price: Mapped[float] = mapped_column(Float)            # UVP brutto CHF
    product_code: Mapped[str] = mapped_column(String(10))  # DA | BA | K | GA
    install_min: Mapped[int] = mapped_column(Integer, default=15)

    quotes: Mapped[List["Quote"]] = relationship(back_populates="vehicle")


class Partner(Base):
    """B2B-Markenhaus / Partner-Garage im Schweizer Netz (415 Häuser)."""
    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(primary_key=True)
    company: Mapped[str] = mapped_column(String(180), index=True)
    brands: Mapped[Any] = mapped_column(JSON, default=list)
    primary_brand: Mapped[Optional[str]] = mapped_column(String(40))
    contact_person: Mapped[Optional[str]] = mapped_column(String(120))
    street: Mapped[Optional[str]] = mapped_column(String(160))
    zip: Mapped[str] = mapped_column(String(10), index=True)
    city: Mapped[str] = mapped_column(String(80))
    canton: Mapped[Optional[str]] = mapped_column(String(5), index=True)
    country: Mapped[str] = mapped_column(String(5), default="CH")
    phone: Mapped[Optional[str]] = mapped_column(String(60))
    email: Mapped[Optional[str]] = mapped_column(String(160))
    website: Mapped[Optional[str]] = mapped_column(String(200))
    priority: Mapped[str] = mapped_column(String(5), default="B")  # A | B | C
    capacity: Mapped[int] = mapped_column(Integer, default=5)      # Fahrzeuge/Monat
    capacity_used: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    quotes: Mapped[List["Quote"]] = relationship(back_populates="partner")


class Quote(Base):
    """Offerte (Referenz-Struktur analog Offerte_10900)."""
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    ref_number: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    partner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partners.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    channel: Mapped[str] = mapped_column(String(10), default="b2c")     # b2c | b2b
    install_mode: Mapped[str] = mapped_column(String(10), default="self")  # self | partner
    warranty: Mapped[str] = mapped_column(String(10), default="none")   # none | z3 | z5
    b2b_qty: Mapped[int] = mapped_column(Integer, default=1)
    items: Mapped[Any] = mapped_column(JSON, default=list)

    base_price: Mapped[float] = mapped_column(Float, default=0)
    warranty_price: Mapped[float] = mapped_column(Float, default=0)
    install_price: Mapped[float] = mapped_column(Float, default=0)
    shipping: Mapped[float] = mapped_column(Float, default=14.5)
    subtotal: Mapped[float] = mapped_column(Float, default=0)
    vat_amount: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)

    status: Mapped[str] = mapped_column(String(20), default="offen")  # offen|versendet|gewonnen|verloren
    note: Mapped[Optional[str]] = mapped_column(Text)
    pdf_file: Mapped[Optional[str]] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    customer: Mapped["Customer"] = relationship(back_populates="quotes")
    vehicle: Mapped["Vehicle"] = relationship(back_populates="quotes")
    partner: Mapped[Optional["Partner"]] = relationship(back_populates="quotes")
    employee: Mapped["Employee"] = relationship(back_populates="quotes")
    followups: Mapped[List["Followup"]] = relationship(back_populates="quote")


class Followup(Base):
    """Follow-up-Aufgabe gem. LET26-Vertriebs-Guide: Tag 1 / Tag 3 / Tag 7."""
    __tablename__ = "followups"

    id: Mapped[int] = mapped_column(primary_key=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    day_offset: Mapped[int] = mapped_column(Integer)  # 1 | 3 | 7
    action: Mapped[str] = mapped_column(String(200))
    channel: Mapped[str] = mapped_column(String(20))  # Telefon | E-Mail
    script: Mapped[str] = mapped_column(Text)
    due_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    done_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    quote: Mapped["Quote"] = relationship(back_populates="followups")


class Appointment(Base):
    """Termin: Testfahrt, Einbau, Beratung oder Follow-up (V4.1)."""
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(20), index=True)          # testfahrt | einbau | beratung | followup
    start_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_min: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(String(20), default="geplant")  # geplant | bestaetigt | abgeschlossen | abgesagt
    customer_name: Mapped[str] = mapped_column(String(160))
    customer_email: Mapped[Optional[str]] = mapped_column(String(160))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(40))
    location: Mapped[str] = mapped_column(String(80), default="Neuenhof")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    vehicle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicles.id"))
    quote_id: Mapped[Optional[int]] = mapped_column(ForeignKey("quotes.id"))
    partner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    vehicle: Mapped[Optional["Vehicle"]] = relationship()
    quote: Mapped[Optional["Quote"]] = relationship()
    partner: Mapped[Optional["Partner"]] = relationship()


class Invoice(Base):
    """Rechnung aus gewonnenen Offerten (V4.1) — MWST 8.1 %."""
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    customer_email: Mapped[Optional[str]] = mapped_column(String(160))
    customer_zip: Mapped[Optional[str]] = mapped_column(String(10))
    customer_city: Mapped[Optional[str]] = mapped_column(String(80))
    subtotal: Mapped[float] = mapped_column(Float, default=0)
    vat_amount: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="offen")   # offen | bezahlt | ueberfaellig | storniert
    payment_terms: Mapped[int] = mapped_column(Integer, default=30)    # Tage Zahlungsfrist
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    due_at: Mapped[datetime] = mapped_column(DateTime)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    vehicle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicles.id"))
    quote_id: Mapped[Optional[int]] = mapped_column(ForeignKey("quotes.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    vehicle: Mapped[Optional["Vehicle"]] = relationship()
    quote: Mapped[Optional["Quote"]] = relationship()


class WorkshopOrder(Base):
    """Werkstatt-Auftrag: Geplant → In Arbeit → QS → Abgeschlossen (V4.1)."""
    __tablename__ = "workshop_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="geplant", index=True)  # geplant | in_arbeit | qualitaet | abgeschlossen
    mechanic: Mapped[Optional[str]] = mapped_column(String(120))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    install_min: Mapped[int] = mapped_column(Integer, default=15)
    progress: Mapped[int] = mapped_column(Integer, default=0)          # 0–100 %
    notes: Mapped[Optional[str]] = mapped_column(Text)
    vehicle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicles.id"))
    quote_id: Mapped[Optional[int]] = mapped_column(ForeignKey("quotes.id"))
    partner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partners.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    vehicle: Mapped[Optional["Vehicle"]] = relationship()
    quote: Mapped[Optional["Quote"]] = relationship()
    partner: Mapped[Optional["Partner"]] = relationship()
