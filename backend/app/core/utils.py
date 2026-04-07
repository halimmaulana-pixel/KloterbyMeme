from calendar import monthrange
from datetime import date, datetime, time, timedelta

from app.core.enums import KloterType


def calculate_due_date(start_date: date, kloter_type: KloterType, index: int) -> date:
    if kloter_type == KloterType.HARIAN:
        return start_date + timedelta(days=index)
    if kloter_type == KloterType.MINGGUAN:
        return start_date + timedelta(weeks=index)

    month = start_date.month - 1 + index
    year = start_date.year + month // 12
    month = month % 12 + 1
    day = min(start_date.day, monthrange(year, month)[1])
    return date(year, month, day)


def combine_due_datetime(due_date: date, deadline_hour: int) -> datetime:
    return datetime.combine(due_date, time(hour=deadline_hour))


def generate_unique_code(seed: int, period_number: int) -> int:
    return ((seed % 1000) + period_number) % 1000
