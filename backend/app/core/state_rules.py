from app.core.enums import PaymentStatus


PAYMENT_VERIFIABLE_STATES = {
    PaymentStatus.EXPECTED,
    PaymentStatus.PROOF_UPLOADED,
    PaymentStatus.AUTO_MATCHED,
    PaymentStatus.MANUAL_REVIEW,
    PaymentStatus.LATE,
}


PAYMENT_TERMINAL_STATES = {
    PaymentStatus.VERIFIED,
    PaymentStatus.DEFAULTED,
}


def can_release_get(progress) -> tuple[bool, str]:
    resolved = progress.paid_count + progress.defaulted_count
    if resolved < progress.expected_count:
        pending = progress.expected_count - resolved
        return False, f"{pending} payment masih belum resolved"
    if progress.late_count > 0:
        return False, f"{progress.late_count} payment masih LATE"
    return True, "OK"
