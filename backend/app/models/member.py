import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, UniqueConstraint, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (
        UniqueConstraint("tenant_id", "wa", name="uq_member_tenant_wa"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("tenants.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    wa: Mapped[str] = mapped_column(String(20), nullable=False)
    nik: Mapped[str | None] = mapped_column(String(16))
    bank_name: Mapped[str | None] = mapped_column(String(50))
    bank_account_number: Mapped[str | None] = mapped_column(String(50))
    bank_account_name: Mapped[str | None] = mapped_column(String(100))
    selfie_url: Mapped[str | None] = mapped_column(String(255))
    ktp_url: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    reputation_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    registration_type: Mapped[str] = mapped_column(String(10), nullable=False, default="admin")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tenant = relationship("Tenant", back_populates="members")
    memberships = relationship("Membership", back_populates="member")
