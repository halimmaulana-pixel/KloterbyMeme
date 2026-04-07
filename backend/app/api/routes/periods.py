from datetime import date

from fastapi import APIRouter, Depends

from app.api.deps import CurrentAdmin, get_current_admin, get_db
from app.repositories.period_repo import PeriodRepository


router = APIRouter()


@router.get("/today")
def collections_today(
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    items = PeriodRepository(db).list_today(admin.tenant_id, target_date=date.today())
    return [
        {
            "id": str(item.id),
            "kloter_id": str(item.kloter_id),
            "kloter_name": item.kloter.name,
            "period_number": item.period_number,
            "due_date": item.due_date,
            "status": item.status,
            "progress": {
                "expected_count": item.progress.expected_count if item.progress else 0,
                "paid_count": item.progress.paid_count if item.progress else 0,
                "late_count": item.progress.late_count if item.progress else 0,
                "defaulted_count": item.progress.defaulted_count if item.progress else 0,
            },
        }
        for item in items
    ]
