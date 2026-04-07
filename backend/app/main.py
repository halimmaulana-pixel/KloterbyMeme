import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.admin import AdminUser
from seed_data import seed

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        version="0.1.0",
    )

    @app.on_event("startup")
    def on_startup():
        # Create tables
        Base.metadata.create_all(bind=engine)
        # Check if we need to seed
        db = SessionLocal()
        try:
            admin = db.query(AdminUser).first()
            if not admin:
                print("No admin found. Seeding data...")
                seed()
        finally:
            db.close()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["system"])
    def healthcheck(db=Depends(get_db)) -> dict[str, any]:
        from app.models.admin import AdminUser
        admin_exists = db.query(AdminUser).first() is not None
        return {
            "status": "ok", 
            "app": settings.app_name, 
            "database_initialized": admin_exists
        }

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
    return app


app = create_app()
