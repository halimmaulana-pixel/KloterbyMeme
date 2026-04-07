import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentExpectation(Base):
    __tablename__ = "payment_expectations"
    __table_args__ = (
        UniqueConstraint("membership_id", "period_id", name="uq_payment_expectation_member_period"),
        UniqueConstraint("unique_code", "period_id", name="uq_payment_expectation_code_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("memberships.id"), nullable=False
    )
    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("periods.id"), nullable=False
    )
    expected_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unique_code: Mapped[int] = mapped_column(Integer, nullable=False)
    due_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="expected")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    membership = relationship("Membership", back_populates="expectations")
    period = relationship("Period", back_populates="expectations")
    attempts = relationship("PaymentAttempt", back_populates="expectation")


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"
    __table_args__ = (
        CheckConstraint("paid_amount >= 0", name="ck_payment_attempt_paid_amount_non_negative"),
        CheckConstraint("match_score >= 0.0 AND match_score <= 1.0", name="ck_payment_attempt_match_score_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    expectation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("payment_expectations.id"), nullable=False
    )
    paid_amount: Mapped[int | None] = mapped_column(BigInteger)
    proof_url: Mapped[str | None] = mapped_column(Text)
    bank_tx_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(), ForeignKey("bank_transactions.id")
    )
    match_score: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(), ForeignKey("admin_users.id")
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    penalty_amount: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    late_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    expectation = relationship("PaymentExpectation", back_populates="attempts")
    bank_transaction = relationship("BankTransaction", back_populates="payment_attempts")
