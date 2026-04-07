from fastapi import APIRouter

from app.api.routes import auth, dashboard, disbursements, kloter, members, payments, periods


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(kloter.router, prefix="/kloter", tags=["kloter"])
api_router.include_router(periods.router, prefix="/collections", tags=["collections"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(disbursements.router, prefix="/disbursements", tags=["disbursements"])
api_router.include_router(members.router, prefix="/member", tags=["member"])
