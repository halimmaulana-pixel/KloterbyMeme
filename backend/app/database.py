from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


# Support for SSL if needed (common for Supabase/Neon)
connect_args = {}
if settings.sqlalchemy_database_url.startswith("postgresql"):
    connect_args = {"sslmode": "require"}

engine = create_engine(
    settings.sqlalchemy_database_url, 
    future=True,
    pool_pre_ping=True, # Checks connection health before using it
    connect_args=connect_args
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
