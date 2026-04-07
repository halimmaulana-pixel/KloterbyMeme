from celery import Celery
from app.config import settings

celery_app = Celery(
    "kloterby",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.reminder_worker",
        "app.workers.penalty_worker",
        "app.workers.matching_worker",
        "app.workers.period_worker",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
)

# Optional: Celery Beat configuration for scheduled tasks
celery_app.conf.beat_schedule = {
    "daily-penalty-check": {
        "task": "app.workers.penalty_worker.check_and_apply_penalties",
        "schedule": 3600.0 * 24,  # Daily
    },
    "daily-reminder-check": {
        "task": "app.workers.reminder_worker.send_daily_reminders",
        "schedule": 3600.0 * 12,  # Every 12 hours
    },
    "period-state-transition-check": {
        "task": "app.workers.period_worker.check_period_transitions",
        "schedule": 3600.0,  # Hourly
    },
}
