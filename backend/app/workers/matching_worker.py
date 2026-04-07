from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.models.bank import BankTransaction
from app.services.matching_service import MatchingService

@celery_app.task
def process_unmatched_transactions():
    """
    Find unmatched bank transactions and try to match them with expectations.
    """
    db = SessionLocal()
    try:
        service = MatchingService()
        query = select(BankTransaction).where(
            BankTransaction.match_status == "unmatched"
        )
        transactions = db.scalars(query).all()
        
        matched_count = 0
        for tx in transactions:
            match = service.match_transaction(db, tx)
            if match:
                matched_count += 1
        
        db.commit()
        return {"processed": len(transactions), "matched": matched_count}
    finally:
        db.close()
