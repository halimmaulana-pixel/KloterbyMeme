from sqlalchemy import select


class BaseRepository:
    model = None

    def __init__(self, db):
        self.db = db

    def get(self, object_id):
        stmt = select(self.model).where(self.model.id == object_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list(self, limit: int = 100, offset: int = 0):
        stmt = select(self.model).offset(offset).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def save(self, obj):
        self.db.add(obj)
        self.db.flush()
        return obj
