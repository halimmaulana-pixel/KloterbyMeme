import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Period(Base):
    __tablename__ = "periods"
    __table_args__ = (
        UniqueConstraint("kloter_id", "period_number", name="uq_period_kloter_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    kloter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("kloters.id"), nullable=False
    )
    get_membership_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(), ForeignKey("memberships.id")
    )
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    get_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="upcoming")
    disbursed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    kloter = relationship("Kloter", back_populates="periods")
    get_membership = relationship("Membership", back_populates="periods_getting")
    progress = relationship("PeriodProgress", back_populates="period", uselist=False)
    expectations = relationship("PaymentExpectation", back_populates="period")
    disbursement = relationship("Disbursement", back_populates="period", uselist=False)


class PeriodProgress(Base):
    __tablename__ = "period_progress"

    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("periods.id"), primary_key=True
    )
    expected_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paid_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    late_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    defaulted_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    period = relationship("Period", back_populates="progress")
