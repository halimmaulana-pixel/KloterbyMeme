"""
Seed 10 kloter scenarios across various states.
Run: python seed_data.py
Login admin : admin@meme.com / admin123
Login member: WA 628123456780 (otp: 123456 atau apapun)
"""
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.tenant import Tenant
from app.models.admin import AdminUser
from app.models.bank import BankAccount
from app.models.member import Member
from app.models.membership import Membership
from app.models.kloter import Kloter
from app.models.period import Period, PeriodProgress
from app.models.payment import PaymentExpectation
from app.core.security import hash_password
from app.core.utils import calculate_due_date, combine_due_datetime, generate_unique_code
from app.core.enums import KloterType


TODAY = date.today()
NOW = datetime.now(timezone.utc)


def d(days_offset: int) -> date:
    return TODAY + timedelta(days=days_offset)


def dt(days_offset: int, hour: int = 20) -> datetime:
    return datetime.combine(d(days_offset), datetime.min.time()).replace(
        hour=hour, tzinfo=timezone.utc
    )


def make_kloter(db, tenant_id, *, name, ktype, slots, contribution, start, status="active",
                fee_admin=0, penalty=25000, deadline_hour=20):
    k = Kloter(
        tenant_id=tenant_id, name=name, type=ktype, slot_total=slots,
        contribution=contribution, fee_admin=fee_admin, penalty_per_day=penalty,
        payment_deadline_hour=deadline_hour, start_date=start, status=status,
    )
    db.add(k)
    db.flush()
    return k


def make_membership(db, member, kloter, slot, order=None):
    ms = Membership(
        member_id=member.id, kloter_id=kloter.id,
        slot_number=slot, get_order=order or slot,
    )
    db.add(ms)
    db.flush()
    return ms


def make_period(db, kloter, period_num, due, status="upcoming", get_ms_id=None):
    p = Period(
        kloter_id=kloter.id, period_number=period_num, due_date=due,
        get_membership_id=get_ms_id,
        get_amount=kloter.contribution * kloter.slot_total,
        status=status,
    )
    db.add(p)
    db.flush()
    pp = PeriodProgress(period_id=p.id, expected_count=kloter.slot_total)
    db.add(pp)
    db.flush()
    return p


def make_expectation(db, membership, period, amount, status="expected", offset_days=3):
    code = generate_unique_code(membership.slot_number, period.period_number)
    exp = PaymentExpectation(
        membership_id=membership.id, period_id=period.id,
        expected_amount=amount, unique_code=code,
        due_datetime=dt(offset_days),
        status=status,
    )
    db.add(exp)
    db.flush()
    return exp


