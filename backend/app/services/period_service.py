from app.core.enums import KloterType, PeriodStatus
from app.core.events import event_bus
from app.core.state_rules import can_release_get
from app.core.utils import calculate_due_date, combine_due_datetime, generate_unique_code
from app.models.period import Period, PeriodProgress
from app.models.payment import PaymentExpectation
from app.services.audit_service import AuditService
from app.services.disbursement_service import DisbursementService


class PeriodService:
    def generate_periods(self, db, kloter, actor_admin_id=None):
        periods = []
        memberships = sorted(kloter.memberships, key=lambda item: item.get_order)

        for index in range(kloter.slot_total):
            get_membership = memberships[index] if index < len(memberships) else None
            period = Period(
                kloter_id=kloter.id,
                get_membership_id=get_membership.id if get_membership else None,
                period_number=index + 1,
                due_date=calculate_due_date(kloter.start_date, KloterType(kloter.type), index),
                get_amount=kloter.contribution * kloter.slot_total,
                status=PeriodStatus.UPCOMING.value,
            )
            db.add(period)
            db.flush()

            db.add(
                PeriodProgress(
                    period_id=period.id,
                    expected_count=kloter.slot_total,
                )
            )
            periods.append(period)

        if periods:
            self.generate_expectations(db, periods[0], kloter)

        AuditService().log(
            db=db,
            tenant_id=kloter.tenant_id,
            actor_admin_id=actor_admin_id,
            action="period.generated",
            resource_type="kloter",
            resource_id=kloter.id,
            meta={"period_count": len(periods)},
        )
        return periods

    def generate_expectations(self, db, period, kloter):
        memberships = sorted(kloter.memberships, key=lambda item: item.slot_number)
        for membership in memberships:
            code = generate_unique_code(membership.slot_number, period.period_number)
            exp = PaymentExpectation(
                membership_id=membership.id,
                period_id=period.id,
                expected_amount=kloter.contribution,
                unique_code=code,
                due_datetime=combine_due_datetime(period.due_date, kloter.payment_deadline_hour),
            )
            db.add(exp)
        db.flush()

    def check_period_completion(self, db, period):
        progress = period.progress
        ok, _ = can_release_get(progress)
        if ok and period.status != PeriodStatus.READY_GET.value:
            period.status = PeriodStatus.READY_GET.value
            DisbursementService().create_disbursement(db, period)
            event_bus.emit("PERIOD_READY_FOR_GET", {"period_id": str(period.id)})
        return period
