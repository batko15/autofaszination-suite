"""AutoFaszination Suite — Erstbefüllung (Auto-Seed beim ersten Start).

Legt Mitarbeiter-Konten, Fahrzeuge (68), Markenhäuser (415), Demo-Kunden,
Demo-Offerten inkl. Follow-ups und PDFs sowie — seit V4.1 — Termine,
Rechnungen und Werkstatt-Aufträge an.
"""
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from .config import DATA_DIR, QUOTES_DIR
from .models import (Appointment, Customer, Employee, Followup, Invoice,
                     Partner, Quote, Vehicle, WorkshopOrder)
from .security import hash_password, make_salt
from .services.followups import build_followup_dates
from .services.geo import is_valid_ch_zip, route_partners
from .services.pdf_engine import build_pdf_data, generate_quote_pdf
from .services.pricing import calc_quote

EMPLOYEES = [
    {"username": "admin", "password": "admin123", "name": "Adrian Schnell — Geschäftsführung", "role": "admin"},
    {"username": "mischa", "password": "mischa123", "name": "Mischa Huser — B2B-Vertrieb", "role": "vertrieb"},
    {"username": "uemit", "password": "uemit123", "name": "Ümit Sapmaz — Verkauf", "role": "vertrieb"},
]

CUSTOMERS = [
    {"name": "Seebach Garage Peter Rosselet", "street": "Stiglenstrasse 27", "zip": "8052", "city": "Zürich",
     "email": "rosselet@seebach-garage.ch", "phone": "+41 44 305 12 10", "channel": "b2b", "lead_status": "offerte_versendet"},
    {"name": "Daniela Brunner", "street": "Bahnhofstrasse 12", "zip": "8001", "city": "Zürich",
     "email": "daniela.brunner@example.ch", "phone": "+41 79 312 44 05", "channel": "b2c", "lead_status": "gewonnen"},
    {"name": "Garage Moser AG", "street": "Industriestrasse 22", "zip": "3012", "city": "Bern",
     "email": "info@garage-moser.ch", "phone": "+41 31 302 55 80", "channel": "b2b", "lead_status": "interessiert"},
    {"name": "Markus Frei", "street": "Dorfstrasse 5", "zip": "8640", "city": "Rapperswil-Jona",
     "email": "m.frei@example.ch", "phone": "+41 76 220 91 17", "channel": "b2c", "lead_status": "offerte_erstellt"},
    {"name": "Sandra Keller", "street": "Seestrasse 88", "zip": "6004", "city": "Luzern",
     "email": "sandra.keller@example.ch", "phone": "+41 77 401 66 23", "channel": "b2c", "lead_status": "offerte_versendet"},
    {"name": "Thomas Wyss", "street": "Bergweg 7", "zip": "5000", "city": "Aarau",
     "email": "t.wyss@example.ch", "phone": "+41 78 810 33 90", "channel": "b2c", "lead_status": "verloren"},
    {"name": "Cédric Rochat", "street": "Avenue de la Gare 15", "zip": "1003", "city": "Lausanne",
     "email": "cedric.rochat@example.ch", "phone": "+41 79 555 12 40", "channel": "b2c", "lead_status": "offerte_erstellt"},
    {"name": "Garage Bianchi SA", "street": "Via Cantonale 9", "zip": "6900", "city": "Lugano",
     "email": "info@garage-bianchi.ch", "phone": "+41 91 920 44 70", "channel": "b2b", "lead_status": "neu"},
    {"name": "Andrea Hofer", "street": "Rheinstrasse 44", "zip": "4051", "city": "Basel",
     "email": "a.hofer@example.ch", "phone": "+41 76 356 78 21", "channel": "b2c", "lead_status": "gewonnen"},
    {"name": "Peter Sutter", "street": "Poststrasse 3", "zip": "9000", "city": "St. Gallen",
     "email": "p.sutter@example.ch", "phone": "+41 79 604 22 18", "channel": "b2c", "lead_status": "interessiert"},
    {"name": "Monika Vogel", "street": "Zürcherstrasse 210", "zip": "8500", "city": "Winterthur",
     "email": "monika.vogel@example.ch", "phone": "+41 77 233 90 55", "channel": "b2c", "lead_status": "offerte_erstellt"},
    {"name": "Auto-Center Argovia GmbH", "street": "Bahnhofstrasse 100", "zip": "5200", "city": "Brugg",
     "email": "service@auto-argovia.ch", "phone": "+41 56 442 10 30", "channel": "b2b", "lead_status": "offerte_versendet"},
]

