from datetime import timedelta
from app.models.kloter import Kloter
from app.models.period import Period, PeriodProgress
from app.services.audit_service import AuditService
from app.core.utils import calculate_due_date


class KloterService:
    def create_kloter(self, db, tenant_id, payload: dict, actor_admin_id=None):
        kloter = Kloter(
            tenant_id=tenant_id,
            name=payload["name"],
            type=payload["type"],
            slot_total=payload["slot_total"],
            contribution=payload["contribution"],
            fee_admin=payload.get("fee_admin", 0),
            penalty_per_day=payload.get("penalty_per_day", 25000),
            payment_deadline_hour=payload.get("payment_deadline_hour", 20),
            start_date=payload["start_date"],
            status=payload.get("status", "active"),
        )
        db.add(kloter)
        db.flush()

        # Automatically create all periods based on slot_total
        for i in range(1, kloter.slot_total + 1):
            due_date = calculate_due_date(kloter.start_date, kloter.type, i - 1)
            # For new kloter, Period 1 is 'collecting', others are 'upcoming'
            status = "collecting" if i == 1 else "upcoming"
            
            period = Period(
                kloter_id=kloter.id,
                period_number=i,
                due_date=due_date,
                get_amount=kloter.contribution * kloter.slot_total,
                status=status
            )
            db.add(period)
            db.flush()
            
            # Add progress tracker
            progress = PeriodProgress(
                period_id=period.id,
                expected_count=0 # Will be updated when members are added
            )
            db.add(progress)

        AuditService().log(
            db=db,
            tenant_id=tenant_id,
            actor_admin_id=actor_admin_id,
            action="kloter.created",
            resource_type="kloter",
            resource_id=kloter.id,
            meta={"name": kloter.name, "type": kloter.type},
        )
        return kloter
