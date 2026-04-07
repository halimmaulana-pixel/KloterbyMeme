from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.api.deps import get_db
from app.api.routes import auth, dashboard, disbursements, kloter, members, payments, periods, admin_users, bank, reports
from app.config import settings

api_router = APIRouter()

@api_router.get("/health", tags=["system"])
def healthcheck(db=Depends(get_db)) -> Dict[str, Any]:
    from app.models.admin import AdminUser
    admin_exists = db.query(AdminUser).first() is not None
    return {
        "status": "ok", 
        "app": settings.app_name, 
        "database_initialized": admin_exists
    }

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(kloter.router, prefix="/kloter", tags=["kloter"])
api_router.include_router(periods.router, prefix="/collections", tags=["collections"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(disbursements.router, prefix="/disbursements", tags=["disbursements"])
api_router.include_router(members.router, prefix="/member", tags=["member"])
api_router.include_router(admin_users.router, prefix="/admin-users", tags=["admin-management"])
api_router.include_router(bank.router, prefix="/bank", tags=["bank"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
