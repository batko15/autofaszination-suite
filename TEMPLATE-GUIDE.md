# TEMPLATE-GUIDE — Dieselbe Suite für andere Projekte verwenden

**Diese Anleitung zeigt, wie Sie aus der AutoFaszination-Suite in wenigen Minuten
ein komplett anderes Projekt machen — ohne Programmieren.**

Die Suite ist ab **V5.0 eine White-Label-Vorlage**: Alle Markennamen, Firmdaten,
Login-Texte, Statistiken, Demo-Benutzer, Module und die Akzentfarbe liegen an
**einer zentralen Stelle** pro Anwendung. Der restliche Code bleibt unangetastet
und update-fähig.

> Es existieren zwei Zwillinge derselben Suite:
> | Variante | Technik | Rebrand-Datei |
> |---|---|---|
> | **A. Python-Suite** (dieses Repo) | FastAPI + Vanilla-JS, läuft überall offline | `app/config.py` → `BRANDING` |
> | **B. Next.js-Suite** | React + Tailwind (Web-Preview) | `src/config/branding.ts` → `BRANDING` |
>
> Beide folgen demselben Prinzip und derselben Datenstruktur.

---

## 1. Rebrand in 5 Minuten (Python-Suite)

### Schritt 1 — Marke & Texte: `app/config.py` öffnen

Suchen Sie das Wörterbuch `BRANDING` (ca. Zeile 14) und ändern Sie nur diese Werte:

```python
BRANDING = {
    "version": "5.0.0",
    "brand": {
        "nameParts": ["Rad", "Werk"],          # Teil 2 erscheint in Akzentfarbe
        "tagline": "Werkstatt & Service Suite",
    },
    "login": {
        "eyebrow": "Service-Plattform",
        "lead": "Das Mitarbeiter-Portal für …",
        "facts": [
            {"v": "12", "l": "Standorte"},
            {"v": "3'400", "l": "Kunden"},
        ],
        "footNote": "Muster AG · Zürich",
    },
    "shell": {
        "brandMark": "RW",                      # 2 Buchstaben im Sidebar-Logo
        "legal": "Service · Werkstatt · Schweiz",
        "live": "System aktiv",
    },
}
```

Das Frontend lädt diese Werte beim Start über `/api/v1/branding` — Name, Tagline,
Version, Logo-Kürzel und Fusszeilen passen sich automatisch an (inkl. Browser-Titel).

### Schritt 2 — Firma & PDF-Briefkopf: `COMPANY` im selben File

```python
COMPANY = {
    "name": "Muster AG",
    "street": "Bahnhofstrasse 1",
    "city": "8001 Zürich",
    "tel": "+41 44 000 00 00",
    "email": "info@muster.ch",
    "web": "www.muster.ch",
    ...
}
```

Diese Daten stehen automatisch auf den Offerten-PDFs und in den Einstellungen.

### Schritt 3 — Akzentfarbe: `app/static/assets/css/af.css` öffnen

Im Block `:root` → `Design-Tokens` gibt es **genau einen dokumentierten Block**:

```css
/* ═══ WHITE-LABEL-AKZENTFARBE — diese 5 Werte für ein Rebrand ändern ═══ */
--brand:      #E2001A;   /* Primär-Akzent (Flächen, aktive Zustände) */
--brand-2:    #FF3B52;   /* Heller Akzent (Hover, Fokus, Text) */
--brand-dark: #A60013;   /* Dunkler Akzent (Gradient-Ende) */
--brand-tint: rgba(226, 0, 26, .10);
--brand-glow: rgba(226, 0, 26, .32);
```

Beispiel **Racing-Grün**: `--brand:#00A651; --brand-2:#3ED584; --brand-dark:#006B36;`
Tint/Glow in `rgba(0,166,81,.10)` / `rgba(0,166,81,.32)`.
Die komplette Oberfläche (Buttons, Charts, Badges, aktive Navigation, Glow-Effekte)
folgt sofort — kein weiterer CSS-Eingriff nötig.

### Schritt 4 — Demo-Benutzer & Modul-Bezeichnungen (optional)

- **Demo-Benutzer** (Login-Chips): `app/seed.py` → Abschnitt Mitarbeiter; danach
  `data/db.sqlite3` löschen (wird beim nächsten Start neu aufgebaut).
- **Modulnamen/Hints** (z. B. «Werkstatt» → «Aufträge»): `app/static/assets/js/af-app.js`
  → Array `ROUTES` (label je Route) — sichtbar in Sidebar, Breadcrumb und Palette.
- **Kurs/Sprache/Preislogik**: `app/config.py` (`COMPANY`, Straßenzuschläge etc.)
  sowie `app/services/pricing.py` für Preislisten-Logik.

### Schritt 5 — Neustart & prüfen

```
start.bat        (Windows)     bzw.     ./start.sh    (Linux/macOS)
```

