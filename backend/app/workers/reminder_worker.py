from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.services.reminder_service import ReminderService

@celery_app.task
def send_daily_reminders():
    """
    1. Send H-1 reminders for upcoming payments.
    2. Send reminders for LATE payments.
    """
    db = SessionLocal()
    try:
        service = ReminderService()
        upcoming = service.send_upcoming_reminders(db)
        overdue = service.send_overdue_reminders(db)
        
        return {
            "upcoming_reminders": upcoming,
            "overdue_reminders": overdue
        }
    finally:
        db.close()
