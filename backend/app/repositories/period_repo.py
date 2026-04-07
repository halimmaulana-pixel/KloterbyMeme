from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.period import Period, PeriodProgress

from app.repositories.base_repo import BaseRepository


class PeriodRepository(BaseRepository):
    model = Period

    def list_today(self, tenant_id, target_date: date | None = None):
        target_date = target_date or date.today()
        stmt = (
            select(Period)
            .join(Period.kloter)
            .where(Period.due_date == target_date, Period.kloter.has(tenant_id=tenant_id))
            .options(joinedload(Period.progress), joinedload(Period.kloter))
            .order_by(Period.due_date.asc(), Period.period_number.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_progress(self, period_id):
        stmt = select(PeriodProgress).where(PeriodProgress.period_id == period_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_with_progress(self, period_id):
        stmt = select(Period).where(Period.id == period_id).options(joinedload(Period.progress))
        return self.db.execute(stmt).scalar_one_or_none()
