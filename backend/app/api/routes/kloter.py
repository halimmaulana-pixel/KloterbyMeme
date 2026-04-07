import uuid as uuid_lib
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload

from app.api.deps import CurrentAdmin, CurrentMember, get_current_admin, get_current_member, get_db
from app.models.kloter import Kloter
from app.models.member import Member
from app.models.membership import Membership
from app.models.payment import PaymentExpectation
from app.models.period import Period, PeriodProgress
from app.repositories.kloter_repo import KloterRepository
from app.schemas.kloter import KloterCreateRequest
from app.services.kloter_service import KloterService
from app.core.utils import generate_unique_code, combine_due_datetime, calculate_due_date


router = APIRouter()


# ─── Admin endpoints ────────────────────────────────────────────────────────

@router.get("")
def list_kloter(
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    items = KloterRepository(db).list_by_tenant(admin.tenant_id)
    result = []
    for item in items:
        membership_count = len(item.memberships)
        progress = round((membership_count / max(item.slot_total, 1)) * 100)
        ready_get = any(period.status == "ready_get" for period in item.periods)
        problem = any(period.status == "problem" for period in item.periods) or item.status == "problem"

        status_to_show = item.status
        if problem:
            status_to_show = "problem"
        elif ready_get:
            status_to_show = "ready_get"

        result.append({
            "id": str(item.id),
            "name": item.name,
            "type": item.type,
            "slot_total": item.slot_total,
            "contribution": item.contribution,
            "status": status_to_show,
            "created_at": item.created_at,
            "filled_slots": membership_count,
            "progress": progress,
            "issue": "ready_get" if ready_get else "late_members" if problem else None,
            "period_count": len(item.periods),
        })
    return result


@router.post("")
def create_kloter(
    payload: KloterCreateRequest,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    kloter = KloterService().create_kloter(
        db=db,
        tenant_id=admin.tenant_id,
        payload=payload.model_dump(),
        actor_admin_id=admin.id,
    )
    db.commit()
    db.refresh(kloter)
    return {"id": str(kloter.id), "status": "created"}


@router.get("/{kloter_id}")
def get_kloter(
    kloter_id: str,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    kloter = KloterRepository(db).get_with_details(kloter_id, admin.tenant_id)
    if not kloter:
        raise HTTPException(status_code=404, detail="Kloter not found")

    sorted_memberships = sorted(kloter.memberships, key=lambda m: m.slot_number)
    filled_slots = {m.slot_number for m in sorted_memberships}
    sorted_periods = sorted(kloter.periods, key=lambda p: p.period_number)
    current_period = next(
        (p for p in sorted_periods if p.status in {"collecting", "verifying", "ready_get"}),
        sorted_periods[0] if sorted_periods else None,
    )

    # Build full slot list: filled + empty
    members_list = []
    for slot in range(1, kloter.slot_total + 1):
        membership = next((m for m in sorted_memberships if m.slot_number == slot), None)
        if membership:
            # Find payment status for this member in the current period
            payment_status = "none"
            if current_period:
                exp = next((e for e in membership.expectations if e.period_id == current_period.id), None)
                if exp:
                    payment_status = exp.status

            members_list.append({
                "id": str(membership.id),
                "member_id": str(membership.member_id),
                "slot": slot,
                "name": membership.member.name,
                "wa": membership.member.wa,
                "status": payment_status,
                "isAdmin": slot == 1,
                "getTurn": current_period is not None and current_period.get_membership_id == membership.id,
                "empty": False,
            })
        else:
            members_list.append({"slot": slot, "empty": True, "name": None, "id": None})

    return {
        "id": str(kloter.id),
        "name": kloter.name,
        "type": kloter.type,
        "slot_total": kloter.slot_total,
        "contribution": kloter.contribution,
        "fee_admin": kloter.fee_admin,
        "penalty_per_day": kloter.penalty_per_day,
        "payment_deadline_hour": kloter.payment_deadline_hour,
        "start_date": str(kloter.start_date),
        "status": kloter.status,
        "filled_slots": len(filled_slots),
        "current_period": {
            "number": current_period.period_number,
            "recipient": current_period.get_membership.member.name
                if current_period and current_period.get_membership and current_period.get_membership.member else "-",
            "due_date": str(current_period.due_date),
            "progress_pct": round(current_period.progress.progress_pct * 100)
                if current_period and current_period.progress else 0,
            "paid_count": current_period.progress.paid_count if current_period and current_period.progress else 0,
            "expected_count": current_period.progress.expected_count
                if current_period and current_period.progress else kloter.slot_total,
        } if current_period else None,
        "members": members_list,
        "timeline": [
            {
                "id": str(p.id),
                "label": f"GET #{p.period_number}",
                "name": p.get_membership.member.name if p.get_membership and p.get_membership.member else "-",
                "amount": p.get_amount,
                "state": "done" if p.status == "completed"
                    else "now" if current_period and p.id == current_period.id
                    else "next" if current_period and p.period_number == current_period.period_number + 1
                    else "future",
                "date": str(p.due_date),
            }
            for p in sorted_periods
        ],
    }


@router.post("/{kloter_id}/init-periods")
def init_kloter_periods(
    kloter_id: str,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    kloter = KloterRepository(db).get_with_details(kloter_id, admin.tenant_id)
    if not kloter:
        raise HTTPException(status_code=404, detail="Kloter not found")

    if kloter.periods:
        raise HTTPException(status_code=400, detail="Kloter already has periods")

    # Create all periods
    for i in range(1, kloter.slot_total + 1):
        due_date = calculate_due_date(kloter.start_date, kloter.type, i - 1)
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
        
        pp = PeriodProgress(period_id=period.id, expected_count=0)
        db.add(pp)
        db.flush()

        # Update GET recipient if a member already occupies this slot
        membership = next((m for m in kloter.memberships if m.slot_number == i), None)
        if membership:
            period.get_membership_id = membership.id

        # Generate payment expectations for all members for this period
        for ms in kloter.memberships:
            code = generate_unique_code(ms.slot_number, period.period_number)
            exp = PaymentExpectation(
                membership_id=ms.id,
                period_id=period.id,
                expected_amount=kloter.contribution,
                unique_code=code,
                due_datetime=combine_due_datetime(period.due_date, kloter.payment_deadline_hour),
            )
            db.add(exp)
            pp.expected_count += 1

    db.commit()
    return {"status": "initialized", "period_count": kloter.slot_total}


@router.post("/{kloter_id}/add-member")
def add_member_to_kloter(
    kloter_id: str,
    payload: dict = Body(...),
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    kloter = KloterRepository(db).get_with_details(kloter_id, admin.tenant_id)
    if not kloter:
        raise HTTPException(status_code=404, detail="Kloter not found")

    member_id = payload.get("member_id")
    slot_number = payload.get("slot_number")

    if not member_id or not slot_number:
        raise HTTPException(status_code=422, detail="member_id and slot_number required")

    # Validate slot is available
    filled_slots = {m.slot_number for m in kloter.memberships}
    if slot_number in filled_slots:
        raise HTTPException(status_code=409, detail=f"Slot {slot_number} sudah terisi")
    if slot_number < 1 or slot_number > kloter.slot_total:
        raise HTTPException(status_code=422, detail=f"Slot harus antara 1 dan {kloter.slot_total}")

    # Validate member exists and belongs to tenant
    member = db.execute(
        select(Member).where(Member.id == member_id, Member.tenant_id == admin.tenant_id)
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Check member not already in this kloter
    already = db.execute(
        select(Membership).where(Membership.kloter_id == kloter.id, Membership.member_id == member.id)
    ).scalar_one_or_none()
    if already:
        raise HTTPException(status_code=409, detail="Member sudah ada di kloter ini")

    # Create membership
    membership = Membership(
        id=uuid_lib.uuid4(),
        member_id=member.id,
        kloter_id=kloter.id,
        slot_number=slot_number,
        get_order=slot_number,
        status="active",
    )
    db.add(membership)
    db.flush()

    # If kloter already has periods, update get_membership_id for this slot's period
    # and create PaymentExpectations for active/upcoming periods
    sorted_periods = sorted(kloter.periods, key=lambda p: p.period_number)
    for period in sorted_periods:
        # Update GET recipient if this period corresponds to member's slot
        if period.period_number == slot_number and period.get_membership_id is None:
            period.get_membership_id = membership.id

        # Create payment expectation if period is active/upcoming and no expectation exists
        if period.status in ("collecting", "verifying", "upcoming", "ready_get"):
            existing_exp = db.execute(
                select(PaymentExpectation).where(
                    PaymentExpectation.membership_id == membership.id,
                    PaymentExpectation.period_id == period.id,
                )
            ).scalar_one_or_none()
            if not existing_exp:
                code = generate_unique_code(slot_number, period.period_number)
                exp = PaymentExpectation(
                    membership_id=membership.id,
                    period_id=period.id,
                    expected_amount=kloter.contribution,
                    unique_code=code,
                    due_datetime=combine_due_datetime(period.due_date, kloter.payment_deadline_hour),
                )
                db.add(exp)
                # Update period progress expected_count
                if period.progress:
                    period.progress.expected_count += 1

    db.commit()
    return {"status": "added", "slot": slot_number, "member": member.name}


