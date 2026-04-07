from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import CurrentAdmin, get_current_admin, get_db
from app.models.disbursement import Disbursement
from app.models.kloter import Kloter
from app.models.membership import Membership
from app.models.period import Period
from app.services.disbursement_service import DisbursementService


router = APIRouter()


def _load_opts():
    return [
        joinedload(Disbursement.period).joinedload(Period.kloter),
        joinedload(Disbursement.period).joinedload(Period.progress),
        selectinload(Disbursement.membership).joinedload(Membership.member),
    ]


def _disb_dict(item, include_breakdown=True):
    member = item.membership.member if item.membership else None
    d = {
        "id": str(item.id),
        "kloter_name": item.period.kloter.name if item.period and item.period.kloter else "—",
        "period_number": item.period.period_number if item.period else 0,
        "recipient_name": member.name if member else "—",
        "recipient_wa": member.wa if member else None,
        "bank_name": member.bank_name if member else None,
        "bank_account_number": member.bank_account_number if member else None,
        "bank_account_name": member.bank_account_name if member else None,
        "net_amount": item.net_amount,
        "status": item.status,
        "released_at": item.released_at.strftime("%d %b %Y, %H:%M") if item.released_at else None,
    }
    if include_breakdown:
        d.update({
            "period_id": str(item.period_id),
            "membership_id": str(item.membership_id),
            "gross_amount": item.gross_amount,
            "fee_deducted": item.fee_deducted,
            "penalty_added": item.penalty_added,
        })
    return d


@router.get("/ready")
def ready_disbursements(
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    stmt = (
        select(Disbursement)
        .join(Disbursement.period)
        .join(Period.kloter)
        .where(Disbursement.status == "ready", Kloter.tenant_id == admin.tenant_id)
        .options(*_load_opts())
    )
    items = db.execute(stmt).unique().scalars().all()
    return [_disb_dict(item) for item in items]


@router.get("/history")
def disbursement_history(
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    stmt = (
        select(Disbursement)
        .join(Disbursement.period)
        .join(Period.kloter)
        .where(Disbursement.status == "released", Kloter.tenant_id == admin.tenant_id)
        .options(*_load_opts())
        .order_by(Disbursement.released_at.desc())
    )
    items = db.execute(stmt).unique().scalars().all()
    return [_disb_dict(item, include_breakdown=False) for item in items]


@router.post("/{disbursement_id}/release")
def release_disbursement(
    disbursement_id: str,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    stmt = (
        select(Disbursement)
        .join(Disbursement.period)
        .join(Period.kloter)
        .where(Disbursement.id == disbursement_id, Kloter.tenant_id == admin.tenant_id)
        .options(*_load_opts())
    )
    disbursement = db.execute(stmt).unique().scalar_one_or_none()
    if not disbursement:
        raise HTTPException(status_code=404, detail="Disbursement not found")

    DisbursementService().release_get(db, disbursement, admin.id)
    db.commit()
    return {"status": "released", "id": disbursement_id}