def update_progress(db, period, paid, late=0, defaulted=0):
    pp = period.progress
    pp.paid_count = paid
    pp.late_count = late
    pp.defaulted_count = defaulted
    pp.progress_pct = paid / max(period.kloter.slot_total, 1)
    db.flush()


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # ── TENANT ──
        tenant = Tenant(id=uuid.uuid4(), name="Kloterby Meme Demo", plan="premium")
        db.add(tenant)
        db.flush()
        tid = tenant.id

        # ── ADMIN ──
        admin = AdminUser(
            tenant_id=tid, name="Admin Meme", email="admin@meme.com",
            password_hash=hash_password("admin123"), role="owner",
        )
        db.add(admin)

        # ── BANK ──
        bank = BankAccount(
            tenant_id=tid, bank_name="BCA",
            account_number="0254100500001", account_holder_name="Admin Kloterby",
        )
        db.add(bank)

        # ── MEMBERS (10 members, member[0] joins many kloter) ──
        names = ["Intan Permata", "Budi Santoso", "Rina Cahyani", "Dian Pratama",
                 "Nadia Salsabila", "Eko Wahyu", "Fatimah Azzahra", "Galih Ardiansyah",
                 "Hana Puspita", "Irfan Maulana"]
        members = []
        for i, name in enumerate(names):
            m = Member(tenant_id=tid, name=name, wa=f"6281234567{80 + i}", status="active")
            db.add(m)
            members.append(m)
        db.flush()
        M = members  # shorthand

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 1: Bulanan · 5 slot · Periode 3 COLLECTING (3/5 bayar)
        # ──────────────────────────────────────────────────────────────────
        k1 = make_kloter(db, tid, name="Kloter Melati Bulanan", ktype="bulanan",
                         slots=5, contribution=1_000_000, start=d(-60))
        ms1 = [make_membership(db, M[i], k1, i+1) for i in range(5)]
        # Periode 1 completed
        p1_1 = make_period(db, k1, 1, d(-30), "completed", ms1[0].id)
        for ms in ms1: make_expectation(db, ms, p1_1, 1_000_000, "verified", -32)
        update_progress(db, p1_1, 5)
        # Periode 2 completed
        p1_2 = make_period(db, k1, 2, d(0), "completed", ms1[1].id)
        for ms in ms1: make_expectation(db, ms, p1_2, 1_000_000, "verified", -2)
        update_progress(db, p1_2, 5)
        # Periode 3 COLLECTING
        p1_3 = make_period(db, k1, 3, d(28), "collecting", ms1[2].id)
        make_expectation(db, ms1[0], p1_3, 1_000_000, "verified",  26)
        make_expectation(db, ms1[1], p1_3, 1_000_000, "proof_uploaded", 26)
        make_expectation(db, ms1[2], p1_3, 1_000_000, "verified",  26)  # M[2] = Rina (GET giliran)
        make_expectation(db, ms1[3], p1_3, 1_000_000, "expected",  26)
        make_expectation(db, ms1[4], p1_3, 1_000_000, "late",      -1)
        update_progress(db, p1_3, 3, late=1)
        # Remaining periods
        for i in range(4, 6):
            make_period(db, k1, i, d(28 * (i-2)), "upcoming", ms1[i-1].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 2: Mingguan · 6 slot · Periode 2 VERIFYING (semua bayar)
        # ──────────────────────────────────────────────────────────────────
        k2 = make_kloter(db, tid, name="Kloter Mingguan Berkah", ktype="mingguan",
                         slots=6, contribution=500_000, start=d(-14))
        ms2 = [make_membership(db, M[i], k2, i+1) for i in range(6)]
        p2_1 = make_period(db, k2, 1, d(-7), "completed", ms2[0].id)
        for ms in ms2: make_expectation(db, ms, p2_1, 500_000, "verified", -9)
        update_progress(db, p2_1, 6)
        p2_2 = make_period(db, k2, 2, d(0), "verifying", ms2[1].id)
        for ms in ms2: make_expectation(db, ms, p2_2, 500_000, "proof_uploaded", 1)
        update_progress(db, p2_2, 6)
        for i in range(3, 7):
            make_period(db, k2, i, d(7 * (i-2)), "upcoming", ms2[i-1].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 3: Harian · 4 slot · Periode 2 COLLECTING baru mulai
        # ──────────────────────────────────────────────────────────────────
        k3 = make_kloter(db, tid, name="Kloter Harian Express", ktype="harian",
                         slots=4, contribution=300_000, start=d(-4))
        ms3 = [make_membership(db, M[i], k3, i+1) for i in range(4)]
        p3_1 = make_period(db, k3, 1, d(-3), "completed", ms3[0].id)
        for ms in ms3: make_expectation(db, ms, p3_1, 300_000, "verified", -4)
        update_progress(db, p3_1, 4)
        p3_2 = make_period(db, k3, 2, d(0), "collecting", ms3[1].id)
        make_expectation(db, ms3[0], p3_2, 300_000, "verified",  1)
        make_expectation(db, ms3[1], p3_2, 300_000, "expected",  1)
        make_expectation(db, ms3[2], p3_2, 300_000, "expected",  1)
        make_expectation(db, ms3[3], p3_2, 300_000, "expected",  1)
        update_progress(db, p3_2, 1)
        make_period(db, k3, 3, d(1), "upcoming", ms3[2].id)
        make_period(db, k3, 4, d(2), "upcoming", ms3[3].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 4: Bulanan · 8 slot · Periode 1 READY_GET (semua lunas)
        # ──────────────────────────────────────────────────────────────────
        k4 = make_kloter(db, tid, name="Kloter Ceria 8 Slot", ktype="bulanan",
                         slots=8, contribution=750_000, start=d(-30), fee_admin=100_000)
        ms4 = [make_membership(db, M[i % 10], k4, i+1) for i in range(8)]
        p4_1 = make_period(db, k4, 1, d(0), "ready_get", ms4[0].id)
        for ms in ms4: make_expectation(db, ms, p4_1, 750_000, "verified", 1)
        update_progress(db, p4_1, 8)
        for i in range(2, 9):
            make_period(db, k4, i, d(30 * (i-1)), "upcoming", ms4[i-1].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 5: Mingguan · 5 slot · Periode 4 COLLECTING ada yg telat
        # ──────────────────────────────────────────────────────────────────
        k5 = make_kloter(db, tid, name="Kloter Mingguan Hemat", ktype="mingguan",
                         slots=5, contribution=200_000, start=d(-28))
        ms5 = [make_membership(db, M[i], k5, i+1) for i in range(5)]
        for pn in range(1, 4):
            pp = make_period(db, k5, pn, d(-28 + 7*pn), "completed", ms5[pn-1].id)
            for ms in ms5: make_expectation(db, ms, pp, 200_000, "verified", -28 + 7*pn - 2)
            update_progress(db, pp, 5)
        p5_4 = make_period(db, k5, 4, d(1), "collecting", ms5[3].id)
        make_expectation(db, ms5[0], p5_4, 200_000, "verified",  2)
        make_expectation(db, ms5[1], p5_4, 200_000, "late",      -1)
        make_expectation(db, ms5[2], p5_4, 225_000, "late",      -1)  # denda
        make_expectation(db, ms5[3], p5_4, 200_000, "expected",  2)
        make_expectation(db, ms5[4], p5_4, 200_000, "expected",  2)
        update_progress(db, p5_4, 1, late=2)
        make_period(db, k5, 5, d(8), "upcoming", ms5[4].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 6: Bulanan · 4 slot · SELESAI SEMUA PERIODE (completed)
        # ──────────────────────────────────────────────────────────────────
        k6 = make_kloter(db, tid, name="Kloter Lama Selesai", ktype="bulanan",
                         slots=4, contribution=500_000, start=d(-120), status="completed")
        ms6 = [make_membership(db, M[i], k6, i+1) for i in range(4)]
        for pn in range(1, 5):
            pp = make_period(db, k6, pn, d(-120 + 30*pn), "completed", ms6[pn-1].id)
            for ms in ms6: make_expectation(db, ms, pp, 500_000, "verified", -120 + 30*pn - 2)
            update_progress(db, pp, 4)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 7: Harian · 3 slot · Periode 1 BARU MULAI (0 yg bayar)
        # ──────────────────────────────────────────────────────────────────
        k7 = make_kloter(db, tid, name="Kloter Harian Perdana", ktype="harian",
                         slots=3, contribution=100_000, start=TODAY)
        ms7 = [make_membership(db, M[i], k7, i+1) for i in range(3)]
        p7_1 = make_period(db, k7, 1, d(1), "collecting", ms7[0].id)
        for ms in ms7: make_expectation(db, ms, p7_1, 100_000, "expected", 1)
        update_progress(db, p7_1, 0)
        make_period(db, k7, 2, d(2), "upcoming", ms7[1].id)
        make_period(db, k7, 3, d(3), "upcoming", ms7[2].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 8: Mingguan · 7 slot · Periode 3 COLLECTING banyak yg belum
        # ──────────────────────────────────────────────────────────────────
        k8 = make_kloter(db, tid, name="Kloter Mingguan Ramai", ktype="mingguan",
                         slots=7, contribution=300_000, start=d(-21))
        ms8 = [make_membership(db, M[i % 10], k8, i+1) for i in range(7)]
        for pn in range(1, 3):
            pp = make_period(db, k8, pn, d(-21 + 7*pn), "completed", ms8[pn-1].id)
            for ms in ms8: make_expectation(db, ms, pp, 300_000, "verified", -21 + 7*pn - 2)
            update_progress(db, pp, 7)
        p8_3 = make_period(db, k8, 3, d(2), "collecting", ms8[2].id)
        make_expectation(db, ms8[0], p8_3, 300_000, "verified",   3)
        make_expectation(db, ms8[1], p8_3, 300_000, "proof_uploaded", 3)
        make_expectation(db, ms8[2], p8_3, 300_000, "expected",   3)
        make_expectation(db, ms8[3], p8_3, 300_000, "expected",   3)
        make_expectation(db, ms8[4], p8_3, 300_000, "expected",   3)
        make_expectation(db, ms8[5], p8_3, 300_000, "expected",   3)
        make_expectation(db, ms8[6], p8_3, 300_000, "expected",   3)
        update_progress(db, p8_3, 2)
        for i in range(4, 8):
            make_period(db, k8, i, d(7 * (i-2)), "upcoming", ms8[i-1].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 9: Bulanan · 6 slot · Periode 2 COLLECTING bukti menunggu
        # ──────────────────────────────────────────────────────────────────
        k9 = make_kloter(db, tid, name="Kloter Bulanan Solid", ktype="bulanan",
                         slots=6, contribution=800_000, start=d(-30), fee_admin=50_000)
        ms9 = [make_membership(db, M[i], k9, i+1) for i in range(6)]
        p9_1 = make_period(db, k9, 1, d(-2), "completed", ms9[0].id)
        for ms in ms9: make_expectation(db, ms, p9_1, 800_000, "verified", -4)
        update_progress(db, p9_1, 6)
        p9_2 = make_period(db, k9, 2, d(28), "collecting", ms9[1].id)
        make_expectation(db, ms9[0], p9_2, 800_000, "proof_uploaded", 26)
        make_expectation(db, ms9[1], p9_2, 800_000, "verified",        26)
        make_expectation(db, ms9[2], p9_2, 800_000, "proof_uploaded",  26)
        make_expectation(db, ms9[3], p9_2, 800_000, "expected",        26)
        make_expectation(db, ms9[4], p9_2, 800_000, "expected",        26)
        make_expectation(db, ms9[5], p9_2, 800_000, "expected",        26)
        update_progress(db, p9_2, 3)
        for i in range(3, 7):
            make_period(db, k9, i, d(30 * (i-1)), "upcoming", ms9[i-1].id)

        # ──────────────────────────────────────────────────────────────────
        # KLOTER 10: Mingguan · 4 slot · Periode 1 BARU (M[0]=Intan di sini)
        # ──────────────────────────────────────────────────────────────────
        k10 = make_kloter(db, tid, name="Kloter Mingguan Baru", ktype="mingguan",
                          slots=4, contribution=250_000, start=d(-3))
        # M[0] Intan juga ada di sini (slot 1) agar dashboard-nya menarik
        ms10_0 = make_membership(db, M[0], k10, 1)
        ms10_1 = make_membership(db, M[3], k10, 2)
        ms10_2 = make_membership(db, M[5], k10, 3)
        ms10_3 = make_membership(db, M[7], k10, 4)
        ms10 = [ms10_0, ms10_1, ms10_2, ms10_3]
        p10_1 = make_period(db, k10, 1, d(4), "collecting", ms10_0.id)
        make_expectation(db, ms10_0, p10_1, 250_000, "expected",        5)
        make_expectation(db, ms10_1, p10_1, 250_000, "proof_uploaded",  5)
        make_expectation(db, ms10_2, p10_1, 250_000, "expected",        5)
        make_expectation(db, ms10_3, p10_1, 250_000, "expected",        5)
        update_progress(db, p10_1, 1)
        for i in range(2, 5):
            make_period(db, k10, i, d(4 + 7*(i-1)), "upcoming", ms10[i-1].id)

        db.commit()

        print("=" * 60)
        print("SEED BERHASIL — 10 Kloter, 10 Member")
        print("=" * 60)
        print(f"\n🔐 LOGIN ADMIN")
        print(f"   Email   : admin@meme.com")
        print(f"   Password: admin123")
        print(f"\n👤 LOGIN MEMBER (OTP otomatis diterima, kode apapun)")
        print(f"   Intan Permata  : 628123456780 (ada di Kloter 1 + 10)")
        print(f"   Budi Santoso   : 628123456781 (ada di Kloter 1 + 5)")
        print(f"   Rina Cahyani   : 628123456782 (ada di Kloter 1, GET giliran Periode 3)")
        print(f"\n📦 10 KLOTER:")
        for k, lbl in [
            (k1,  "Bulanan  5 slot  · Periode 3 COLLECTING (3/5 bayar, 1 telat)"),
            (k2,  "Mingguan 6 slot  · Periode 2 VERIFYING (semua bayar)"),
            (k3,  "Harian   4 slot  · Periode 2 COLLECTING (1/4 bayar)"),
            (k4,  "Bulanan  8 slot  · Periode 1 READY_GET (semua lunas)"),
            (k5,  "Mingguan 5 slot  · Periode 4 COLLECTING (2 telat)"),
            (k6,  "Bulanan  4 slot  · SELESAI (semua periode completed)"),
            (k7,  "Harian   3 slot  · Periode 1 COLLECTING (0 bayar, baru mulai)"),
            (k8,  "Mingguan 7 slot  · Periode 3 COLLECTING (2/7 bayar)"),
            (k9,  "Bulanan  6 slot  · Periode 2 COLLECTING (3 bukti dikirim)"),
            (k10, "Mingguan 4 slot  · Periode 1 COLLECTING (1 bukti, Intan belum bayar)"),
        ]:
            print(f"   {k.id}  {k.name:<25} {lbl}")
        print()

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
