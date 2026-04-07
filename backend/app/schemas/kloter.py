from datetime import date, datetime

from pydantic import BaseModel


class KloterCreateRequest(BaseModel):
    name: str
    type: str
    slot_total: int
    contribution: int
    fee_admin: int = 0
    penalty_per_day: int = 25000
    payment_deadline_hour: int = 20
    start_date: date
    status: str = "active"


class KloterListItem(BaseModel):
    id: str
    name: str
    type: str
    slot_total: int
    contribution: int
    status: str
    created_at: datetime


class KloterDetailResponse(BaseModel):
    id: str
    name: str
    type: str
    slot_total: int
    contribution: int
    fee_admin: int
    penalty_per_day: int
    payment_deadline_hour: int
    start_date: date
    status: str
