from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


# Support for SQLite or PostgreSQL
is_sqlite = settings.sqlalchemy_database_url.startswith("sqlite")

connect_args = {}
if is_sqlite:
    # Required for SQLite to allow multiple threads
    connect_args = {"check_same_thread": False}
elif settings.sqlalchemy_database_url.startswith("postgresql"):
    # SSL for external Postgres if needed
    connect_args = {"sslmode": "require"}

engine = create_engine(
    settings.sqlalchemy_database_url, 
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
