"""AutoFaszination Performance & B2B Sales Suite — FastAPI-Anwendung.

Liefert die REST-API unter /api/v1/* und die gebaute Mitarbeiter-Web-Oberfläche
(React/Tailwind) als statische Dateien aus app/static aus.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_NAME, APP_VERSION, STATIC_DIR
from .database import SessionLocal, init_db
from .routers import (appointments, auth, customers, dashboard, followups,
                      importer, invoices, partners, quotes, reports, search,
                      settings, vehicles, workshop)
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Datenbank anlegen und beim ersten Start automatisch befüllen
    init_db()
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "Mitarbeiter-Web-Oberfläche für die LET26-Produktlinie — "
        "Fahrzeug-Konfigurator, Schweizer Offerten-PDF, B2B-Partner-Routing "
        "und Vertriebs-Cockpit. Schnell & Friends GmbH · AutoFaszination."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── REST-API v1 ─────────────────────────────────────────────────────────────
for router in (auth.router, vehicles.router, quotes.router, customers.router,
               partners.router, followups.router, dashboard.router,
               settings.router, importer.router,
               appointments.router, invoices.router, workshop.router,
               reports.router, search.router):
    app.include_router(router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["System"])
def health():
    return {"status": "ok", "app": APP_NAME, "version": APP_VERSION}


# ─── Statische Assets der Web-Oberfläche ─────────────────────────────────────
_assets_dir = STATIC_DIR / "assets"
if _assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

# Cache-Strategie: index.html immer frisch laden (kein Browser-Cache),
# versionierte Assets (?v=…) dürfen beliebig gecacht werden.
_NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate"}


@app.get("/{full_path:path}", include_in_schema=False)
def spa_catch_all(full_path: str):
    """Liefert die Web-App (index.html) für alle Nicht-API-Routen (SPA-Modus)."""
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "Nicht gefunden."}, status_code=404)
    if full_path and "." in full_path:
        candidate = STATIC_DIR / full_path
        if candidate.is_file() and ".." not in full_path:
            return FileResponse(candidate, headers={
                "Cache-Control": "no-cache",
            })
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index, headers=_NO_CACHE)
    return JSONResponse(
        {"detail": "Frontend noch nicht gebaut — bitte README.md befolgen."},
        status_code=404,
    )