# Demo-Offerten: (Kunden-Index, Fahrzeug-Suche, Kanal, Einbau, Garantie, B2B-Menge, Status, Tage zurück, Followups erledigt bis Tag X)
DEMO_QUOTES: List[Dict[str, Any]] = [
    {"customer": 0, "vehicle": ("Toyota", "RAV4"), "channel": "b2b", "install": "partner", "warranty": "none",
     "b2b_qty": 3, "status": "versendet", "days_ago": 9, "followups_done": 1},
    {"customer": 1, "vehicle": ("Toyota", "Corolla"), "channel": "b2c", "install": "self", "warranty": "z3",
     "b2b_qty": 1, "status": "gewonnen", "days_ago": 48, "followups_done": 3},
    {"customer": 2, "vehicle": ("Peugeot", "308"), "channel": "b2b", "install": "partner", "warranty": "none",
     "b2b_qty": 5, "status": "offen", "days_ago": 4, "followups_done": 0},
    {"customer": 3, "vehicle": ("Fiat", "500"), "channel": "b2c", "install": "self", "warranty": "z5",
     "b2b_qty": 1, "status": "offen", "days_ago": 1, "followups_done": 0},
    {"customer": 4, "vehicle": ("Opel", "Corsa"), "channel": "b2c", "install": "partner", "warranty": "z3",
     "b2b_qty": 1, "status": "versendet", "days_ago": 6, "followups_done": 1},
    {"customer": 5, "vehicle": ("Citroën", "C4"), "channel": "b2c", "install": "self", "warranty": "none",
     "b2b_qty": 1, "status": "verloren", "days_ago": 35, "followups_done": 3},
    {"customer": 6, "vehicle": ("Peugeot", "3008"), "channel": "b2c", "install": "partner", "warranty": "z3",
     "b2b_qty": 1, "status": "offen", "days_ago": 2, "followups_done": 0},
    {"customer": 8, "vehicle": ("Fiat", "Panda"), "channel": "b2c", "install": "self", "warranty": "none",
     "b2b_qty": 1, "status": "gewonnen", "days_ago": 27, "followups_done": 3},
    {"customer": 9, "vehicle": ("Toyota", "Yaris"), "channel": "b2c", "install": "self", "warranty": "z3",
     "b2b_qty": 1, "status": "offen", "days_ago": 5, "followups_done": 0},
    {"customer": 10, "vehicle": ("Opel", "Astra"), "channel": "b2c", "install": "partner", "warranty": "z5",
     "b2b_qty": 1, "status": "versendet", "days_ago": 12, "followups_done": 2},
    {"customer": 11, "vehicle": ("Citroën", "Berlingo"), "channel": "b2b", "install": "partner", "warranty": "none",
     "b2b_qty": 10, "status": "offen", "days_ago": 3, "followups_done": 0},
    {"customer": 2, "vehicle": ("DS", "DS 4"), "channel": "b2b", "install": "self", "warranty": "none",
     "b2b_qty": 3, "status": "gewonnen", "days_ago": 55, "followups_done": 3},
    {"customer": 7, "vehicle": ("Toyota", "C-HR"), "channel": "b2c", "install": "self", "warranty": "z3",
     "b2b_qty": 1, "status": "offen", "days_ago": 0, "followups_done": 0},
    {"customer": 4, "vehicle": ("Fiat", "Ducato"), "channel": "b2b", "install": "partner", "warranty": "none",
     "b2b_qty": 5, "status": "verloren", "days_ago": 42, "followups_done": 3},
]


