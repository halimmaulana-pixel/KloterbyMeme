from types import SimpleNamespace

from app.core.state_rules import PAYMENT_TERMINAL_STATES, PAYMENT_VERIFIABLE_STATES, can_release_get


def test_verifiable_states_include_expected_and_late():
    assert "expected" in {state.value for state in PAYMENT_VERIFIABLE_STATES}
    assert "late" in {state.value for state in PAYMENT_VERIFIABLE_STATES}


def test_terminal_states_include_verified_and_defaulted():
    assert "verified" in {state.value for state in PAYMENT_TERMINAL_STATES}
    assert "defaulted" in {state.value for state in PAYMENT_TERMINAL_STATES}


def test_can_release_get_returns_false_when_pending_exists():
    progress = SimpleNamespace(expected_count=10, paid_count=8, defaulted_count=0, late_count=0)
    ok, reason = can_release_get(progress)
    assert ok is False
    assert "belum resolved" in reason


def test_can_release_get_returns_false_when_late_exists():
    progress = SimpleNamespace(expected_count=10, paid_count=9, defaulted_count=1, late_count=1)
    ok, reason = can_release_get(progress)
    assert ok is False
    assert "LATE" in reason


def test_can_release_get_returns_true_when_all_resolved():
    progress = SimpleNamespace(expected_count=10, paid_count=9, defaulted_count=1, late_count=0)
    ok, reason = can_release_get(progress)
    assert ok is True
    assert reason == "OK"
