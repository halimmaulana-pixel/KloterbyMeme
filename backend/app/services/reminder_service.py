import httpx
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.config import settings
from app.models.payment import PaymentExpectation
from app.models.member import Member
from app.core.enums import PaymentStatus

class ReminderService:
    def __init__(self):
        self.base_url = settings.wa_base_url
        self.token = settings.wa_token

    def send_whatsapp(self, phone: str, message: str):
        if not self.token:
            print(f"WA TOKEN NOT SET: Simulating sending to {phone}: {message}")
            return {"status": "simulated", "phone": phone}

        url = f"{self.base_url}/send"
        data = {
            "target": phone,
            "message": message,
        }
        headers = {
            "Authorization": self.token
        }
        
        with httpx.Client() as client:
            response = client.post(url, data=data, headers=headers)
            return response.json()

    def send_upcoming_reminders(self, db):
        # H-1 reminders
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        start_of_tomorrow = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_tomorrow = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        query = select(PaymentExpectation).where(
            PaymentExpectation.status == PaymentStatus.EXPECTED.value,
            PaymentExpectation.due_datetime >= start_of_tomorrow,
            PaymentExpectation.due_datetime <= end_of_tomorrow
        )
        expectations = db.scalars(query).all()
        
        sent_count = 0
        for exp in expectations:
            member = exp.membership.member
            kloter = exp.membership.kloter
            message = (
                f"Halo {member.name},\n"
                f"Pengingat pembayaran kloter {kloter.name} periode {exp.period.period_number} "
                f"sebesar Rp {exp.expected_amount:,} jatuh tempo besok "
                f"{exp.due_datetime.strftime('%d-%m-%Y %H:%M')}.\n"
                f"Gunakan kode unik: {exp.unique_code}.\n"
                "Terima kasih!"
            )
            self.send_whatsapp(member.wa, message)
            sent_count += 1
        return sent_count

    def send_overdue_reminders(self, db):
        # LATE reminders
        query = select(PaymentExpectation).where(
            PaymentExpectation.status == PaymentStatus.LATE.value
        )
        expectations = db.scalars(query).all()
        
        sent_count = 0
        for exp in expectations:
            member = exp.membership.member
            kloter = exp.membership.kloter
            message = (
                f"Halo {member.name},\n"
                f"PENTING: Pembayaran kloter {kloter.name} periode {exp.period.period_number} "
                f"SUDAH JATUH TEMPO.\n"
                f"Segera lakukan pembayaran untuk menghindari denda harian Rp {kloter.penalty_per_day:,}.\n"
                "Terima kasih!"
            )
            self.send_whatsapp(member.wa, message)
            sent_count += 1
        return sent_count
