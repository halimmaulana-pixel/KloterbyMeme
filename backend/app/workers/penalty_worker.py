from datetime import datetime, timezone
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.models.payment import PaymentExpectation
from app.models.kloter import Kloter
from app.models.membership import Membership
from app.services.payment_service import PaymentService
from app.core.enums import PaymentStatus

@celery_app.task
def check_and_apply_penalties():
    """
    1. Mark overdue expectations as LATE.
    2. Apply daily penalty to all LATE expectations.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        payment_service = PaymentService()

        # 1. Mark as LATE
        overdue_query = select(PaymentExpectation).where(
            PaymentExpectation.status == PaymentStatus.EXPECTED.value,
            PaymentExpectation.due_datetime < now
        )
        overdue_expectations = db.scalars(overdue_query).all()
        
        for exp in overdue_expectations:
            payment_service.mark_late(db, exp)
        
        db.commit()

        # 2. Apply daily penalties
        late_query = select(PaymentExpectation).where(
            PaymentExpectation.status == PaymentStatus.LATE.value
        )
        late_expectations = db.scalars(late_query).all()

        for exp in late_expectations:
            # We need the penalty_per_day from Kloter
            # membership -> kloter
            kloter = exp.membership.kloter
            penalty_amount = kloter.penalty_per_day
            payment_service.apply_daily_penalty(db, exp, penalty_amount)
        
        db.commit()
        
        return {
            "marked_late": len(overdue_expectations),
            "penalties_applied": len(late_expectations)
        }
    finally:
        db.close()
