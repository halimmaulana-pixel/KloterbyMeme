from pydantic import BaseModel


class DisbursementReadyItem(BaseModel):
    id: str
    period_id: str
    membership_id: str
    gross_amount: int
    fee_deducted: int
    penalty_added: int
    net_amount: int
    status: str


class ReleaseDisbursementResponse(BaseModel):
    status: str
    id: str
