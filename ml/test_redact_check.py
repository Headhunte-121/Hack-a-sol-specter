from __future__ import annotations

import pytest
from redact_check import check_text


def test_pan_detected():
    findings = check_text("Your PAN ABCDE1234F is linked.")
    assert any(rule == "PAN pattern" for rule, _ in findings)


def test_email_detected():
    findings = check_text("Contact us at support@fakebank.com for help.")
    assert any(rule == "Email address" for rule, _ in findings)


def test_card_detected():
    findings = check_text("Card number 4111222233334444 debited.")
    assert any(rule == "16-digit card number" for rule, _ in findings)


def test_aadhaar_vs_reference_number():
    # Standalone 12 digits should be caught as Aadhaar-like
    findings1 = check_text("Your Aadhaar is 123456789012.")
    assert any(rule == "12-digit Aadhaar-like number" for rule, _ in findings1)

    # Reference number with 12 digits should be allowed
    findings2 = check_text("Ref No 123456789012 debited Rs 100.")
    assert not any(rule == "12-digit Aadhaar-like number" for rule, _ in findings2)


def test_synthetic_vs_real_phone():
    # Synthetic allowed prefix
    findings_synth = check_text("Call 9876543210 or 99999 12345 for info.")
    assert len(findings_synth) == 0

    # Non-synthetic prefix
    findings_real = check_text("Call 7234567890 immediately.")
    assert any("Non-synthetic mobile number" in rule for rule, _ in findings_real)


def test_upi_handle():
    # Allowed synthetic user
    findings_allowed = check_text("Send money to user@okhdfcbank or payee@paytm.")
    assert len(findings_allowed) == 0

    # Real personal user handle
    findings_real = check_text("Send money to nikhilsharma99@oksbi now.")
    assert any("Non-whitelisted UPI handle" in rule for rule, _ in findings_real)
