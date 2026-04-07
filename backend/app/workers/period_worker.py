from datetime import date, datetime, timezone
from sqlalchemy import select, and_
from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.models.period import Period, PeriodProgress
from app.models.kloter import Kloter
from app.core.enums import PeriodStatus, PaymentStatus
from app.services.period_service import PeriodService

@celery_app.task
def check_period_transitions():
    """
    1. Start UPCOMING periods if they should start (e.g. first period or previous COMPLETED).
    2. Move COLLECTING to VERIFYING if due date passed.
    """
    db = SessionLocal()
    try:
        now_date = date.today()
        now_time = datetime.now(timezone.utc)
        
        # 1. Start First Periods
        # Find kloters where period 1 is UPCOMING and start_date <= today
        p1_query = select(Period).where(
            Period.period_number == 1,
            Period.status == PeriodStatus.UPCOMING.value
        ).join(Kloter).where(
            Kloter.start_date <= now_date,
            Kloter.status == "active"
        )
        p1_to_start = db.scalars(p1_query).all()
        for p in p1_to_start:
            p.status = PeriodStatus.COLLECTING.value
            # If period service has logic to generate expectations, we might call it here
            # But expectations are usually generated when kloter is created or when previous ends
        
        # 2. Start Subsequent Periods
        # Find kloters where current period is COMPLETED and next is UPCOMING
        completed_query = select(Period).where(
            Period.status == PeriodStatus.COMPLETED.value
        )
        completed_periods = db.scalars(completed_query).all()
        for cp in completed_periods:
            next_p_query = select(Period).where(
                Period.kloter_id == cp.kloter_id,
                Period.period_number == cp.period_number + 1,
                Period.status == PeriodStatus.UPCOMING.value
            )
            next_p = db.scalar(next_p_query)
            if next_p:
                next_p.status = PeriodStatus.COLLECTING.value
                # Generate expectations for next period
                PeriodService().generate_expectations(db, next_p, next_p.kloter)

        # 3. Move COLLECTING to VERIFYING
        # Check if due_date passed or all paid
        collecting_query = select(Period).where(
            Period.status == PeriodStatus.COLLECTING.value
        )
        collecting_periods = db.scalars(collecting_query).all()
        for p in collecting_periods:
            # We check expectations' due_datetime
            # For simplicity, if due_date is yesterday, it's definitely verifying
            if p.due_date < now_date:
                p.status = PeriodStatus.VERIFYING.value
        
        db.commit()
        return {
            "started_p1": len(p1_to_start),
            "moved_to_verifying": len(collecting_periods) # This is a bit lazy, should count actual changes
        }
    finally:
        db.close()
