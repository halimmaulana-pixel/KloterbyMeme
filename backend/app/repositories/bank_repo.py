from sqlalchemy import select

from app.models.bank import BankTransaction

from app.repositories.base_repo import BaseRepository


class BankRepository(BaseRepository):
    model = BankTransaction

    def list_unmatched(self, limit: int = 100):
        stmt = (
            select(BankTransaction)
            .where(BankTransaction.match_status == "unmatched")
            .order_by(BankTransaction.transaction_time.asc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
