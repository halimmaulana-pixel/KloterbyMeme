from enum import Enum


class PaymentStatus(str, Enum):
    EXPECTED = "expected"
    PROOF_UPLOADED = "proof_uploaded"
    AUTO_MATCHED = "auto_matched"
    MANUAL_REVIEW = "manual_review"
    VERIFIED = "verified"
    LATE = "late"
    DEFAULTED = "defaulted"
    REJECTED = "rejected"


class PeriodStatus(str, Enum):
    UPCOMING = "upcoming"
    COLLECTING = "collecting"
    VERIFYING = "verifying"
    READY_GET = "ready_get"
    COMPLETED = "completed"
    PROBLEM = "problem"


class DisbursementStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    RELEASED = "released"
    HELD = "held"
    DISPUTED = "disputed"


class KloterType(str, Enum):
    HARIAN = "harian"
    MINGGUAN = "mingguan"
    BULANAN = "bulanan"


class AdminRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    VIEWER = "viewer"


class LedgerType(str, Enum):
    PAYMENT_IN = "payment_in"
    GET_OUT = "get_out"
    FEE_IN = "fee_in"
    PENALTY_IN = "penalty_in"
