from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.kloter import Kloter
from app.models.membership import Membership
from app.models.payment import PaymentExpectation
from app.models.period import Period

from app.repositories.base_repo import BaseRepository


class PaymentRepository(BaseRepository):
    model = PaymentExpectation

    # Statuses that need admin action
    ACTIONABLE_STATUSES = ("proof_uploaded", "late", "manual_review")

    def get_queue(self, tenant_id, status: str | None = None):
        stmt = (
            select(PaymentExpectation)
            .join(PaymentExpectation.membership)
            .join(Membership.kloter)
            .options(
                joinedload(PaymentExpectation.membership).joinedload(Membership.member),
                joinedload(PaymentExpectation.period),
                joinedload(PaymentExpectation.attempts),
            )
            .where(Kloter.tenant_id == tenant_id)
            .order_by(PaymentExpectation.due_datetime.asc(), PaymentExpectation.created_at.desc())
        )
        if status:
            stmt = stmt.where(PaymentExpectation.status == status)
        else:
            stmt = stmt.where(PaymentExpectation.status.in_(self.ACTIONABLE_STATUSES))
        return list(self.db.execute(stmt).unique().scalars().all())

    def get_with_tenant_check(self, expectation_id, tenant_id):
        stmt = (
            select(PaymentExpectation)
            .join(PaymentExpectation.membership)
            .join(Membership.kloter)
            .where(PaymentExpectation.id == expectation_id, Kloter.tenant_id == tenant_id)
            .options(
                joinedload(PaymentExpectation.membership).joinedload(Membership.member),
                joinedload(PaymentExpectation.period).joinedload(Period.progress),
                joinedload(PaymentExpectation.attempts),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_by_period(self, period_id):
        stmt = select(PaymentExpectation).where(PaymentExpectation.period_id == period_id)
        return list(self.db.execute(stmt).scalars().all())
