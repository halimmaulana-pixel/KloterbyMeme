from sqlalchemy import select
from app.models.bank import BankTransaction, BankAccount
from app.repositories.base_repo import BaseRepository


class BankAccountRepository(BaseRepository):
    model = BankAccount

    def get_multi_by_tenant(self, tenant_id):
        stmt = select(BankAccount).where(BankAccount.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())


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
