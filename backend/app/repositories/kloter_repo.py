from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.models.kloter import Kloter
from app.models.membership import Membership
from app.models.period import Period

from app.repositories.base_repo import BaseRepository


class KloterRepository(BaseRepository):
    model = Kloter

    def list_by_tenant(self, tenant_id, status: str | None = None):
        stmt = (
            select(Kloter)
            .where(Kloter.tenant_id == tenant_id)
            .options(
                selectinload(Kloter.memberships),
                selectinload(Kloter.periods).joinedload(Period.progress),
            )
        )
        if status:
            stmt = stmt.where(Kloter.status == status)
        stmt = stmt.order_by(Kloter.created_at.desc())
        return list(self.db.execute(stmt).unique().scalars().all())

    def get_with_details(self, kloter_id, tenant_id):
        stmt = (
            select(Kloter)
            .where(Kloter.id == kloter_id, Kloter.tenant_id == tenant_id)
            .options(
                selectinload(Kloter.memberships).joinedload(Membership.member),
                selectinload(Kloter.periods).joinedload(Period.progress),
                selectinload(Kloter.periods)
                .joinedload(Period.get_membership)
                .joinedload(Membership.member),
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_id_and_tenant(self, kloter_id, tenant_id):
        stmt = select(Kloter).where(Kloter.id == kloter_id, Kloter.tenant_id == tenant_id)
        return self.db.execute(stmt).scalar_one_or_none()
