import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from app.types import UUIDType as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("kloter_id", "slot_number", name="uq_membership_kloter_slot"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(), primary_key=True, default=uuid.uuid4)
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("members.id"), nullable=False
    )
    kloter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(), ForeignKey("kloters.id"), nullable=False
    )
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    get_order: Mapped[int] = mapped_column(Integer, nullable=False)
    get_custom_amount: Mapped[int | None] = mapped_column(BigInteger)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    member = relationship("Member", back_populates="memberships")
    kloter = relationship("Kloter", back_populates="memberships")
    periods_getting = relationship("Period", back_populates="get_membership")
    expectations = relationship("PaymentExpectation", back_populates="membership")
    disbursements = relationship("Disbursement", back_populates="membership")
