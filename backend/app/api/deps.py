import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status

from app.core.security import decode_access_token
from app.database import get_db


def _to_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        return value  # fallback for dev header values like "admin-dev"


@dataclass
class CurrentAdmin:
    id: uuid.UUID
    tenant_id: uuid.UUID
    role: str = "admin"


@dataclass
class CurrentMember:
    id: uuid.UUID
    tenant_id: uuid.UUID


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    return token


def get_current_admin(
    authorization: str | None = Header(default=None),
    x_admin_id: str = Header(default="admin-dev"),
    x_tenant_id: str = Header(default="tenant-dev"),
):
    token = _extract_bearer_token(authorization)
    if token:
        try:
            payload = decode_access_token(token)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc
        if payload.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )
        return CurrentAdmin(
            id=_to_uuid(payload["sub"]),
            tenant_id=_to_uuid(payload["tenant_id"]),
            role=payload["role"],
        )

    if not x_tenant_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing tenant")
    return CurrentAdmin(id=_to_uuid(x_admin_id), tenant_id=_to_uuid(x_tenant_id))


def get_current_member(
    authorization: str | None = Header(default=None),
    x_member_id: str = Header(default="member-dev"),
    x_tenant_id: str = Header(default="tenant-dev"),
):
    token = _extract_bearer_token(authorization)
    if token:
        try:
            payload = decode_access_token(token)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc
        if payload.get("role") != "member":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Member access required",
            )
        return CurrentMember(
            id=_to_uuid(payload["sub"]),
            tenant_id=_to_uuid(payload["tenant_id"]),
        )

    if not x_tenant_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing tenant")
    return CurrentMember(id=_to_uuid(x_member_id), tenant_id=_to_uuid(x_tenant_id))


DbSession = Depends(get_db)
