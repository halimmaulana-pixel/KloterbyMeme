from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin, CurrentAdmin
from app.models.ledger import LedgerEntry
from app.core.enums import LedgerType, PaymentStatus

router = APIRouter()

@router.get("/summary")
def get_report_summary(current_admin: CurrentAdmin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Returns summary of 4 Virtual Drawers:
    1. Laci Modal (CASH): Iuran masuk - Iuran keluar
    2. Laci Profit (PROFIT): Fee masuk
    3. Laci Piutang (PIUTANG): Talangan keluar - Talangan balik
    4. Laci Denda (DENDA): Denda masuk
    """
    tenant_id = current_admin.tenant_id
    
    # helper to sum ledger by type
    def sum_type(l_type):
        query = select(func.sum(LedgerEntry.amount)).where(
            LedgerEntry.tenant_id == tenant_id,
            LedgerEntry.type == l_type
        )
        return db.scalar(query) or 0

    laci_modal = sum_type(LedgerType.PAYMENT_IN.value) - sum_type(LedgerType.GET_OUT.value)
    laci_profit = sum_type(LedgerType.FEE_IN.value)
    laci_piutang = sum_type(LedgerType.BAILOUT_OUT.value) - sum_type(LedgerType.BAILOUT_REPAY.value)
    laci_denda = sum_type(LedgerType.PENALTY_IN.value)
    
    return {
        "laci_modal": laci_modal,
        "laci_profit": laci_profit,
        "laci_piutang": laci_piutang,
        "laci_denda": laci_denda,
        "total_cash": laci_modal + laci_profit + laci_denda # Piutang is not cash on hand
    }

@router.get("/receivables")
def get_receivables_detail(current_admin: CurrentAdmin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """
    Returns detailed list of bailouts (Piutang) per member and kloter.
    """
    from app.models.payment import PaymentExpectation
    from app.models.membership import Membership
    from app.models.member import Member
    from app.models.kloter import Kloter
    
    query = select(PaymentExpectation).where(
        PaymentExpectation.is_bailout == True,
        PaymentExpectation.status != PaymentStatus.VERIFIED.value # Still unpaid by member
    ).join(Membership).join(Member).join(Kloter).where(
        Kloter.tenant_id == current_admin.tenant_id
    )
    
    items = db.scalars(query).all()
    
    result = []
    for item in items:
        result.append({
            "id": str(item.id),
            "member_name": item.membership.member.name,
            "kloter_name": item.membership.kloter.name,
            "period_number": item.period.period_number,
            "amount": item.expected_amount,
            "due_date": item.due_datetime.isoformat(),
            "wa": item.membership.member.wa
        })
    
    return result
