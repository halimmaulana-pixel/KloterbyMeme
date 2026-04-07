from types import SimpleNamespace

from app.core.exceptions import GetNotReady
from app.services.disbursement_service import DisbursementService


class DummyDb:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)

    def flush(self):
        return None


def build_disbursement():
    progress = SimpleNamespace(expected_count=5, paid_count=5, defaulted_count=0, late_count=0)
    kloter = SimpleNamespace(tenant_id="tenant-1")
    period = SimpleNamespace(progress=progress, kloter=kloter, status="ready_get")
    return SimpleNamespace(
        id="disb-1",
        period=period,
        period_id="period-1",
        net_amount=100000,
        status="ready",
        released_by=None,
        released_at=None,
    )


def test_release_get_success_updates_status():
    db = DummyDb()
    disbursement = build_disbursement()

    result = DisbursementService().release_get(db, disbursement, "admin-1")

    assert result.status == "released"
    assert result.released_by == "admin-1"
    assert result.period.status == "completed"
    assert len(db.items) >= 2


def test_release_get_raises_when_progress_not_ready():
    db = DummyDb()
    disbursement = build_disbursement()
    disbursement.period.progress.paid_count = 4

    try:
        DisbursementService().release_get(db, disbursement, "admin-1")
    except GetNotReady:
        assert True
    else:
        raise AssertionError("Expected GetNotReady")
