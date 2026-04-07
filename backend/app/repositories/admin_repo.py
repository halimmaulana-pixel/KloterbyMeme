from sqlalchemy import select
from app.models.admin import AdminUser
from app.repositories.base_repo import BaseRepository

class AdminRepository(BaseRepository):
    model = AdminUser

    def get_by_email(self, email: str):
        stmt = select(AdminUser).where(AdminUser.email == email)
        return self.db.execute(stmt).scalar_one_or_none()
