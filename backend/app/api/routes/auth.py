import uuid
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_db
from app.core.security import create_access_token, verify_password
from app.schemas.auth import LoginRequest, OtpSendRequest, OtpVerifyRequest, TokenResponse
from app.repositories.admin_repo import AdminRepository
from app.repositories.member_repo import MemberRepository
from app.repositories.tenant_repo import TenantRepository

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db=Depends(get_db)):
    print(f"Login attempt for email: {payload.email}")
    admin = AdminRepository(db).get_by_email(payload.email)
    if not admin:
        all_admins = db.query(AdminUser).all()
        print(f"Admin not found: {payload.email}. Total admins in DB: {len(all_admins)}")
        if all_admins:
            print(f"Existing admins: {[a.email for a in all_admins]}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(payload.password, admin.password_hash):
        print(f"Invalid password for: {payload.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    print(f"Login successful for: {payload.email}")
    token = create_access_token(
        subject=admin.email,
        role="admin",
        tenant_id=str(admin.tenant_id),
    )
    return TokenResponse(
        access_token=token,
        role="admin",
        tenant_id=str(admin.tenant_id),
    )


@router.post("/otp/send")
def send_otp(payload: OtpSendRequest, db=Depends(get_db)) -> dict[str, str]:
    # Use provided tenant_id or fallback to first tenant
    tenant_id_str = payload.tenant_id
    if tenant_id_str == "tenant-dev" or not tenant_id_str:
        tenant = TenantRepository(db).get_first()
        if not tenant:
            raise HTTPException(status_code=404, detail="No tenant configured")
        tenant_id = tenant.id
    else:
        try:
            tenant_id = uuid.UUID(tenant_id_str)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid tenant ID format")

    # Verify member exists in this tenant
    member = MemberRepository(db).get_by_wa(tenant_id, payload.wa)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in this tenant")
        
    return {
        "message": "OTP sent simulated",
        "tenant_id": str(tenant_id),
        "wa": payload.wa,
    }


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(payload: OtpVerifyRequest, db=Depends(get_db)):
    # Use provided tenant_id or fallback to first tenant
    tenant_id_str = payload.tenant_id
    if tenant_id_str == "tenant-dev" or not tenant_id_str:
        tenant = TenantRepository(db).get_first()
        if not tenant:
            raise HTTPException(status_code=404, detail="No tenant configured")
        tenant_id = tenant.id
    else:
        try:
            tenant_id = uuid.UUID(tenant_id_str)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid tenant ID format")

    member = MemberRepository(db).get_by_wa(tenant_id, payload.wa)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    token = create_access_token(
        subject=str(member.id),
        role="member",
        tenant_id=str(member.tenant_id),
    )
    return TokenResponse(
        access_token=token,
        role="member",
        tenant_id=str(member.tenant_id),
    )
