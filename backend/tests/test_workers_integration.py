import pytest
import uuid
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select
from app.database import SessionLocal, engine, Base
from app.models.tenant import Tenant
from app.models.kloter import Kloter
from app.models.member import Member
from app.models.membership import Membership
from app.models.period import Period, PeriodProgress
from app.models.payment import PaymentExpectation, PaymentAttempt
from app.models.bank import BankTransaction, BankAccount
from app.core.enums import PeriodStatus, PaymentStatus
from app.workers.penalty_worker import check_and_apply_penalties
from app.workers.period_worker import check_period_transitions
from app.workers.matching_worker import process_unmatched_transactions

@pytest.fixture(scope="function")
def db():
    # Always start from a clean slate to prevent stale data from prior runs
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    yield session

    # Teardown: Clean up
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_penalty_worker_marks_late_and_applies_penalty(db):
    # 1. Setup Tenant, Kloter, Member
    tenant = Tenant(name="Test Tenant")
    db.add(tenant)
    db.flush()
    
    kloter = Kloter(
        tenant_id=tenant.id,
        name="Test Kloter",
        type="harian",
        slot_total=1,
        contribution=100000,
        penalty_per_day=5000,
        start_date=date.today() - timedelta(days=5),
        status="active"
    )
    db.add(kloter)
    db.flush()
    
    member = Member(tenant_id=tenant.id, name="Member 1", wa="628123")
    db.add(member)
    db.flush()
    
    ms = Membership(member_id=member.id, kloter_id=kloter.id, slot_number=1, get_order=1)
    db.add(ms)
    db.flush()
    
    period = Period(
        kloter_id=kloter.id,
        period_number=1,
        due_date=date.today() - timedelta(days=1),
        get_amount=100000,
        status=PeriodStatus.COLLECTING.value
    )
    db.add(period)
    db.flush()
    
    db.add(PeriodProgress(period_id=period.id, expected_count=1))
    
    # Overdue expectation
    exp = PaymentExpectation(
        membership_id=ms.id,
        period_id=period.id,
        expected_amount=100000,
        unique_code=123,
        due_datetime=datetime.now(timezone.utc) - timedelta(hours=2),
        status=PaymentStatus.EXPECTED.value
    )
    db.add(exp)
    db.commit()
    
    # 2. Run Worker
    result = check_and_apply_penalties()
    db.expire_all()
    
    # 3. Assertions
    assert result["marked_late"] == 1
    assert result["penalties_applied"] == 1
    
    db.refresh(exp)
    assert exp.status == PaymentStatus.LATE.value
    
    # Check penalty attempt
    attempt_query = select(PaymentAttempt).where(PaymentAttempt.expectation_id == exp.id)
    attempt = db.scalar(attempt_query)
    assert attempt is not None
    assert attempt.penalty_amount == 5000

def test_matching_worker_matches_correct_amount(db):
    # 1. Setup
    tenant = Tenant(name="Test Tenant")
    db.add(tenant)
    db.flush()
    
    bank_acc = BankAccount(tenant_id=tenant.id, bank_name="BCA", account_number="123", account_holder_name="Test")
    db.add(bank_acc)
    db.flush()
    
    kloter = Kloter(tenant_id=tenant.id, name="K", type="h", slot_total=1, contribution=100000, start_date=date.today())
    db.add(kloter)
    db.flush()
    
    member = Member(tenant_id=tenant.id, name="M", wa="628")
    db.add(member)
    db.flush()
    
    ms = Membership(member_id=member.id, kloter_id=kloter.id, slot_number=1, get_order=1)
    db.add(ms)
    db.flush()
    
    period = Period(kloter_id=kloter.id, period_number=1, due_date=date.today(), get_amount=100000, status=PeriodStatus.COLLECTING.value)
    db.add(period)
    db.flush()
    db.add(PeriodProgress(period_id=period.id, expected_count=1))
    
    exp = PaymentExpectation(
        membership_id=ms.id,
        period_id=period.id,
        expected_amount=100000,
        unique_code=456,
        due_datetime=datetime.now(timezone.utc) + timedelta(hours=5),
        status=PaymentStatus.EXPECTED.value
    )
    db.add(exp)
    
    # Transaction with correct amount (100000 + 456)
    tx = BankTransaction(
        bank_account_id=bank_acc.id,
        bank_reference="REF-1",
        amount=100456,
        transaction_time=datetime.now(timezone.utc),
        match_status="unmatched"
    )
    db.add(tx)
    db.commit()
    
    # 2. Run Worker
    result = process_unmatched_transactions()
    db.expire_all()
    
    # 3. Assertions
    assert result["matched"] == 1
    db.refresh(tx)
    db.refresh(exp)
    assert tx.match_status == "matched"
    assert exp.status == PaymentStatus.AUTO_MATCHED.value
    assert exp.period.progress.paid_count == 1

def test_period_worker_transitions_p1_to_collecting(db):
    # 1. Setup Kloter with P1 UPCOMING and start_date today
    tenant = Tenant(name="T")
    db.add(tenant)
    db.flush()
    
    kloter = Kloter(
        tenant_id=tenant.id,
        name="K",
        type="h",
        slot_total=1,
        contribution=10000,
        start_date=date.today(), # starts today
        status="active"
    )
    db.add(kloter)
    db.flush()
    
    p1 = Period(
        kloter_id=kloter.id,
        period_number=1,
        due_date=date.today(),
        get_amount=10000,
        status=PeriodStatus.UPCOMING.value
    )
    db.add(p1)
    db.commit()
    
    # 2. Run Worker
    check_period_transitions()
    db.expire_all()
    
    # 3. Assert
    db.refresh(p1)
    assert p1.status == PeriodStatus.COLLECTING.value
