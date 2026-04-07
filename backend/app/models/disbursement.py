import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Disbursement(Base):
    __tablename__ = "disbursements"
    __table_args__ = (
        UniqueConstraint("period_id", name="uq_disbursement_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("periods.id"), nullable=False
    )
    membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("memberships.id"), nullable=False
    )
    gross_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    fee_deducted: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    penalty_added: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    net_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    released_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(), ForeignKey("admin_users.id")
    )
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hold_reason: Mapped[str | None] = mapped_column(Text)
    wa_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    period = relationship("Period", back_populates="disbursement")
    membership = relationship("Membership", back_populates="disbursements")
