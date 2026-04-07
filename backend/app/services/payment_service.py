from datetime import datetime, timezone

from app.core.enums import PaymentStatus
from app.core.events import event_bus
from app.core.exceptions import AlreadyVerified, InvalidStateTransition
from app.core.state_rules import PAYMENT_TERMINAL_STATES, PAYMENT_VERIFIABLE_STATES
from app.models.ledger import LedgerEntry
from app.models.payment import PaymentAttempt
from app.services.audit_service import AuditService
from app.services.period_service import PeriodService


class PaymentService:
    def verify_payment(self, db, expectation, admin_id, bank_account_id=None):
        if expectation.status in PAYMENT_TERMINAL_STATES:
            raise AlreadyVerified()
        if expectation.status not in PAYMENT_VERIFIABLE_STATES:
            raise InvalidStateTransition(expectation.status, PaymentStatus.VERIFIED.value)

        # Get late penalty if any
        penalty_total = db.query(func.sum(PaymentAttempt.penalty_amount)).filter(
            PaymentAttempt.expectation_id == expectation.id
        ).scalar() or 0

        attempt = PaymentAttempt(
            expectation_id=expectation.id,
            paid_amount=expectation.expected_amount,
            bank_account_id=bank_account_id,
            status=PaymentStatus.VERIFIED.value,
            verified_by=admin_id,
            verified_at=datetime.now(timezone.utc),
        )
        db.add(attempt)

        progress = expectation.period.progress
        if expectation.status == PaymentStatus.LATE.value and progress.late_count > 0:
            progress.late_count -= 1

        expectation.status = PaymentStatus.VERIFIED.value
        progress.paid_count += 1
        progress.progress_pct = (progress.paid_count + progress.defaulted_count) / max(
            progress.expected_count, 1
        )

        # Record Ledger with Categories
        # 1. Main Iuran
        db.add(
            LedgerEntry(
                tenant_id=expectation.membership.kloter.tenant_id,
                type="payment_in",
                category="iuran",
                bank_account_id=bank_account_id,
                amount=expectation.expected_amount,
                reference_id=expectation.id,
                description=f"Iuran {expectation.membership.member.name} - {expectation.membership.kloter.name}",
            )
        )
        
        # 2. Penalty (if any)
        if penalty_total > 0:
            db.add(
                LedgerEntry(
                    tenant_id=expectation.membership.kloter.tenant_id,
                    type="payment_in",
                    category="denda",
                    bank_account_id=bank_account_id,
                    amount=penalty_total,
                    reference_id=expectation.id,
                    description=f"Denda {expectation.membership.member.name}",
                )
            )

        AuditService().log(
            db=db,
            tenant_id=expectation.membership.kloter.tenant_id,
            actor_admin_id=admin_id,
            action="payment.verified",
            resource_type="payment_expectation",
            resource_id=expectation.id,
        )

        PeriodService().check_period_completion(db, expectation.period)
        event_bus.emit(
            "PAYMENT_VERIFIED",
            {
                "expectation_id": str(expectation.id),
                "period_id": str(expectation.period_id),
                "membership_id": str(expectation.membership_id),
            },
        )
        return expectation

    def bailout_payment(self, db, expectation, admin_id):
        """Admin bails out a late payment to keep the kloter moving."""
        if expectation.status != PaymentStatus.LATE.value:
            return expectation
        
        expectation.is_bailout = True
        expectation.bailout_amount = expectation.expected_amount
        
        # In Ledger, this moves money from Admin's 'Virtual Drawer' to Kloter Drawer
        db.add(
            LedgerEntry(
                tenant_id=expectation.membership.kloter.tenant_id,
                type="transfer",
                category="bailout",
                amount=expectation.expected_amount,
                reference_id=expectation.id,
                description=f"Bailout for {expectation.membership.member.name}",
            )
        )
        db.commit()
        return expectation

    def reject_payment(self, db, expectation, admin_id, note: str | None = None):
        old_status = expectation.status
        if expectation.status in PAYMENT_TERMINAL_STATES:
            raise InvalidStateTransition(expectation.status, PaymentStatus.REJECTED.value)

        attempt = PaymentAttempt(
            expectation_id=expectation.id,
            status=PaymentStatus.REJECTED.value,
            verified_by=admin_id,
            verified_at=datetime.now(timezone.utc),
            notes=note,
        )
        db.add(attempt)

        expectation.status = PaymentStatus.EXPECTED.value

        AuditService().log(
            db=db,
            tenant_id=expectation.membership.kloter.tenant_id,
            actor_admin_id=admin_id,
            action="payment.rejected",
            resource_type="payment_expectation",
            resource_id=expectation.id,
            meta={"from_status": old_status},
            note=note,
        )
        return expectation

    def mark_late(self, db, expectation):
        if expectation.status != PaymentStatus.EXPECTED.value:
            return expectation
        expectation.status = PaymentStatus.LATE.value
        expectation.period.progress.late_count += 1
        expectation.period.status = "verifying"
        event_bus.emit(
            "PAYMENT_LATE",
            {
                "expectation_id": str(expectation.id),
                "period_id": str(expectation.period_id),
                "membership_id": str(expectation.membership_id),
            },
        )
        return expectation

    def apply_daily_penalty(self, db, expectation, amount: int):
        attempt = PaymentAttempt(
            expectation_id=expectation.id,
            status=expectation.status,
            penalty_amount=amount,
            late_days=1,
            notes="Daily penalty applied",
        )
        db.add(attempt)
        return attempt
