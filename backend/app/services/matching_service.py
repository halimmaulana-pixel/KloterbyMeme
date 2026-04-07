from sqlalchemy import select
from app.models.payment import PaymentExpectation, PaymentAttempt
from app.models.bank import BankTransaction
from app.core.enums import PaymentStatus
from datetime import datetime, timezone

class MatchingService:
    def match_transaction(self, db, transaction: BankTransaction):
        # We look for expectations where expected_amount + unique_code == transaction.amount
        # And status is EXPECTED or LATE
        
        query = select(PaymentExpectation).where(
            PaymentExpectation.status.in_([PaymentStatus.EXPECTED.value, PaymentStatus.LATE.value])
        )
        expectations = db.scalars(query).all()
        
        for exp in expectations:
            total_expected = exp.expected_amount + exp.unique_code
            if total_expected == transaction.amount:
                # Match found!
                transaction.match_status = "matched"
                
                # Update expectation status
                exp.status = PaymentStatus.AUTO_MATCHED.value
                
                # Create a payment attempt
                attempt = PaymentAttempt(
                    expectation_id=exp.id,
                    bank_tx_id=transaction.id,
                    paid_amount=transaction.amount,
                    status=PaymentStatus.AUTO_MATCHED.value,
                    match_score=1.0,
                    notes=f"Auto-matched with bank reference {transaction.bank_reference}"
                )
                db.add(attempt)
                
                # Update period progress
                progress = exp.period.progress
                progress.paid_count += 1
                if exp.status == PaymentStatus.LATE.value and progress.late_count > 0:
                    progress.late_count -= 1
                
                progress.progress_pct = (progress.paid_count + progress.defaulted_count) / max(progress.expected_count, 1)
                
                return exp
        
        transaction.match_status = "no_match"
        return None
