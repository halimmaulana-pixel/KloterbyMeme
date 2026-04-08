import uuid as uuid_lib
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException, File, UploadFile, Form
import os
from app.repositories.tenant_repo import TenantRepository
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload

from app.api.deps import CurrentAdmin, CurrentMember, get_current_admin, get_current_member, get_db
from app.models.kloter import Kloter
from app.models.member import Member
from app.models.membership import Membership
from app.models.payment import PaymentExpectation
from app.models.period import Period
from app.repositories.member_repo import MemberRepository
from app.core.utils import generate_unique_code, combine_due_datetime

router = APIRouter()


@router.post("/self-register")
async def member_self_register(
    name: str = Form(...),
    wa: str = Form(...),
    nik: str = Form(...),
    bank_name: str = Form(None),
    bank_account_number: str = Form(None),
    bank_account_name: str = Form(None),
    selfie: UploadFile = File(...),
    ktp: UploadFile = File(...),
    db=Depends(get_db)
):
    # Normalize WA
    wa_raw = wa.strip()
    if wa_raw.startswith("0"):
        wa_raw = "62" + wa_raw[1:]
    
    # Get default tenant
    tenant = TenantRepository(db).get_first()
    if not tenant:
        raise HTTPException(status_code=500, detail="Tenant not configured")

    # Check existing
    existing = db.execute(
        select(Member).where(Member.tenant_id == tenant.id, Member.wa == wa_raw)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Nomor WA sudah terdaftar")

    # Save images
    UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    def save_upload(file, prefix):
        ext = os.path.splitext(file.filename or "img.jpg")[1] or ".jpg"
        fn = f"{prefix}_{uuid_lib.uuid4()}{ext}"
        with open(os.path.join(UPLOAD_DIR, fn), "wb") as f:
            f.write(file.file.read())
        return f"/uploads/{fn}"

    selfie_url = save_upload(selfie, "selfie")
    ktp_url = save_upload(ktp, "ktp")

    member = Member(
        id=uuid_lib.uuid4(),
        tenant_id=tenant.id,
        name=name.strip(),
        wa=wa_raw,
        nik=nik,
        bank_name=bank_name,
        bank_account_number=bank_account_number,
        bank_account_name=bank_account_name,
        selfie_url=selfie_url,
        ktp_url=ktp_url,
        status="pending",
        registration_type="self",
    )
    db.add(member)
    db.commit()
    return {"status": "pending_verification", "message": "Pendaftaran berhasil, menunggu verifikasi admin."}

@router.get("/admin/pending")
def admin_list_pending(
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    stmt = select(Member).where(Member.tenant_id == admin.tenant_id, Member.status == "pending")
    members = db.execute(stmt).scalars().all()
    return [
        {
            "id": str(m.id),
            "name": m.name,
            "wa": m.wa,
            "nik": m.nik,
            "selfie_url": f"http://127.0.0.1:8002{m.selfie_url}" if m.selfie_url else None,
            "ktp_url": f"http://127.0.0.1:8002{m.ktp_url}" if m.ktp_url else None,
            "created_at": m.created_at.isoformat()
        } for m in members
    ]

@router.post("/admin/{member_id}/verify")
def admin_verify_member(
    member_id: str,
    action: str = Body(..., embed=True), # "approve" or "reject"
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    member = db.execute(select(Member).where(Member.id == member_id, Member.tenant_id == admin.tenant_id)).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if action == "approve":
        member.status = "active"
    else:
        member.status = "rejected"
    
    db.commit()
    return {"status": member.status}


def _member_dict(m):
    active_kloters = [ms.kloter.name for ms in m.memberships if ms.kloter.status == "active"]
    return {
        "id": str(m.id),
        "name": m.name,
        "wa": m.wa,
        "nik": m.nik,
        "bank_name": m.bank_name,
        "bank_account_number": m.bank_account_number,
        "bank_account_name": m.bank_account_name,
        "status": m.status,
        "reputation_score": m.reputation_score,
        "registration_type": m.registration_type,
        "active_kloters": active_kloters,
        "total_kloters": len(m.memberships),
        "created_at": m.created_at.strftime("%Y-%m-%d") if m.created_at else None,
    }


@router.get("/admin/list")
def admin_list_members(
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    stmt = (
        select(Member)
        .where(Member.tenant_id == admin.tenant_id)
        .options(selectinload(Member.memberships).joinedload(Membership.kloter))
        .order_by(Member.created_at)
    )
    members = db.execute(stmt).unique().scalars().all()
    return [_member_dict(m) for m in members]


@router.post("/admin/create")
def admin_create_member(
    payload: dict = Body(...),
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    wa_raw = str(payload.get("wa", "")).strip()
    # Normalize to international format
    if wa_raw.startswith("0"):
        wa_raw = "62" + wa_raw[1:]

    existing = db.execute(
        select(Member).where(Member.tenant_id == admin.tenant_id, Member.wa == wa_raw)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Nomor WA sudah terdaftar")

    member = Member(
        id=uuid_lib.uuid4(),
        tenant_id=admin.tenant_id,
        name=str(payload.get("name", "")).strip(),
        wa=wa_raw,
        nik=payload.get("nik") or None,
        bank_name=payload.get("bank_name") or None,
        bank_account_number=payload.get("bank_account_number") or None,
        bank_account_name=payload.get("bank_account_name") or None,
        status="active",
        registration_type="admin",
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return {"id": str(member.id), "name": member.name, "wa": member.wa}


@router.put("/admin/{member_id}/bank")
def admin_update_member_bank(
    member_id: str,
    payload: dict = Body(...),
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    member = db.execute(
        select(Member).where(Member.id == member_id, Member.tenant_id == admin.tenant_id)
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if "bank_name" in payload:
        member.bank_name = payload["bank_name"] or None
    if "bank_account_number" in payload:
        member.bank_account_number = payload["bank_account_number"] or None
    if "bank_account_name" in payload:
        member.bank_account_name = payload["bank_account_name"] or None
    db.commit()
    return {"status": "updated"}


@router.get("/profile")
def member_profile(
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    m = db.execute(select(Member).where(Member.id == member.id)).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    return {
        "name": m.name,
        "wa": m.wa,
        "nik": m.nik,
        "bank_name": m.bank_name,
        "bank_account_number": m.bank_account_number,
        "bank_account_name": m.bank_account_name,
    }


@router.put("/profile")
def member_update_profile(
    payload: dict = Body(...),
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    m = db.execute(select(Member).where(Member.id == member.id)).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Update basic info
    if "name" in payload:
        m.name = payload["name"] or m.name
    if "nik" in payload:
        m.nik = payload["nik"] or m.nik
        
    # Update bank info
    if "bank_name" in payload:
        m.bank_name = payload["bank_name"] or m.bank_name
    if "bank_account_number" in payload:
        m.bank_account_number = payload["bank_account_number"] or m.bank_account_number
    if "bank_account_name" in payload:
        m.bank_account_name = payload["bank_account_name"] or m.bank_account_name
        
    db.commit()
    return {"status": "updated", "name": m.name}


@router.get("/home")
def member_home(
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    item = MemberRepository(db).get_member_home(member.id, member.tenant_id)
    if not item:
        raise HTTPException(status_code=404, detail="Member not found")

    kloters_data = []
    pending_payments = 0
    total_contributions = 0

    for ms in item.memberships:
        kloter = ms.kloter
        if not kloter:
            continue
            
        total_contributions += kloter.contribution

        stmt = select(Period).where(
            Period.kloter_id == kloter.id,
            Period.status.in_(["collecting", "verifying", "ready_get"])
        ).order_by(Period.period_number).limit(1)
        current_period = db.execute(stmt).scalar_one_or_none()

        if not current_period:
            stmt_fallback = select(Period).where(
                Period.kloter_id == kloter.id
            ).order_by(Period.period_number.desc()).limit(1)
            current_period = db.execute(stmt_fallback).scalar_one_or_none()

        expectation = next(
            (e for e in ms.expectations if current_period and e.period_id == current_period.id),
            None
        )

        if expectation and expectation.status == "expected":
            pending_payments += 1

        days_until = None
        if expectation and expectation.due_datetime:
            today = datetime.utcnow().date()
            due_date = expectation.due_datetime.date()
            days_until = max(0, (due_date - today).days)

        kloters_data.append({
            "id": str(kloter.id),
            "name": kloter.name,
            "contribution": kloter.contribution,
            "next_get_date": str(current_period.due_date) if current_period else str(kloter.start_date),
            "current_period": current_period.period_number if current_period else 0,
            "total_periods": kloter.slot_total,
            "status": current_period.status if current_period else "completed",
            "payment_id": str(expectation.id) if expectation else None,
            "payment_status": expectation.status if expectation else "none",
            "days_until_deadline": days_until if days_until is not None else 0,
        })

    return {
        "member_id": str(item.id),
        "name": item.name,
        "kloters": kloters_data,
        "stats": {
            "active_kloters": len(item.memberships),
            "pending_payments": pending_payments,
            "total_contributions": total_contributions,
        },
    }


@router.get("/payments/pending")
def member_pending_payments(
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    """Return payment expectation for current active period only — one per kloter."""
    item = MemberRepository(db).get_member_home(member.id, member.tenant_id)
    if not item:
        raise HTTPException(status_code=404, detail="Member not found")

    results = []
    for ms in item.memberships:
        kloter = ms.kloter

        # Find current active period for this kloter
        current_period = db.execute(
            select(Period)
            .where(
                Period.kloter_id == kloter.id,
                Period.status.in_(["collecting", "verifying", "ready_get"])
            )
            .order_by(Period.period_number)
            .limit(1)
        ).scalar_one_or_none()

        if not current_period:
            continue

        # Get member's expectation for this period only
        exp = next((e for e in ms.expectations if e.period_id == current_period.id), None)
        if not exp or exp.status == "verified":
            continue

        attempts_sorted = sorted(exp.attempts, key=lambda a: a.created_at)
        proof_attempt = next((a for a in reversed(attempts_sorted) if a.proof_url), None)
        proof_url = proof_attempt.proof_url if proof_attempt else None

        results.append({
            "id": str(exp.id),
            "kloter_id": str(kloter.id),
            "kloter_name": kloter.name,
            "expected_amount": exp.expected_amount,
            "unique_code": exp.unique_code,
            "status": exp.status,
            "deadline_hour": kloter.payment_deadline_hour,
            "due_datetime": exp.due_datetime.isoformat() if exp.due_datetime else None,
            "proof_url": f"http://127.0.0.1:8002{proof_url}" if proof_url else None,
            "submitted_at": proof_attempt.created_at.strftime("%d %b %Y, %H:%M") if proof_attempt else None,
        })
    return {"payments": results}


@router.get("/kloter/{kloter_id}")
def member_kloter_detail(
    kloter_id: str,
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    item = MemberRepository(db).get_member_home(member.id, member.tenant_id)
    if not item:
        raise HTTPException(status_code=404, detail="Member not found")

    membership = next((ms for ms in item.memberships if str(ms.kloter_id) == kloter_id), None)
    if not membership:
        raise HTTPException(status_code=404, detail="Member is not in this kloter")

    kloter = membership.kloter

    # Active period
    stmt = select(Period).where(
        Period.kloter_id == kloter.id,
        Period.status.in_(["collecting", "verifying", "ready_get"])
    ).order_by(Period.period_number).limit(1)
    current_period = db.execute(stmt).scalar_one_or_none()

    if not current_period:
        stmt_fb = select(Period).where(Period.kloter_id == kloter.id).order_by(Period.period_number.desc()).limit(1)
        current_period = db.execute(stmt_fb).scalar_one_or_none()

    # Member's expectation for current period
    my_expectation = next(
        (e for e in membership.expectations if current_period and e.period_id == current_period.id),
        None
    )

    # Latest payment attempt (for penalty)
    latest_attempt = None
    if my_expectation and my_expectation.attempts:
        latest_attempt = sorted(my_expectation.attempts, key=lambda a: a.created_at)[-1]

    days_until = 0
    if my_expectation and my_expectation.due_datetime:
        today = datetime.utcnow().date()
        due_date = my_expectation.due_datetime.date()
        days_until = max(0, (due_date - today).days)

    # All periods sorted for timeline
    stmt_all = select(Period).where(Period.kloter_id == kloter.id).order_by(Period.period_number)
    all_periods = db.execute(stmt_all).scalars().all()

    timeline = []
    for p in all_periods:
        my_exp_for_period = next((e for e in membership.expectations if e.period_id == p.id), None)
        recipient_name = (
            p.get_membership.member.name
            if p.get_membership and p.get_membership.member
            else "—"
        )
        if my_exp_for_period:
            tl_status = my_exp_for_period.status
            if tl_status == "verified":
                tl_status = "lunas"
            elif tl_status in ("expected",):
                tl_status = "pending"
            elif tl_status == "late":
                tl_status = "telat"
            elif tl_status == "proof_uploaded":
                tl_status = "pending"
            amount = my_exp_for_period.expected_amount
        else:
            tl_status = "upcoming" if p.status in ("upcoming",) else "lunas"
            amount = kloter.contribution

        penalty = latest_attempt.penalty_amount if (
            my_exp_for_period and latest_attempt and
            my_expectation and my_exp_for_period.id == my_expectation.id
        ) else 0

        desc_map = {
            "lunas": "Iuran lunas tepat waktu",
            "telat": f"Terlambat — denda Rp {penalty:,.0f}",
            "pending": "Menunggu verifikasi",
            "upcoming": "Belum dimulai",
        }

        timeline.append({
            "period": p.period_number,
            "member": recipient_name,
            "date": str(p.due_date),
            "status": tl_status,
            "amount": amount,
            "desc": desc_map.get(tl_status, tl_status),
        })

    return {
        "id": str(kloter.id),
        "name": kloter.name,
        "type": kloter.type,
        "contribution": kloter.contribution,
        "status": kloter.status,
        "current_period": current_period.period_number if current_period else 0,
        "total_periods": kloter.slot_total,
        "next_get_date": str(current_period.due_date) if current_period else str(kloter.start_date),
        "my_slot": membership.slot_number,
        "my_payment_status": my_expectation.status if my_expectation else "none",
        "my_payment_id": str(my_expectation.id) if my_expectation else None,
        "my_unique_code": str(my_expectation.unique_code) if my_expectation else "—",
        "my_expected_amount": my_expectation.expected_amount if my_expectation else kloter.contribution,
        "my_penalty": latest_attempt.penalty_amount if latest_attempt else 0,
        "days_until_deadline": days_until,
        "days_late": latest_attempt.late_days if latest_attempt else 0,
        "get_value": kloter.contribution * kloter.slot_total,
        "payment_deadline_hour": kloter.payment_deadline_hour,
        "bank_name": "BCA",
        "account_number": f"0{str(kloter.id)[:3].upper()} {membership.slot_number:04d} {my_expectation.unique_code if my_expectation else '0000'}",
        "admin_name": "Admin Kloterby",
        "timeline": timeline,
    }


@router.get("/kloters/open")
def member_open_kloters(
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    """Return kloters with available slots for the member to join."""
    member_obj = db.execute(select(Member).where(Member.id == member.id)).scalar_one_or_none()
    if not member_obj:
        raise HTTPException(status_code=404, detail="Member not found")

    stmt = (
        select(Kloter)
        .where(Kloter.tenant_id == member_obj.tenant_id, Kloter.status == "active")
        .options(selectinload(Kloter.memberships))
    )
    kloters = db.execute(stmt).unique().scalars().all()

    my_kloter_ids = {str(ms.kloter_id) for ms in db.execute(
        select(Membership).where(Membership.member_id == member.id)
    ).scalars().all()}

    result = []
    for k in kloters:
        filled = len(k.memberships)
        open_slots = k.slot_total - filled
        if open_slots <= 0:
            continue
        result.append({
            "id": str(k.id),
            "name": k.name,
            "type": k.type,
            "slot_total": k.slot_total,
            "filled_slots": filled,
            "open_slots": open_slots,
            "contribution": k.contribution,
            "already_joined": str(k.id) in my_kloter_ids,
        })
    return result


@router.post("/kloters/{kloter_id}/join")
def member_join_kloter(
    kloter_id: str,
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    """Member self-registers to the next available slot."""
    member_obj = db.execute(select(Member).where(Member.id == member.id)).scalar_one_or_none()
    if not member_obj:
        raise HTTPException(status_code=404, detail="Member not found")

    kloter = db.execute(
        select(Kloter)
        .where(Kloter.id == kloter_id, Kloter.tenant_id == member_obj.tenant_id, Kloter.status == "active")
        .options(
            selectinload(Kloter.memberships),
            selectinload(Kloter.periods).joinedload(Period.progress),
        )
    ).unique().scalar_one_or_none()
    if not kloter:
        raise HTTPException(status_code=404, detail="Kloter not found or not active")

    already = db.execute(
        select(Membership).where(Membership.kloter_id == kloter.id, Membership.member_id == member.id)
    ).scalar_one_or_none()
    if already:
        raise HTTPException(status_code=409, detail="Kamu sudah bergabung di kloter ini")

    filled_slots = {m.slot_number for m in kloter.memberships}
    next_slot = next((s for s in range(1, kloter.slot_total + 1) if s not in filled_slots), None)
    if next_slot is None:
        raise HTTPException(status_code=409, detail="Kloter sudah penuh")

    membership = Membership(
        id=uuid_lib.uuid4(),
        member_id=member.id,
        kloter_id=kloter.id,
        slot_number=next_slot,
        get_order=next_slot,
        status="active",
    )
    db.add(membership)
    db.flush()

    sorted_periods = sorted(kloter.periods, key=lambda p: p.period_number)
    for period in sorted_periods:
        if period.period_number == next_slot and period.get_membership_id is None:
            period.get_membership_id = membership.id
        if period.status in ("collecting", "verifying", "upcoming", "ready_get"):
            code = generate_unique_code(next_slot, period.period_number)
            exp = PaymentExpectation(
                membership_id=membership.id,
                period_id=period.id,
                expected_amount=kloter.contribution,
                unique_code=code,
                due_datetime=combine_due_datetime(period.due_date, kloter.payment_deadline_hour),
            )
            db.add(exp)
            if period.progress:
                period.progress.expected_count += 1

    db.commit()
    return {"status": "joined", "slot": next_slot, "kloter": kloter.name}