Anschliessend prüfen: Login-Seite zeigt neuen Namen, Sidebar-Logo das neue Kürzel,
PDFs den neuen Briefkopf, Buttons die neue Farbe. **Fertig.**

---

## 2. Rebrand in 5 Minuten (Next.js-Suite)

### Schritt 1 — Alles Zentrale: `src/config/branding.ts`

Die **eine Datei** enthält Marke, Firma, Login-Hero, Statistiken, Zertifikate,
Demo-Benutzer, Footer und die komplette **Modul-Registry**:

```ts
modules: [
  { id: "cockpit", group: "vertrieb", label: "Cockpit", hint: "KPIs & Pipeline",
    title: "Vertriebs-Cockpit", subtitle: "…", icon: "layout-dashboard", enabled: true },
  { id: "werkstatt", …, enabled: false },   // ← false blendet das Modü  aus
]
```

`enabled: false` entfernt ein Modul automatisch aus Sidebar, Topbar,
Command-Palette und Navigation — ideale Möglichkeit, die Suite für Branchen ohne
Werkstatt/Partner-Netz zu verschlanken.

### Schritt 2 — Akzentfarbe: `src/app/globals.css`

Im Block `:root` → `WHITE-LABEL-AKZENTFARBE` **einen** Wert ändern:

```css
--brand: oklch(0.55 0.23 27);   /* Rot (Standard) */
/* Beispiele: Grün oklch(0.55 0.15 155) · Blau oklch(0.55 0.18 255) · Gold oklch(0.70 0.15 85) */
```

`--primary`, `--ring`, Charts, Badges und alle Glow-Effekte leiten sich davon ab
(teilweise via `color-mix`), der Rest der Suite folgt automatisch.

### Schritt 3 — Lint & Test

```
bun run lint     # muss fehlerfrei durchlaufen
```

---

## 3. Was passiert wo — Überblick der Rebrand-Punkte

| Element | Python-Suite | Next.js-Suite |
|---|---|---|
| Markenname / Tagline | `config.py → BRANDING.brand` | `branding.ts → brand` |
| Login-Headline & -Statistiken | `BRANDING.login` | `branding.ts → login` |
| Firmenadresse / PDF-Briefkopf | `config.py → COMPANY` | `branding.ts → company` (+ `lib/pricing.ts` für Preisregeln) |
| Demo-Benutzer | `seed.py` | `branding.ts → users` |
| Akzentfarbe | `af.css → --brand*` (5 Werte) | `globals.css → --brand` (1 Wert) |
| Module ein-/ausschalten | `af-app.js → ROUTES` (Zeile entfernen) | `branding.ts → modules[].enabled` |
| Fusszeile / Ansprüche | `BRANDING.shell.legal` | `branding.ts → footer.notes` |
| Browser-Titel | automatisch (API) | automatisch (`layout.tsx` liest Config) |

---

## 4. Empfohlener Workflow für Kundenprojekte

1. **Repo als Vorlage kopieren** — GitHub-Button «Use this template» oder ZIP entpacken;
   niemals im Original weiterentwickeln.
2. `TEMPLATE-GUIDE.md` durchgehen (Schritte 1–3 der passenden Variante).
3. Bezeichnungen übersetzen/ändern (Module, Login-Texte, Statistiken).
4. Akzentfarbe auf die Kunden-CI einstellen (Farbwerte oben).
5. Testdaten prüfen: Demo-Offerten/Kunden/Termine mit realistischen Beispielen des
   Kunden füllen (Python: `app/seed.py`).
6. Erst wenn alles sitzt: eigene Feature-Wünsche des Kunden umsetzen — die
   White-Label-Schichten bleiben dabei unberührt, Updates des Originals lassen sich
   weiterhin sauber übernehmen.

---

## 5. Grenzen des Templating (ehrlich)

- **Domain-spezifische Inhalte** in den Modulen (z. B. «LET26-Tuning», MwSt 8.1 %,
  Preisliste 2026) sind Teil der Business-Logik, nicht der Marke — sie leben in
  `pricing.py` (Python) bzw. `lib/pricing.ts` (Next.js) und müssen für eine andere
  Branche fachlich angepasst werden.
- **Datenbank-Inhalte** (Fahrzeuge, Partner, Offerten) sind Beispieldaten —
  über die Import-Schnittstelle (Python-Suite) oder Seed-Skripte ersetzen.
- Die **Rechte-Struktur** (Rollen Geschäftsführung/Vertrieb/Verkauf) ist als
  Demo-Authentifizierung ausgelegt; für Produktionssysteme sollte ein echtes
  Auth-Modul ergänzt werden.

*Stand: V5.0.0 — White-Label-Ausbaustufe (zentrale Branding-Konfiguration,
Design-Token-Akzentfarbe, Modul-Registry, dynamisches Frontend-Branding).*
