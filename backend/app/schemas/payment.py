from datetime import datetime

from pydantic import BaseModel


class PaymentQueueItem(BaseModel):
    id: str
    member_name: str
    kloter_name: str
    period_number: int
    expected_amount: int
    unique_code: int
    status: str
    due_datetime: datetime


class BulkVerifyRequest(BaseModel):
    ids: list[str]


class RejectPaymentRequest(BaseModel):
    note: str | None = None


class ProofUploadRequest(BaseModel):
    proof_url: str