def seed_if_empty(db: Session) -> None:
    if db.query(Employee).count() > 0:
        return

    # ─── Mitarbeiter ─────────────────────────────────────────────────────────
    employees: Dict[str, Employee] = {}
    for e in EMPLOYEES:
        salt = make_salt()
        emp = Employee(
            username=e["username"], salt=salt,
            password_hash=hash_password(e["password"], salt),
            name=e["name"], role=e["role"],
        )
        db.add(emp)
        employees[e["username"]] = emp
    db.flush()

    # ─── Fahrzeuge (68 aus Echtdaten) ────────────────────────────────────────
    vehicles_data = json.loads((DATA_DIR / "vehicles.json").read_text(encoding="utf-8"))
    for v in vehicles_data:
        db.add(Vehicle(
            brand=v["brand"], model=v["model"], engine=v["engine"], fuel=v["fuel"],
            euro_norm=v.get("euroNorm"), years=v.get("years"),
            hp_orig=v["hpOrig"], nm_orig=v["nmOrig"], hp_tuned=v["hpTuned"], nm_tuned=v["nmTuned"],
            fuel_saving=v.get("fuelSaving", 8), price=v["price"],
            product_code=v.get("productCode", "BA"), install_min=v.get("installMin", 15),
        ))
    db.flush()

    # ─── Markenhäuser (415 aus Echtdaten) ────────────────────────────────────
    partners_data = json.loads((DATA_DIR / "partners.json").read_text(encoding="utf-8"))
    for p in partners_data:
        db.add(Partner(
            company=p["company"], brands=p.get("brands", []),
            primary_brand=p.get("primaryBrand"), contact_person=p.get("contactPerson") or None,
            street=p.get("street"), zip=str(p.get("zip", "")), city=p.get("city", ""),
            canton=p.get("canton"), country=p.get("country", "CH"),
            phone=p.get("phone") or None, email=p.get("email") or None,
            website=p.get("website") or None, priority=p.get("priority", "B"),
            capacity=p.get("capacityVehiclesPerMonth", 5),
        ))
    db.flush()

    # ─── Kunden ─────────────────────────────────────────────────────────────
    customers: List[Customer] = []
    for i, cdata in enumerate(CUSTOMERS):
        c = Customer(customer_nr=10901 + i, **cdata)
        db.add(c)
        customers.append(c)
    db.flush()

    # ─── Demo-Offerten mit echter Berechnung ────────────────────────────────
    all_partners = db.query(Partner).filter(Partner.active == True).all()  # noqa: E712
    employee_cycle = ["uemit", "mischa", "uemit", "mischa", "uemit", "uemit", "mischa", "uemit", "mischa", "uemit", "mischa", "uemit", "uemit", "mischa"]
    ref_number = 14571

    for idx, spec in enumerate(DEMO_QUOTES):
        # Fahrzeug suchen
        brand, model_hint = spec["vehicle"]
        vehicle = (
            db.query(Vehicle)
            .filter(Vehicle.brand == brand, Vehicle.model.ilike(f"{model_hint}%"))
            .order_by(Vehicle.hp_orig.desc())
            .first()
        )
        if vehicle is None:
            continue
        customer = customers[spec["customer"]]
        employee = employees[employee_cycle[idx % len(employee_cycle)]]

        # Partner-Routing
        partner = None
        if spec["install"] == "partner" and is_valid_ch_zip(customer.zip or ""):
            ranked = route_partners(all_partners, customer.zip, vehicle.brand, top=1)
            if ranked:
                partner = ranked[0]["partner"]

        totals = calc_quote(vehicle, spec["warranty"], spec["install"], spec["channel"], spec["b2b_qty"])
        created_at = datetime.now() - timedelta(days=spec["days_ago"], hours=3)
        quote = Quote(
            ref_number=ref_number, customer_id=customer.id, vehicle_id=vehicle.id,
            partner_id=partner.id if partner else None, employee_id=employee.id,
            channel=spec["channel"], install_mode=spec["install"], warranty=spec["warranty"],
            b2b_qty=spec["b2b_qty"], items=totals["items"],
            base_price=totals["basePrice"], warranty_price=totals["warrantyPrice"],
            install_price=totals["installPrice"], shipping=totals["shipping"],
            subtotal=totals["subtotal"], vat_amount=totals["vatAmount"], total=totals["total"],
            status=spec["status"], created_at=created_at,
            sent_at=created_at + timedelta(days=1) if spec["status"] in ("versendet", "gewonnen", "verloren") else None,
        )
        db.add(quote)
        db.flush()
        ref_number += 1

        # Follow-ups
        for f in build_followup_dates(created_at):
            done = f["dayOffset"] <= spec["followups_done"] if spec["followups_done"] > 0 else False
            if spec["days_ago"] >= f["dayOffset"] and spec["followups_done"] >= f["dayOffset"]:
                done = True
            db.add(Followup(
                quote_id=quote.id, employee_id=employee.id,
                day_offset=f["dayOffset"], action=f["action"], channel=f["channel"],
                script=f["script"], due_at=f["dueAt"], done=done,
                done_at=f["dueAt"] + timedelta(hours=2) if done else None,
            ))

        # PDF erzeugen
        pdf_data = build_pdf_data(quote, customer, vehicle, partner, employee)
        quote.pdf_file = f"Offerte_{quote.ref_number}.pdf"
        generate_quote_pdf(pdf_data, str(QUOTES_DIR / quote.pdf_file))

    # Gewonnene Offerten: Partner-Kapazität hochzählen
    for q in db.query(Quote).filter(Quote.status == "gewonnen").all():
        if q.partner_id:
            q.partner.capacity_used += 1
    db.flush()

    # ─── V4.1: Termine (2 Wochen, realistische Testfahrten/Einbautermine) ──
    _seed_appointments(db, customers)

    # ─── V4.1: Rechnungen aus gewonnenen Offerten ──────────────────────────
    _seed_invoices(db)

    # ─── V4.1: Werkstatt-Aufträge (alle 4 Status-Stufen) ───────────────────
    _seed_workshop_orders(db)

    db.commit()


