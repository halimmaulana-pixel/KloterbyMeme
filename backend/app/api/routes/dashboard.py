from datetime import date
from sqlalchemy import select, func
from fastapi import APIRouter, Depends

from app.api.deps import CurrentAdmin, get_current_admin, get_db
from app.models.kloter import Kloter
from app.repositories.period_repo import PeriodRepository


router = APIRouter()


@router.get("/overview")
def overview(
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
) -> dict[str, object]:
    # Get all active kloters count for this tenant
    stmt = select(func.count(Kloter.id)).where(Kloter.tenant_id == admin.tenant_id, Kloter.status == "active")
    active_kloter_count = db.execute(stmt).scalar() or 0

    periods = PeriodRepository(db).list_today(admin.tenant_id, target_date=date.today())
    return {
        "message": "Dashboard overview",
        "kpis": {
            "today_periods": active_kloter_count,  # Now showing total active kloters
            "today_due_count": len(periods),
            "ready_get_count": sum(1 for item in periods if item.status == "ready_get"),
            "problem_count": sum(1 for item in periods if item.status == "problem"),
        },
    }
