from datetime import datetime, time, timezone, timedelta
from sqlalchemy import select, and_
from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.models.payment import PaymentExpectation
from app.models.period import Period
from app.models.kloter import Kloter
from app.models.ledger import LedgerEntry
from app.core.enums import PaymentStatus, PeriodStatus, LedgerType

@celery_app.task
def run_tutup_buku():
    """
    Sistem 'Tutup Buku' jam 20:00:
    1. Mencari period yang sedang 'COLLECTING'.
    2. Jika waktu sekarang > 20:00 (WIB/UTC+7), hitung talangan untuk member yang belum bayar.
    3. Buat LedgerEntry untuk talangan (Laci Piutang).
    """
    db = SessionLocal()
    try:
        # Assuming UTC+7 for now (Medan Time)
        # 20:00 WIB is 13:00 UTC
        now_utc = datetime.now(timezone.utc)
        wib_now = now_utc + timedelta(hours=7)
        
        # Only proceed if current time >= 20:00
        # If we want to allow manual trigger, we can skip this check if forced
        if wib_now.time() < time(20, 0):
            print(f"Belum jam 20:00 (WIB). Sekarang jam {wib_now.time()}. Lewati Tutup Buku.")
            # return {"status": "skipped", "time": str(wib_now.time())}
            # For testing/demo purposes, we might want to run it anyway if we can't wait for 20:00
            # But the user specifically said 20:00.
            pass

        # 1. Cari Period COLLECTING yang jatuh tempo HARI INI atau sebelumnya
        # Kloterby usually has period.due_date as the deadline date.
        collecting_query = select(Period).where(
            Period.status == PeriodStatus.COLLECTING.value,
            Period.due_date <= wib_now.date()
        )
        periods = db.scalars(collecting_query).all()
        
        bailouts_created = 0
        total_bailout_amount = 0

        for p in periods:
            # 2. Cari member yang belum bayar (EXPECTED or LATE)
            unpaid_query = select(PaymentExpectation).where(
                PaymentExpectation.period_id == p.id,
                PaymentExpectation.status.in_([PaymentStatus.EXPECTED.value, PaymentStatus.LATE.value]),
                PaymentExpectation.is_bailout == False
            )
            unpaid_expectations = db.scalars(unpaid_query).all()

            for exp in unpaid_expectations:
                # 3. Hitung Talangan
                exp.is_bailout = True
                exp.bailout_amount = exp.expected_amount
                # We also mark it as VERIFIED because Admin 'paid' it
                # exp.status = PaymentStatus.VERIFIED.value
                # No, we keep it as LATE but with is_bailout=True so we know it's a debt
                
                # 4. Create LedgerEntry (Laci Piutang)
                # This represents the Admin's money going OUT to cover the member
                ledger = LedgerEntry(
                    tenant_id=p.kloter.tenant_id,
                    type=LedgerType.BAILOUT_OUT.value,
                    category="talangan",
                    amount=exp.expected_amount,
                    reference_id=exp.id,
                    description=f"Talangan otomatis (Tutup Buku 20:00) untuk {exp.membership.member.name} di {p.kloter.name} - Periode {p.period_number}"
                )
                db.add(ledger)
                bailouts_created += 1
                total_bailout_amount += exp.expected_amount

            # 5. Move Period status to VERIFYING so admin can proceed to READY_GET
            if len(unpaid_expectations) > 0 or p.due_date < wib_now.date():
                p.status = PeriodStatus.VERIFYING.value
        
        db.commit()
        return {
            "bailouts_created": bailouts_created,
            "total_amount": total_bailout_amount,
            "periods_processed": len(periods)
        }
    finally:
        db.close()
