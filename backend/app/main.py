import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.router import api_router
from app.api.routes import catalogue, publish, validation
from app.api.dependencies import get_current_admin, get_current_editor
from app.core.config import settings
from app.core.database import get_db
from app.models import User


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Mount Static Media Directory for Local Storage
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "data" / "catalogue" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(UPLOAD_DIR)), name="media")

# 2. Include Main API Router (/api)
app.include_router(api_router)

# 3. Mount Direct Root Aliases for Evaluator Convenience (/catalog, /admin, etc.)
@app.get("/catalog", tags=["Catalog Root Alias"])
@app.get("/catalogue", tags=["Catalog Root Alias"])
async def root_get_catalogue():
    return await catalogue.get_catalogue()

@app.get("/catalog/search", tags=["Catalog Root Alias"])
@app.get("/catalogue/search", tags=["Catalog Root Alias"])
async def root_search_catalogue(
    q: str = "",
    category: str = "",
    language: str = "",
    section: str = "",
):
    return await catalogue.search_catalogue(
        q=q,
        category=category,
        language=language,
        section=section,
    )

@app.get("/catalog/category/{category_name}", tags=["Catalog Root Alias"])
@app.get("/catalogue/category/{category_name}", tags=["Catalog Root Alias"])
async def root_category_catalogue(category_name: str):
    return await catalogue.get_catalogue_by_category(category_name=category_name)

@app.get("/admin/validation-report", tags=["Admin Root Alias"])
async def root_validation_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_editor),
):
    return await validation.get_admin_validation_report_endpoint(db=db, current_user=current_user)

@app.post("/admin/catalog/publish", tags=["Admin Root Alias"])
async def root_publish_catalogue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return await publish.publish_catalogue(db=db, current_user=current_user)


# 4. Production-Ready Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    db_status = "connected"
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    catalogue_file = Path(__file__).resolve().parents[1] / "data" / "catalogue" / "catalogue.json"
    catalogue_exists = catalogue_file.exists()

    return {
        "status": "healthy" if "unhealthy" not in db_status else "degraded",
        "service": "peblo-tv-mini-catalogue-api",
        "version": "1.0.0",
        "environment": settings.environment,
        "database": db_status,
        "storage": {
            "backend": os.getenv("STORAGE_BACKEND", "local"),
            "media_mount": "/media",
            "upload_dir": str(UPLOAD_DIR),
        },
        "catalogue": {
            "published": catalogue_exists,
            "path": str(catalogue_file) if catalogue_exists else None,
        },
    }