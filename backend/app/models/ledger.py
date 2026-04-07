import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("tenants.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="iuran")
    bank_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(), ForeignKey("bank_accounts.id")
    )
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID())
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tenant = relationship("Tenant", back_populates="ledger_entries")
