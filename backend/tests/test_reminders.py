import pytest
from unittest.mock import MagicMock, patch
from app.services.reminder_service import ReminderService
from app.models.payment import PaymentExpectation
from app.models.member import Member
from app.models.kloter import Kloter
from app.models.period import Period
from datetime import datetime, timezone, timedelta

def test_reminder_service_sends_whatsapp():
    with patch("httpx.Client") as mock_client:
        mock_post = MagicMock()
        mock_post.json.return_value = {"status": "sent"}
        mock_client.return_value.__enter__.return_value.post.return_value = mock_post
        
        service = ReminderService()
        service.token = "fake-token"
        result = service.send_whatsapp("628123", "Test message")
        
        assert result == {"status": "sent"}
        mock_client.return_value.__enter__.return_value.post.assert_called_once()

def test_reminder_service_upcoming_reminders():
    # Mock DB and objects
    db = MagicMock()
    
    # H-1 is tomorrow
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    
    mock_member = MagicMock(spec=Member)
    mock_member.name = "Budi"
    mock_member.wa = "62811"
    
    mock_kloter = MagicMock(spec=Kloter)
    mock_kloter.name = "Kloter A"
    
    mock_period = MagicMock(spec=Period)
    mock_period.period_number = 1
    
    mock_exp = MagicMock(spec=PaymentExpectation)
    mock_exp.membership.member = mock_member
    mock_exp.membership.kloter = mock_kloter
    mock_exp.period = mock_period
    mock_exp.expected_amount = 100000
    mock_exp.unique_code = 123
    mock_exp.due_datetime = tomorrow
    
    db.scalars.return_value.all.return_value = [mock_exp]
    
    service = ReminderService()
    # Mock send_whatsapp to avoid real network call
    service.send_whatsapp = MagicMock()
    
    count = service.send_upcoming_reminders(db)
    
    assert count == 1
    service.send_whatsapp.assert_called_once()
    args, _ = service.send_whatsapp.call_args
    assert "62811" in args
    assert "Budi" in args[1]
    assert "100,000" in args[1]
