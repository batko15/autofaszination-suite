"""AutoFaszination Suite — PDF-Offerten-Engine (ReportLab).

Layout analog zur AutoFaszination-Offerten-Vorlage (Offerte_10900):
Firmenkopf, Adressblock, Referenz-Felder, Positionstabelle mit Rabatt,
Warenwert/Porto/MwSt 8.1 %/Total, Leistungsausweis, Fusszeile.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas as pdfcanvas

from ..config import COMPANY
from .pricing import VAT_RATE, SHIPPING_CHF, chf

# AutoFaszination-Farben
AF_RED = HexColor("#C91221")
AF_BLACK = HexColor("#191A1E")
AF_DARK = HexColor("#3F4046")
AF_SILVER = HexColor("#9EA3AB")
AF_LIGHT = HexColor("#EDEEF0")
AF_WHITE = HexColor("#FFFFFF")

PAGE_W, PAGE_H = A4
MARGIN_L, MARGIN_R = 48, 48
MARGIN_T, MARGIN_B = 42, 46


def _wrap_text(c, text: str, font: str, size: float, max_w: float) -> List[str]:
    lines: List[str] = []
    for raw in text.split("\n"):
        words = raw.split(" ")
        line = ""
        for w in words:
            test = f"{line} {w}".strip()
            if c.stringWidth(test, font, size) > max_w and line:
                lines.append(line)
                line = w
            else:
                line = test
        lines.append(line)
    return lines


def generate_quote_pdf(data: Dict[str, Any], out_path: str) -> str:
    """Erstellt die Offerten-PDF und schreibt sie nach out_path."""
    c = pdfcanvas.Canvas(out_path, pagesize=A4)
    c.setTitle(f"Offerte {data['refNumber']} — AutoFaszination")
    c.setAuthor(COMPANY["name"])
    c.setSubject("LET26 Motor- und Gaspedaloptimierung")

    _draw_header(c, data)
    _draw_address_block(c, data)
    _draw_meta(c, data)
    _draw_title_intro(c, data)
    y = _draw_items_table(c, data)
    _draw_totals(c, data, y)
    data["perfTop"] = y - 4  # Leistungsausweis links neben den Totalen
    _draw_performance_box(c, data)
    _draw_terms_footer(c, data)

    c.showPage()
    c.save()
    return out_path


def _draw_header(c, data: Dict[str, Any]) -> None:
    # Firmenkopf links
    c.setFillColor(AF_BLACK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN_L, PAGE_H - 52, COMPANY["name"])
    c.setFont("Helvetica", 8.5)
    c.setFillColor(AF_DARK)
    for i, line in enumerate([COMPANY["street"], COMPANY["city"],
                              f"Tel. {COMPANY['tel']}", f"Fax  {COMPANY['fax']}",
                              COMPANY["email"]]):
        c.drawString(MARGIN_L, PAGE_H - 64 - i * 11, line)

    # AF-Logo rechts (rotes Quadrat + Wortmarke)
    logo_x, logo_y = PAGE_W - MARGIN_R - 46, PAGE_H - 76
    c.setFillColor(AF_RED)
    c.roundRect(logo_x, logo_y, 46, 46, 5, stroke=0, fill=1)
    c.setFillColor(AF_WHITE)
    c.setFont("Helvetica-Bold", 21)
    c.drawCentredString(logo_x + 23, logo_y + 17, "AF")
    c.setFillColor(AF_BLACK)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(logo_x + 23, logo_y - 11, "AUTOFASZINATION")
    c.setFillColor(AF_SILVER)
    c.setFont("Helvetica", 6.3)
    c.drawCentredString(logo_x + 23, logo_y - 20, "Motor- und Gaspedaloptimierung")

    # Trennlinie (rot)
    c.setStrokeColor(AF_RED)
    c.setLineWidth(1.6)
    c.line(MARGIN_L, PAGE_H - 128, PAGE_W - MARGIN_R, PAGE_H - 128)


def _draw_address_block(c, data: Dict[str, Any]) -> None:
    cust = data.get("customer", {})
    x = PAGE_W - MARGIN_R - 210
    y = PAGE_H - 158
    c.setFillColor(AF_BLACK)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(x, y, cust.get("name", ""))
    c.setFont("Helvetica", 9)
    c.setFillColor(AF_DARK)
    for i, line in enumerate([cust.get("salutationLine", ""), cust.get("street", ""),
                              f"{cust.get('zip', '')} {cust.get('city', '')}".strip()]):
        if line:
            c.drawString(x, y - 13 - i * 12, line)


def _draw_meta(c, data: Dict[str, Any]) -> None:
    y = PAGE_H - 168
    c.setFillColor(AF_DARK)
    c.setFont("Helvetica", 8.5)
    meta = [
        ("Kundennummer:", str(data.get("customerNumber", ""))),
        ("Referenz-Nr.:", str(data["refNumber"])),
        ("Ansprechpartner:", data.get("salesContact", COMPANY["salesContact"])),
        ("Bearbeiter/in:", data.get("employeeName", "")),
    ]
    for label, value in meta:
        c.setFillColor(AF_SILVER)
        c.drawString(MARGIN_L, y, label)
        c.setFillColor(AF_BLACK)
        c.drawString(MARGIN_L + 78, y, value)
        y -= 12.5

    # Datumszeile rechts
    date_str = data.get("dateText") or datetime.now().strftime("%d. %B %Y")
    c.setFillColor(AF_DARK)
    c.setFont("Helvetica", 8.5)
    c.drawRightString(PAGE_W - MARGIN_R, y + 12, f"{COMPANY['city'].split('/')[-1]} AG, {date_str}")


def _draw_title_intro(c, data: Dict[str, Any]) -> None:
    y = PAGE_H - 236
    c.setFillColor(AF_BLACK)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(MARGIN_L, y, "Offerte")
    c.setStrokeColor(AF_SILVER)
    c.setLineWidth(0.6)
    c.line(MARGIN_L, y - 7, MARGIN_L + 120, y - 7)

    intro = (
        "Lieber Kunde\n\n"
        "Herzlichen Dank für Ihr Interesse, wir freuen uns sehr, Ihnen nachfolgende Offerte "
        "zu unterbreiten und sichern Ihnen eine fristgerechte Lieferung zu."
    )
    c.setFillColor(AF_DARK)
    c.setFont("Helvetica", 9)
    yy = y - 26
    for line in intro.split("\n"):
        if line:
            for wrapped in _wrap_text(c, line, "Helvetica", 9, PAGE_W - MARGIN_L - MARGIN_R):
                c.drawString(MARGIN_L, yy, wrapped)
                yy -= 12
        else:
            yy -= 6


def _draw_items_table(c, data: Dict[str, Any]) -> float:
    items: List[Dict[str, Any]] = data.get("items", [])
    # Tabellenkopf
    top = PAGE_H - 330
    col_x = _item_columns()
    headers = ["Art.-Nr.", "Beschreibung", "Einheit", "Anzahl", "Preis", "Rab%", "Wert SC"]
    c.setFillColor(AF_BLACK)
    c.rect(MARGIN_L, top, PAGE_W - MARGIN_L - MARGIN_R, 18, stroke=0, fill=1)
    c.setFillColor(AF_WHITE)
    c.setFont("Helvetica-Bold", 8)
    aligns = {3: "right", 4: "right", 5: "right", 6: "right"}
    for i, h in enumerate(headers):
        if i in aligns:
            c.drawRightString(col_x[i + 1] - 6, top + 5.5, h)
        else:
            c.drawString(col_x[i] + 6, top + 5.5, h)

    # Zeilen
    y = top
    desc_w = col_x[2] - col_x[1] - 12
    for idx, item in enumerate(items):
        desc_lines = _wrap_text(c, str(item.get("description", "")), "Helvetica", 8, desc_w)
        row_h = max(18, 11 * len(desc_lines) + 8)
        if idx % 2 == 1:
            c.setFillColor(AF_LIGHT)
            c.rect(MARGIN_L, y - row_h, PAGE_W - MARGIN_L - MARGIN_R, row_h, stroke=0, fill=1)
        c.setFillColor(AF_BLACK)
        c.setFont("Helvetica", 8)
        c.drawString(col_x[0] + 6, y - 12, str(item.get("artNo", "")))
        c.setFillColor(AF_DARK)
        for li, line in enumerate(desc_lines):
            c.drawString(col_x[1] + 6, y - 12 - li * 11, line)
        c.setFillColor(AF_BLACK)
        c.drawString(col_x[2] + 6, y - 12, str(item.get("unit", "Stk.")))
        c.drawRightString(col_x[4] - 6, y - 12, str(item.get("qty", 1)))
        c.drawRightString(col_x[5] - 6, y - 12, chf(float(item.get("price", 0))))
        rab = item.get("discountPct", 0)
        c.drawRightString(col_x[6] - 6, y - 12, f"{rab}%" if rab else "")
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(col_x[7] - 6, y - 12, chf(float(item.get("total", 0))))
        y -= row_h

    # Abschlusslinie
    c.setStrokeColor(AF_SILVER)
    c.setLineWidth(0.7)
    c.line(MARGIN_L, y, PAGE_W - MARGIN_R, y)
    return y


def _item_columns() -> List[float]:
    w = PAGE_W - MARGIN_L - MARGIN_R
    return [
        MARGIN_L,
        MARGIN_L + w * 0.10,   # Art-Nr
        MARGIN_L + w * 0.535,  # Beschreibung
        MARGIN_L + w * 0.625,  # Einheit
        MARGIN_L + w * 0.69,   # Anzahl
        MARGIN_L + w * 0.79,   # Preis
        MARGIN_L + w * 0.87,   # Rab
        MARGIN_L + w,          # Wert
    ]


def _draw_totals(c, data: Dict[str, Any], y: float) -> None:
    x_label = PAGE_W - MARGIN_R - 190
    x_value = PAGE_W - MARGIN_R
    yy = y - 22
    rows: List[tuple] = [
        ("Warenwert gesamt", chf(data["subtotal"]), False),
        ("Porto und Verpackung", chf(data.get("shipping", SHIPPING_CHF)), False),
        ("Zwischensumme netto", chf(data["subtotal"] + data.get("shipping", SHIPPING_CHF)), False),
        (f"MwSt. {VAT_RATE * 100:.1f} %", chf(data["vatAmount"]), False),
    ]
    c.setFont("Helvetica", 8.5)
    for label, value, _ in rows:
        c.setFillColor(AF_DARK)
        c.drawString(x_label, yy, label)
        c.setFillColor(AF_BLACK)
        c.drawRightString(x_value, yy, value)
        yy -= 13

    # Total-Balken
    c.setFillColor(AF_RED)
    c.rect(x_label - 10, yy - 4, x_value - x_label + 10, 20, stroke=0, fill=1)
    c.setFillColor(AF_WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x_label, yy + 2, "Total CHF")
    c.drawRightString(x_value, yy + 2, chf(data["total"]))

    # Rekapitulation
    yy -= 26
    c.setFillColor(AF_SILVER)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x_label - 10, yy, "REKAPITULATION")
    c.setFillColor(AF_DARK)
    c.setFont("Helvetica", 7.5)
    c.drawString(x_label - 10, yy - 10, f"Warenwert netto CHF {chf(data['subtotal'] + data.get('shipping', SHIPPING_CHF))} "
                                         f"zuzüglich MwSt. {VAT_RATE * 100:.1f} % = CHF {chf(data['total'])}")
    return yy


def _draw_performance_box(c, data: Dict[str, Any]) -> None:
    v = data.get("performance") or {}
    if not v:
        return
    x, w = MARGIN_L, 240
    top = data.get("perfTop")
    if not top:
        return
    c.setFillColor(AF_LIGHT)
    c.roundRect(x, top - 86, w, 80, 4, stroke=0, fill=1)
    c.setFillColor(AF_RED)
    c.roundRect(x, top - 14, w, 3, 0, stroke=0, fill=1)
    c.setFillColor(AF_BLACK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 10, top - 26, "LEISTUNGSAUSWEIS LET26 (VORHER → NACHHER)")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(AF_DARK)
    rows = [
        f"Leistung:   {v.get('hpOrig', '-')} PS  →  {v.get('hpTuned', '-')} PS   (+{v.get('hpGainPct', 0)} %)",
        f"Drehmoment: {v.get('nmOrig', '-')} Nm  →  {v.get('nmTuned', '-')} Nm   (+{v.get('nmGainPct', 0)} %)",
        f"Verbrauch:  bis {v.get('fuelSavingPct', 0)} % Ersparnis · Einbauzeit ca. {v.get('installMin', 15)} Min.",
    ]
    for i, row in enumerate(rows):
        c.drawString(x + 10, top - 40 - i * 12, row)


def _draw_terms_footer(c, data: Dict[str, Any]) -> None:
    c.setStrokeColor(AF_SILVER)
    c.setLineWidth(0.6)
    c.line(MARGIN_L, MARGIN_B + 42, PAGE_W - MARGIN_R, MARGIN_B + 42)
    c.setFillColor(AF_DARK)
    c.setFont("Helvetica", 7)
    terms = [
        f"Offerte gültig 14 Tage ab Datum · Zahlungsziel 30 Tage netto · Preise inkl. {VAT_RATE * 100:.1f} % MwSt.",
        "ESA/EGA-listiert (eintragungsfrei) · Motorgarantie über Zürich Versicherung optional · Gültigkeit: Schweiz/Liechtenstein",
    ]
    for i, t in enumerate(terms):
        c.drawString(MARGIN_L, MARGIN_B + 30 - i * 10, t)
    c.setFillColor(AF_SILVER)
    c.drawString(MARGIN_L, MARGIN_B + 6,
                 f"{COMPANY['name']} · {COMPANY['street']} · {COMPANY['city']} · {COMPANY['tel']} · {COMPANY['web']}")
    c.drawRightString(PAGE_W - MARGIN_R, MARGIN_B + 6, "Seite 1")


def build_pdf_data(quote, customer, vehicle, partner, employee) -> Dict[str, Any]:
    """Bündelt alle Offerten-Daten für den PDF-Generator."""
    from .pricing import calc_performance
    perf = calc_performance(vehicle)
    return {
        "refNumber": quote.ref_number,
        "customerNumber": customer.customer_nr,
        "customer": {
            "name": customer.name,
            "salutationLine": "Zuhanden Kundschaft" if customer.channel == "b2c" else "Zuhanden Geschäftsleitung",
            "street": customer.street or "",
            "zip": customer.zip or "",
            "city": customer.city or "",
        },
        "salesContact": COMPANY["salesContact"],
        "employeeName": employee.name if employee else "",
        "dateText": quote.created_at.strftime("%d. %B %Y"),
        "items": quote.items,
        "subtotal": quote.subtotal,
        "shipping": quote.shipping,
        "vatAmount": quote.vat_amount,
        "total": quote.total,
        "performance": {
            "hpOrig": vehicle.hp_orig, "hpTuned": vehicle.hp_tuned,
            "nmOrig": vehicle.nm_orig, "nmTuned": vehicle.nm_tuned,
            "hpGainPct": perf["hpGainPct"], "nmGainPct": perf["nmGainPct"],
            "fuelSavingPct": vehicle.fuel_saving, "installMin": vehicle.install_min,
        },
        "partnerLabel": f"{partner.company}, {partner.zip} {partner.city}" if partner else None,
        "perfTop": None,  # wird beim Zeichnen gesetzt
    }
