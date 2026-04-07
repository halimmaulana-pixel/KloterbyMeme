import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Kloter(Base):
    __tablename__ = "kloters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("tenants.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    slot_total: Mapped[int] = mapped_column(Integer, nullable=False)
    contribution: Mapped[int] = mapped_column(BigInteger, nullable=False)
    fee_admin: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    penalty_per_day: Mapped[int] = mapped_column(BigInteger, nullable=False, default=25000)
    payment_deadline_hour: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tenant = relationship("Tenant", back_populates="kloters")
    memberships = relationship("Membership", back_populates="kloter")
    periods = relationship("Period", back_populates="kloter")
