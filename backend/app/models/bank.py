import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("tenants.id"), nullable=False
    )
    bank_name: Mapped[str] = mapped_column(String(50), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    account_holder_name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="bank")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tenant = relationship("Tenant", back_populates="accounts")
    transactions = relationship("BankTransaction", back_populates="bank_account")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"
    __table_args__ = (
        UniqueConstraint("bank_reference", name="uq_bank_transaction_reference"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    bank_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("bank_accounts.id"), nullable=False
    )
    bank_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    sender_name: Mapped[str | None] = mapped_column(String(100))
    sender_account: Mapped[str | None] = mapped_column(String(50))
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    transaction_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    match_status: Mapped[str] = mapped_column(String(20), nullable=False, default="unmatched")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    bank_account = relationship("BankAccount", back_populates="transactions")
    payment_attempts = relationship("PaymentAttempt", back_populates="bank_transaction")
