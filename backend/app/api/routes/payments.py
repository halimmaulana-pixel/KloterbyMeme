import os
import uuid as uuid_lib
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import CurrentAdmin, CurrentMember, get_current_admin, get_current_member, get_db
from app.models.payment import PaymentAttempt
from app.repositories.payment_repo import PaymentRepository
from app.schemas.payment import BulkVerifyRequest, RejectPaymentRequest
from app.services.audit_service import AuditService
from app.services.payment_service import PaymentService

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


router = APIRouter()


@router.get("/queue")
def payment_queue(
    status: str | None = None,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    items = PaymentRepository(db).get_queue(admin.tenant_id, status=status)
    result = []
    for item in items:
        latest_attempt = sorted(item.attempts, key=lambda a: a.created_at)[-1] if item.attempts else None
        proof_url = latest_attempt.proof_url if latest_attempt else None
        result.append({
            "id": str(item.id),
            "member_name": item.membership.member.name,
            "member_wa": item.membership.member.wa,
            "kloter_name": item.membership.kloter.name,
            "period_number": item.period.period_number,
            "expected_amount": item.expected_amount,
            "unique_code": item.unique_code,
            "status": item.status,
            "due_datetime": item.due_datetime,
            "proof_url": f"http://127.0.0.1:8002{proof_url}" if proof_url else None,
        })
    return result


@router.post("/{expectation_id}/verify")
def verify_payment(
    expectation_id: str,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    expectation = PaymentRepository(db).get_with_tenant_check(expectation_id, admin.tenant_id)
    if not expectation:
        raise HTTPException(status_code=404, detail="Payment expectation not found")

    PaymentService().verify_payment(db, expectation, admin.id)
    db.commit()
    return {"status": "verified", "id": expectation_id}


@router.post("/{expectation_id}/reject")
def reject_payment(
    expectation_id: str,
    payload: RejectPaymentRequest,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    expectation = PaymentRepository(db).get_with_tenant_check(expectation_id, admin.tenant_id)
    if not expectation:
        raise HTTPException(status_code=404, detail="Payment expectation not found")

    PaymentService().reject_payment(db, expectation, admin.id, note=payload.note)
    db.commit()
    return {"status": "rejected", "id": expectation_id}


@router.post("/bulk-verify")
def bulk_verify(
    payload: BulkVerifyRequest,
    db=Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    if len(payload.ids) > 50:
        raise HTTPException(status_code=422, detail="Max 50 payments per bulk verify")

    results = []
    service = PaymentService()
    repo = PaymentRepository(db)
    for expectation_id in payload.ids:
        expectation = repo.get_with_tenant_check(expectation_id, admin.tenant_id)
        if not expectation:
            results.append({"id": expectation_id, "status": "not_found"})
            continue
        try:
            service.verify_payment(db, expectation, admin.id)
            results.append({"id": expectation_id, "status": "verified"})
        except Exception as exc:
            results.append({"id": expectation_id, "status": "error", "reason": str(exc)})
    db.commit()
    return results


@router.post("/member/{expectation_id}/proof")
async def upload_member_proof(
    expectation_id: str,
    file: UploadFile = File(...),
    bank_account_id: str | None = None,
    db=Depends(get_db),
    member: CurrentMember = Depends(get_current_member),
):
    expectation = PaymentRepository(db).get(expectation_id)
    if not expectation:
        raise HTTPException(status_code=404, detail="Payment expectation not found")

    # Save file locally
    ext = os.path.splitext(file.filename or "proof.jpg")[1] or ".jpg"
    filename = f"{uuid_lib.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    proof_url = f"/uploads/{filename}"

    expectation.status = "proof_uploaded"
    attempt = PaymentAttempt(
        expectation_id=expectation.id,
        proof_url=proof_url,
        bank_account_id=bank_account_id,
        status="proof_uploaded",
    )
    db.add(attempt)
    AuditService().log(
        db=db,
        tenant_id=member.tenant_id,
        action="payment.proof_uploaded",
        resource_type="payment_expectation",
        resource_id=expectation.id,
        note=proof_url,
    )
    db.commit()
    return {"status": "proof_uploaded", "id": expectation_id, "proof_url": proof_url}
