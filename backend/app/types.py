import uuid

from sqlalchemy import String
from sqlalchemy.types import TypeDecorator


class UUIDType(TypeDecorator):
    """UUID stored as 32-char hex string (compatible with SQLite and PostgreSQL)."""

    impl = String(32)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value.hex
        try:
            return uuid.UUID(str(value)).hex
        except (ValueError, AttributeError):
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        try:
            return uuid.UUID(str(value))
        except (ValueError, AttributeError):
            return value
