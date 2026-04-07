from datetime import date
from types import SimpleNamespace

from app.services.period_service import PeriodService


class DummyDb:
    def __init__(self):
        self.items = []
        self.counter = 0

    def add(self, item):
        self.counter += 1
        if getattr(item, "id", None) is None:
            setattr(item, "id", f"obj-{self.counter}")
        self.items.append(item)

    def flush(self):
        return None


def test_generate_periods_creates_expected_number():
    db = DummyDb()
    memberships = [
        SimpleNamespace(id="m1", get_order=1, slot_number=1),
        SimpleNamespace(id="m2", get_order=2, slot_number=2),
    ]
    kloter = SimpleNamespace(
        id="k1",
        tenant_id="tenant-1",
        slot_total=2,
        contribution=100000,
        type="bulanan",
        start_date=date(2026, 4, 1),
        payment_deadline_hour=20,
        memberships=memberships,
    )

    periods = PeriodService().generate_periods(db, kloter)

    assert len(periods) == 2
    assert periods[0].period_number == 1
    assert periods[1].period_number == 2
