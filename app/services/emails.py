"""AutoFaszination Suite — E-Mail-Versand-Mockup (Kunde, Vertrieb, Partner).

Protokolliert den automatischen Versand ohne echten SMTP-Account.
Skripte aus «Leitfaden Mischa» (Gradliniges Verkaufssystem LET26).
"""
from typing import Any, Dict, Optional


def build_customer_email(params: Dict[str, Any]) -> Dict[str, str]:
    subject = f"Ihre AutoFaszination Offerte Nr. {params['refNumber']} — LET26 Leistungssteigerung"
    install_mode = params.get("installMode", "self")
    body_lines = [
        f"Lieber Kunde {params['customerName']},",
        "",
        "herzlichen Dank für Ihr Interesse an der LET26-Optimierung.",
        f"Anbei erhalten Sie Ihre persönliche Offerte (Referenz-Nr. {params['refNumber']}) für:",
        "",
        f"  {params['vehicleLabel']}",
        "",
    ]
    if install_mode == "partner":
        body_lines.append(
            f"Der Einbau erfolgt bequem bei Ihrer Partner-Garage vor Ort: {params.get('partnerLabel', 'Partner-Garage')}. "
            "Wir leiten Ihre Anfrage direkt weiter — die Garage meldet sich innert 24 Stunden für die Terminvereinbarung."
        )
    else:
        body_lines.append(
            "Der Selbsteinbau erfolgt dank Original-Steckverbinder (Plug & Play) in wenigen Minuten — "
            "die beiliegende Einbauanleitung führt Sie Schritt für Schritt."
        )
    body_lines += [
        "",
        "Sollten Sie Fragen haben, erreichen Sie uns unter +41 44 552 28 28.",
        "",
        "Sportliche Grüsse",
        "Ihr AutoFaszination Team — Schnell & Friends GmbH, Neuenhof",
    ]
    return {"subject": subject, "body": "\n".join(body_lines)}


def build_sales_email(params: Dict[str, Any]) -> Dict[str, str]:
    subject = f"[Vertrieb] Neue Offerte #{params['refNumber']} — {params['customerName']} ({params['customerZip']})"
    channel = params.get("channel", "b2c")
    body = "\n".join([
        "Neue Offerte über das Mitarbeiter-Tool erstellt:",
        "",
        f"  Referenz:      {params['refNumber']}",
        f"  Kunde:         {params['customerName']}, {params['customerZip']}",
        f"  Fahrzeug:      {params['vehicleLabel']}",
        f"  Kanal:         {'B2B Markenhaus' if channel == 'b2b' else 'B2C Direktvertrieb'}",
        f"  Volumen:       CHF {params['total']:,.2f}".replace(",", "'"),
        f"  Routing:       {params.get('partnerLabel') or 'Selbsteinbau (Direktversand)'}",
        "",
        "Follow-up-Sequenz gem. LET26-Vertriebs-Guide automatisch geplant: Tag 1 / Tag 3 / Tag 7.",
        "",
        "Vertrieb · Schnell & Friends GmbH",
    ])
    return {"subject": subject, "body": body}


def build_partner_email(params: Dict[str, Any]) -> Dict[str, str]:
    subject = f"[Partner-Auftrag] Einbauanfrage {params['customerName']} ({params['customerZip']})"
    body = "\n".join([
        f"Guten Tag {params['partnerCompany']},",
        "",
        f"unsere Kundschaft {params['customerName']} ({params['customerZip']} {params.get('customerCity', '')}) hat eine",
        "LET26-Optimierung mit Einbau bei Ihnen bestellt bzw. angefragt:",
        "",
        f"  Fahrzeug:      {params['vehicleLabel']}",
        f"  Einbauzeit:    ca. {params.get('installMin', 15)} Minuten (Original-Steckverbinder, Plug & Play)",
        f"  Produkt:       {params.get('productName', 'LET26 Komplettsatz')}",
        "",
        "Bitte nehmen Sie innert 24 Stunden direkt mit dem Kunden Kontakt auf, um den Termin zu vereinbaren.",
        "Der SET wird Ihnen zugestellt, die Einbauanleitung liegt bei.",
        "",
        "Herzlichen Dank für die Zusammenarbeit — Ihr AutoFaszination Team, Schnell & Friends GmbH",
        "Tel. +41 44 552 28 28 · info@autofaszination.ch",
    ])
    return {"subject": subject, "body": body}


def build_quote_emails(quote, customer, vehicle, partner: Optional[Any] = None) -> Dict[str, Dict[str, str]]:
    """Alle drei E-Mail-Protokolle zu einer Offerte (Kunde / Vertrieb / Partner)."""
    vehicle_label = f"{vehicle.brand} {vehicle.model} · {vehicle.engine}"
    partner_label = f"{partner.company}, {partner.zip} {partner.city}" if partner else None
    emails: Dict[str, Dict[str, str]] = {
        "customer": build_customer_email({
            "customerName": customer.name,
            "refNumber": quote.ref_number,
            "total": quote.total,
            "vehicleLabel": vehicle_label,
            "installMode": quote.install_mode,
            "partnerLabel": partner_label,
        }),
        "sales": build_sales_email({
            "refNumber": quote.ref_number,
            "customerName": customer.name,
            "customerZip": customer.zip or "",
            "total": quote.total,
            "vehicleLabel": vehicle_label,
            "channel": quote.channel,
            "partnerLabel": partner_label,
        }),
    }
    if quote.install_mode == "partner" and partner is not None:
        emails["partner"] = build_partner_email({
            "partnerCompany": partner.company,
            "customerName": customer.name,
            "customerZip": customer.zip or "",
            "customerCity": customer.city or "",
            "vehicleLabel": vehicle_label,
            "installMin": vehicle.install_min,
        })
    return emails
