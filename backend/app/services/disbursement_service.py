from datetime import datetime, timezone

from app.core.enums import DisbursementStatus, PeriodStatus
from app.core.events import event_bus
from app.core.exceptions import GetNotReady
from app.core.state_rules import can_release_get
from app.models.disbursement import Disbursement
from app.models.ledger import LedgerEntry
from app.services.audit_service import AuditService


class DisbursementService:
    def create_disbursement(self, db, period):
        if period.disbursement:
            return period.disbursement

        kloter = period.kloter
        gross_amount = kloter.contribution * kloter.slot_total
        penalty_added = 0
        net_amount = gross_amount - kloter.fee_admin + penalty_added

        disbursement = Disbursement(
            period_id=period.id,
            membership_id=period.get_membership_id,
            gross_amount=gross_amount,
            fee_deducted=kloter.fee_admin,
            penalty_added=penalty_added,
            net_amount=net_amount,
            status=DisbursementStatus.READY.value
            if period.status == PeriodStatus.READY_GET.value
            else DisbursementStatus.PENDING.value,
        )
        db.add(disbursement)
        db.flush()
        return disbursement

    def release_get(self, db, disbursement, admin_id):
        ok, reason = can_release_get(disbursement.period.progress)
        if not ok:
            raise GetNotReady(reason)

        disbursement.status = DisbursementStatus.RELEASED.value
        disbursement.released_by = admin_id
        disbursement.released_at = datetime.now(timezone.utc)
        disbursement.period.status = PeriodStatus.COMPLETED.value

        db.add(
            LedgerEntry(
                tenant_id=disbursement.period.kloter.tenant_id,
                type="get_out",
                amount=-disbursement.net_amount,
                reference_id=disbursement.id,
                description="GET released",
            )
        )

        AuditService().log(
            db=db,
            tenant_id=disbursement.period.kloter.tenant_id,
            actor_admin_id=admin_id,
            action="get.released",
            resource_type="disbursement",
            resource_id=disbursement.id,
        )

        event_bus.emit(
            "GET_RELEASED",
            {"disbursement_id": str(disbursement.id), "period_id": str(disbursement.period_id)},
        )
        return disbursement
