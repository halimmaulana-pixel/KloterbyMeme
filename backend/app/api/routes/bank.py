from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin, get_current_member, CurrentAdmin, CurrentMember

...

@router.get("/member/list")
def list_banks_for_member(current_member: CurrentMember = Depends(get_current_member), db: Session = Depends(get_db)):
    repo = BankAccountRepository(db)
    banks = repo.get_multi_by_tenant(current_member.tenant_id)
    return [
        {
            "id": str(b.id),
            "bank_name": b.bank_name,
            "account_number": b.account_number,
            "account_holder_name": b.account_holder_name,
            "type": b.type
        } for b in banks if b.status == "active"
    ]
from app.models.bank import BankAccount
from app.repositories.bank_repo import BankAccountRepository

router = APIRouter()

@router.get("/list")
def list_banks(current_admin: CurrentAdmin = Depends(get_current_admin), db: Session = Depends(get_db)):
    repo = BankAccountRepository(db)
    banks = repo.get_multi_by_tenant(current_admin.tenant_id)
    return [
        {
            "id": str(b.id),
            "bank_name": b.bank_name,
            "account_number": b.account_number,
            "account_holder_name": b.account_holder_name,
            "type": b.type
        } for b in banks
    ]

@router.post("")
def create_bank(
    payload: dict,
    current_admin: CurrentAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_bank = BankAccount(
        tenant_id=current_admin.tenant_id,
        bank_name=payload["bank_name"],
        account_number=payload["account_number"],
        account_holder_name=payload["account_holder_name"],
        type=payload.get("type", "bank")
    )
    db.add(new_bank)
    db.commit()
    return {"message": "Bank account created"}
