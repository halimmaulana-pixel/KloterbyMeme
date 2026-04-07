from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OtpSendRequest(BaseModel):
    tenant_id: str | None = None
    wa: str


class OtpVerifyRequest(BaseModel):
    tenant_id: str | None = None
    wa: str
    otp_code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: str
