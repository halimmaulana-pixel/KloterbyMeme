import uuid
import random
import requests
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.api.deps import get_db
from app.core.security import create_access_token, verify_password
from app.schemas.auth import LoginRequest, OtpSendRequest, OtpVerifyRequest, TokenResponse
from app.repositories.admin_repo import AdminRepository
from app.repositories.member_repo import MemberRepository
from app.repositories.tenant_repo import TenantRepository
from app.config import settings

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db=Depends(get_db)):
    # 1. Try Admin Login (by email)
    admin = AdminRepository(db).get_by_email(payload.email)
    if admin:
        if verify_password(payload.password, admin.password_hash):
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

    # 2. Try Member Login (payload.email will act as the WA number here)
    # Get first tenant (assuming single tenant or default)
    tenant = TenantRepository(db).get_first()
    if not tenant:
        raise HTTPException(status_code=404, detail="No tenant configured")
    
    member = MemberRepository(db).get_by_wa(tenant.id, payload.email)
    if member and member.status == "active":
        # If password_hash is null, default password is the WA number itself
        is_valid = False
        if member.password_hash:
            is_valid = verify_password(payload.password, member.password_hash)
        else:
            is_valid = (payload.password == member.wa)
            
        if is_valid:
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

    raise HTTPException(status_code=401, detail="Email/No HP atau password salah")


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

    # Verify member exists in this tenant and is active
    member = MemberRepository(db).get_by_wa(tenant_id, payload.wa)
    if not member:
        raise HTTPException(status_code=404, detail="Member tidak ditemukan.")
    
    if member.status != "active":
        detail = "Akun belum aktif. Hubungi admin." if member.status == "pending" else "Akun ditolak atau dinonaktifkan."
        raise HTTPException(status_code=403, detail=detail)

    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')

    # Save to DB (using raw SQL for the custom otp_codes table)
    db.execute(
        text("INSERT INTO otp_codes (wa, code, expires_at) VALUES (:wa, :code, :expires_at)"),
        {"wa": payload.wa, "code": otp_code, "expires_at": expires_at}
    )
    db.commit()

    # Send via Fonnte
    if settings.wa_token:
        try:
            url = f"{settings.wa_base_url.rstrip('/')}/send"
            res = requests.post(
                url,
                headers={"Authorization": settings.wa_token},
                data={
                    "target": payload.wa,
                    "message": f"Kode OTP Kloterby kamu adalah: {otp_code}. Rahasiakan kode ini. Berlaku 5 menit.",
                },
                timeout=10
            )
        except Exception as e:
            print(f"Error sending WA: {e}")
    else:
        print(f"WARNING: WA_TOKEN not set. OTP code for {payload.wa} is: {otp_code}")
        
    return {
        "message": "OTP dikirim",
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

    # Verify code
    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    res = db.execute(
        text("SELECT code FROM otp_codes WHERE wa = :wa AND code = :code AND expires_at > :now ORDER BY id DESC LIMIT 1"),
        {"wa": payload.wa, "code": payload.otp_code, "now": now}
    ).fetchone()

    if not res:
        raise HTTPException(status_code=401, detail="Kode OTP salah atau sudah kadaluarsa")

    # Clear code after use
    db.execute(text("DELETE FROM otp_codes WHERE wa = :wa"), {"wa": payload.wa})
    db.commit()

    member = MemberRepository(db).get_by_wa(tenant_id, payload.wa)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member.status != "active":
        raise HTTPException(status_code=403, detail="Akun belum aktif")
        
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
