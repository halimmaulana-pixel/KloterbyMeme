from pydantic import BaseModel


class MemberHomeKloterItem(BaseModel):
    membership_id: str
    kloter_id: str
    kloter_name: str
    status: str


class MemberHomeResponse(BaseModel):
    member_id: str
    name: str
    wa: str
    kloters: list[MemberHomeKloterItem]


class MemberKloterDetailResponse(BaseModel):
    member_id: str
    kloter_id: str
    kloter_name: str
    contribution: int
    slot_total: int
