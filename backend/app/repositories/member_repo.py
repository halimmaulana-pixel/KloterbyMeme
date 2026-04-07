from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.member import Member
from app.models.membership import Membership
from app.models.payment import PaymentExpectation

from app.repositories.base_repo import BaseRepository


class MemberRepository(BaseRepository):
    model = Member

    def get_by_wa(self, tenant_id, wa: str):
        # Normalize: 08xxx -> 628xxx, +628xxx -> 628xxx
        normalized = wa.lstrip("+")
        if normalized.startswith("0"):
            normalized = "62" + normalized[1:]
        stmt = select(Member).where(Member.tenant_id == tenant_id, Member.wa == normalized)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_member_home(self, member_id, tenant_id):
        stmt = (
            select(Member)
            .where(Member.id == member_id, Member.tenant_id == tenant_id)
            .options(
                selectinload(Member.memberships)
                .joinedload(Membership.kloter),
                selectinload(Member.memberships)
                .selectinload(Membership.expectations)
                .selectinload(PaymentExpectation.attempts),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()
