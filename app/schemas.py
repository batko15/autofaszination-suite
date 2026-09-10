"""AutoFaszination Suite — Pydantic-Schemata (API-JSON in camelCase)."""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Basisklasse: snake_case intern, camelCase in JSON — akzeptiert beides."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
        from_attributes=True,
    )


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    username: str
    password: str


class EmployeeOut(CamelModel):
    id: int
    username: str
    name: str
    role: str
    active: bool
    created_at: Optional[datetime] = None


class TokenOut(CamelModel):
    token: str
    employee: EmployeeOut


# ─── Fahrzeuge ───────────────────────────────────────────────────────────────

class VehicleOut(CamelModel):
    id: int
    brand: str
    model: str
    engine: str
    fuel: str
    euro_norm: Optional[str] = None
    years: Optional[str] = None
    hp_orig: int
    nm_orig: int
    hp_tuned: int
    nm_tuned: int
    fuel_saving: int
    price: float
    product_code: str
    install_min: int


# ─── Berechnung & Offerten ───────────────────────────────────────────────────

WarrantyId = Literal["none", "z3", "z5"]
InstallId = Literal["self", "partner"]
ChannelId = Literal["b2c", "b2b"]
QuoteStatus = Literal["offen", "versendet", "gewonnen", "verloren"]


class CalcIn(BaseModel):
    vehicle_id: int = Field(validation_alias="vehicleId")
    warranty: WarrantyId = "none"
    install: InstallId = "self"
    channel: ChannelId = "b2c"
    b2b_qty: int = Field(default=1, ge=1, le=500, validation_alias="b2bQty")


class CustomerIn(BaseModel):
    name: str
    street: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    channel: ChannelId = "b2c"
    notes: Optional[str] = None


class QuoteCreateIn(BaseModel):
    vehicle_id: int = Field(validation_alias="vehicleId")
    customer_id: Optional[int] = Field(default=None, validation_alias="customerId")
    customer: Optional[CustomerIn] = None
    warranty: WarrantyId = "none"
    install: InstallId = "self"
    channel: ChannelId = "b2c"
    b2b_qty: int = Field(default=1, ge=1, le=500, validation_alias="b2bQty")
    partner_id: Optional[int] = Field(default=None, validation_alias="partnerId")
    note: Optional[str] = None


class FollowupOut(CamelModel):
    id: int
    quote_id: int
    employee_id: int
    day_offset: int
    action: str
    channel: str
    script: str
    due_at: datetime
    done: bool
    done_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    quote_ref: Optional[int] = None


class CustomerOut(CamelModel):
    id: int
    customer_nr: int
    name: str
    street: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    channel: str
    lead_status: str
    notes: Optional[str] = None
    created_at: datetime


class PartnerOut(CamelModel):
    id: int
    company: str
    brands: List[str] = []
    primary_brand: Optional[str] = None
    contact_person: Optional[str] = None
    street: Optional[str] = None
    zip: str
    city: str
    canton: Optional[str] = None
    country: str = "CH"
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    priority: str
    capacity: int
    capacity_used: int = 0
    active: bool = True


class QuoteOut(CamelModel):
    id: int
    ref_number: int
    channel: str
    install_mode: str
    warranty: str
    b2b_qty: int
    items: List[Dict[str, Any]] = []
    base_price: float
    warranty_price: float
    install_price: float
    shipping: float
    subtotal: float
    vat_amount: float
    total: float
    status: str
    note: Optional[str] = None
    pdf_file: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    customer: Optional[CustomerOut] = None
    vehicle: Optional[VehicleOut] = None
    partner: Optional[PartnerOut] = None
    employee: Optional[EmployeeOut] = None
    followups: List[FollowupOut] = []
    emails: Optional[Dict[str, Dict[str, str]]] = None


class QuoteStatusIn(BaseModel):
    status: QuoteStatus


# ─── Routing ─────────────────────────────────────────────────────────────────

class RouteIn(BaseModel):
    zip: str
    brand: Optional[str] = None


class RouteResultOut(CamelModel):
    partner: PartnerOut
    distance_km: float
    effective_km: float
    brand_match: bool


# ─── Kunden ──────────────────────────────────────────────────────────────────

class CustomerPatchIn(BaseModel):
    lead_status: Optional[str] = None
    notes: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


# ─── Follow-ups ──────────────────────────────────────────────────────────────

class FollowupPatchIn(BaseModel):
    done: bool


# ─── Mitarbeiter ─────────────────────────────────────────────────────────────

class EmployeeCreateIn(BaseModel):
    name: str
    username: str
    password: str
    role: Literal["admin", "vertrieb", "technik"] = "vertrieb"


class EmployeePatchIn(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["admin", "vertrieb", "technik"]] = None
    active: Optional[bool] = None
    password: Optional[str] = None


# ─── Import ──────────────────────────────────────────────────────────────────

class ImportReportOut(BaseModel):
    added: int
    updated: int
    skipped: int
    errors: List[str]


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardOut(CamelModel):
    quotes_total: int = 0
    quotes_open: int = 0
    quotes_sent: int = 0
    quotes_won: int = 0
    quotes_lost: int = 0
    volume_total: float = 0.0
    volume_open: float = 0.0
    volume_won: float = 0.0
    win_rate: float = 0.0
    avg_quote_value: float = 0.0
    top_brands: List[Dict[str, Any]] = []
    monthly: List[Dict[str, Any]] = []
    channel_split: List[Dict[str, Any]] = []
    followups_overdue: int = 0
    followups_today: int = 0
    followups_upcoming: int = 0
    recent_quotes: List[Dict[str, Any]] = []
    upcoming_followups: List[Dict[str, Any]] = []
    b2b_potential: Dict[str, Any] = {}
    system: Dict[str, Any] = {}