def _seed_appointments(db: Session, customers: List[Customer]) -> None:
    """12 Termine über aktuelle + nächste Woche verteilt."""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # (Kunden-Index, Fahrzeug-Suche, Typ, Tage ab heute, Stunde, Titel, Status, Dauer)
    specs = [
        (3,  ("Fiat", "500"),        "testfahrt", 0,  9,  "Testfahrt Fiat 500 — Vorführung", "bestaetigt", 60),
        (6,  ("Peugeot", "3008"),    "beratung",  0, 11,  "Beratung LET26 Hybrid",            "geplant",    45),
        (7,  ("Toyota", "C-HR"),     "testfahrt", 0, 14,  "Testfahrt Toyota C-HR",           "geplant",    60),
        (9,  ("Toyota", "Yaris"),    "einbau",    0, 15,  "Einbau LETx Hybrid Yaris",        "bestaetigt", 90),
        (0,  ("Toyota", "RAV4"),     "beratung",  1, 10,  "B2B-Beratung Seebach Garage",     "bestaetigt", 60),
        (4,  ("Opel", "Corsa"),      "einbau",    1, 13,  "Einbau Benzin-Satz Corsa",        "geplant",    75),
        (10, ("Opel", "Astra"),      "testfahrt", 2, 10,  "Testfahrt Opel Astra",            "geplant",    60),
        (2,  ("Peugeot", "308"),     "beratung",  3, 9,   "Firmenflotten-Beratung Moser AG", "geplant",    90),
        (11, ("Citroën", "Berlingo"),"einbau",    4, 8,   "Serien-Einbau Berlingo-Flotte",   "bestaetigt", 240),
        (1,  ("Toyota", "Corolla"),  "followup",  5, 11,  "Follow-up Daniela Brunner",       "geplant",    30),
        (5,  ("Citroën", "C4"),      "followup",  7, 14,  "Follow-up Thomas Wyss",           "geplant",    30),
        (8,  ("Fiat", "Panda"),      "testfahrt", 8, 10,  "Testfahrt Fiat Panda",            "geplant",    45),
    ]

    for ci, (brand, model_hint), typ, day_off, hour, title, status, dur in specs:
        vehicle = (
            db.query(Vehicle)
            .filter(Vehicle.brand == brand, Vehicle.model.ilike(f"{model_hint}%"))
            .order_by(Vehicle.hp_orig.desc())
            .first()
        )
        customer = customers[ci] if ci < len(customers) else None
        quote = None
        if customer:
            quote = (
                db.query(Quote)
                .filter(Quote.customer_id == customer.id)
                .order_by(Quote.created_at.desc())
                .first()
            )
        db.add(Appointment(
            title=title, type=typ,
            start_at=today + timedelta(days=day_off, hours=hour),
            duration_min=dur, status=status,
            customer_name=customer.name if customer else "Beispielkunde",
            customer_email=customer.email if customer else None,
            customer_phone=customer.phone if customer else None,
            location="Neuenhof" if typ != "einbau" or (customer and customer.zip == "5432") else "Partner-Garage",
            notes=None if typ != "testfahrt" else "Vorführfahrzeug betanken & waschen.",
            vehicle_id=vehicle.id if vehicle else None,
            quote_id=quote.id if quote else None,
        ))


