import uuid as uuid_lib
from datetime import timedelta
from sqlalchemy import select
from app.models.kloter import Kloter
from app.models.member import Member
from app.models.membership import Membership
from app.models.payment import PaymentExpectation
from app.models.admin import AdminUser
from app.models.period import Period, PeriodProgress
from app.services.audit_service import AuditService
from app.core.utils import calculate_due_date, generate_unique_code, combine_due_datetime


class KloterService:
    def create_kloter(self, db, tenant_id, payload: dict, actor_admin_id=None):
        # Rule: Admin gets 1 extra slot at the beginning
        original_slot_total = payload["slot_total"]
        actual_slot_total = original_slot_total + 1

        kloter = Kloter(
            tenant_id=tenant_id,
            name=payload["name"],
            type=payload["type"],
            slot_total=actual_slot_total,
            contribution=payload["contribution"],
            fee_admin=payload.get("fee_admin", 0),
            penalty_per_day=payload.get("penalty_per_day", 25000),
            payment_deadline_hour=payload.get("payment_deadline_hour", 20),
            start_date=payload["start_date"],
            status=payload.get("status", "active"),
        )
        db.add(kloter)
        db.flush()

        # Find or create a 'Member' record for this Admin to be used in Membership
        admin_member = None
        if actor_admin_id:
            # Check if this admin already has a 'member' record
            stmt = select(Member).where(Member.tenant_id == tenant_id, Member.registration_type == "admin")
            admin_member = db.execute(stmt).scalar_one_or_none()
            
            if not admin_member:
                # Get admin details to create member record
                admin_user = db.get(AdminUser, actor_admin_id)
                admin_member = Member(
                    id=uuid_lib.uuid4(),
                    tenant_id=tenant_id,
                    name=admin_user.name if admin_user else "ADMIN SYSTEM",
                    wa="0000000000", # Dummy WA for admin system member
                    status="active",
                    registration_type="admin"
                )
                db.add(admin_member)
                db.flush()

        # Create Slot 1 Membership for Admin
        admin_membership = None
        if admin_member:
            admin_membership = Membership(
                id=uuid_lib.uuid4(),
                member_id=admin_member.id,
                kloter_id=kloter.id,
                slot_number=1,
                get_order=1,
                status="active"
            )
            db.add(admin_membership)
            db.flush()

        # Automatically create all periods based on actual_slot_total
        for i in range(1, actual_slot_total + 1):
            due_date = calculate_due_date(kloter.start_date, kloter.type, i - 1)
            status = "collecting" if i == 1 else "upcoming"
            
            period = Period(
                kloter_id=kloter.id,
                period_number=i,
                due_date=due_date,
                get_amount=kloter.contribution * actual_slot_total,
                status=status
            )
            
            # Set Slot 1 (Admin) as recipient for Period 1
            if i == 1 and admin_membership:
                period.get_membership_id = admin_membership.id
                
            db.add(period)
            db.flush()
            
            # Add progress tracker
            progress = PeriodProgress(
                period_id=period.id,
                expected_count=0
            )
            db.add(progress)
            db.flush()

            # Automatically create PaymentExpectation for Admin (Slot 1) for EVERY period
            # Admin pays 0 and is auto-verified
            if admin_membership:
                code = generate_unique_code(1, i)
                exp = PaymentExpectation(
                    membership_id=admin_membership.id,
                    period_id=period.id,
                    expected_amount=0,
                    unique_code=code,
                    due_datetime=combine_due_datetime(period.due_date, kloter.payment_deadline_hour),
                    status="verified"
                )
                db.add(exp)
                progress.expected_count = 1

        AuditService().log(
            db=db,
            tenant_id=tenant_id,
            actor_admin_id=actor_admin_id,
            action="kloter.created",
            resource_type="kloter",
            resource_id=kloter.id,
            meta={"name": kloter.name, "type": kloter.type, "actual_slots": actual_slot_total},
        )
        return kloter
