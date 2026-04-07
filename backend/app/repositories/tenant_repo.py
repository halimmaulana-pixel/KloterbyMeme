from sqlalchemy import select
from app.models.tenant import Tenant
from app.repositories.base_repo import BaseRepository

class TenantRepository(BaseRepository):
    model = Tenant

    def get_first(self):
        stmt = select(Tenant).limit(1)
        return self.db.execute(stmt).scalar_one_or_none()
