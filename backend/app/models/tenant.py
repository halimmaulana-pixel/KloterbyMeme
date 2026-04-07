import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func, JSON
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="starter")
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    admins = relationship("AdminUser", back_populates="tenant")
    members = relationship("Member", back_populates="tenant")
    kloters = relationship("Kloter", back_populates="tenant")
    accounts = relationship("BankAccount", back_populates="tenant")
    ledger_entries = relationship("LedgerEntry", back_populates="tenant")
    audit_logs = relationship("AuditLog", back_populates="tenant")