def _seed_invoices(db: Session) -> None:
    """Rechnungen aus gewonnenen Offerten (2 bezahlt, 1 überfällig, 1 offen)."""
    won_quotes = (
        db.query(Quote)
        .filter(Quote.status == "gewonnen")
        .order_by(Quote.created_at.asc())
        .all()
    )
    if not won_quotes:
        return

    now = datetime.now()
    # (Tage zurück ausgestellt, Status, Tage bezahlt nach Ausstellung)
    plan = [
        (55, "bezahlt", 12),
        (27, "bezahlt", 9),
        (40, "ueberfaellig", None),
        (12, "offen", None),
    ]

    for idx, (days_ago, status, paid_after) in enumerate(plan):
        q = won_quotes[idx % len(won_quotes)]
        issued = now - timedelta(days=days_ago, hours=2)
        due = issued + timedelta(days=30)
        paid_at = issued + timedelta(days=paid_after) if paid_after is not None else None
        # Rechnungsnummer: RE-2026-0xx
        inv = Invoice(
            invoice_number=f"RE-2026-{101 + idx}",
            customer_name=q.customer.name,
            customer_email=q.customer.email,
            customer_zip=q.customer.zip,
            customer_city=q.customer.city,
            subtotal=q.subtotal, vat_amount=q.vat_amount, total=q.total,
            status=status, payment_terms=30,
            issued_at=issued, due_at=due, paid_at=paid_at,
            vehicle_id=q.vehicle_id, quote_id=q.id,
        )
        db.add(inv)


def _seed_workshop_orders(db: Session) -> None:
    """6 Werkstatt-Aufträge über alle 4 Status-Stufen."""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    quotes = db.query(Quote).order_by(Quote.created_at.desc()).limit(8).all()

    # (Quote-Index, Status, Fortschritt %, Mechaniker, Tage ab heute, Stunde)
    specs = [
        (0, "geplant",     0,   "Luca Berlinger",   1, 8),
        (2, "geplant",     0,   "Sven Achermann",   2, 10),
        (3, "in_arbeit",   60,  "Luca Berlinger",   0, 8),
        (4, "in_arbeit",   35,  "Marco Fontana",    0, 11),
        (5, "qualitaet",   90,  "Sven Achermann",   -1, 14),
        (1, "abgeschlossen", 100, "Marco Fontana",  -3, 9),
    ]

    for qi, status, progress, mechanic, day_off, hour in specs:
        q = quotes[qi % len(quotes)] if quotes else None
        vehicle = q.vehicle if q else None
        db.add(WorkshopOrder(
            order_number=f"WS-{2001 + qi}",
            customer_name=q.customer.name if q else "Beispielkunde",
            customer_phone=q.customer.phone if q else None,
            status=status, mechanic=mechanic,
            scheduled_at=today + timedelta(days=day_off, hours=hour),
            install_min=vehicle.install_min if vehicle else 15,
            progress=progress,
            notes="QS-Checkliste: Fehlerspeicher auslesen, Probeaufahrt 15 km."
                  if status == "qualitaet" else None,
            vehicle_id=vehicle.id if vehicle else None,
            quote_id=q.id if q else None,
            partner_id=q.partner_id if q else None,
        ))
