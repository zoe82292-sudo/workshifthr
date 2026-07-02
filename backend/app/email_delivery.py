from __future__ import annotations

import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from typing import Literal
from urllib import error, request

logger = logging.getLogger(__name__)

PlanId = Literal["cycle", "annual", "monthly", ""]

PLAN_LABELS = {
    "cycle": "Cycle Pass",
    "annual": "Annual",
    "monthly": "Monthly",
}


def email_delivery_configured() -> bool:
    if os.getenv("RESEND_API_KEY", "").strip():
        return True
    return bool(
        os.getenv("SMTP_HOST", "").strip()
        and os.getenv("SMTP_FROM", "").strip()
    )


def _public_app_url() -> str:
    return os.getenv("PUBLIC_APP_URL", "https://shiftworkshr.com").rstrip("/")


def _support_email() -> str:
    return os.getenv("SUPPORT_EMAIL", "hello@shiftworkshr.com").strip()


def _credentials_email_body(
    *,
    organization: str,
    email: str,
    password: str,
    plan_id: str,
) -> tuple[str, str]:
    plan_name = PLAN_LABELS.get(plan_id, "ShiftWorksHR")
    app_url = _public_app_url()
    support = _support_email()
    subject = f"Your ShiftWorksHR {plan_name} login"
    text = f"""Welcome to ShiftWorksHR!

Your {plan_name} access is ready.

Organization: {organization}
Sign-in email: {email}
Shared password: {password}

Sign in: {app_url}/#sign-in

Your organization shares one password. Teammates with an authorized work email on the
same domain can sign in with this password.

Save this email — for security, your password is shown only once on the checkout page.

Questions? Reply to {support}
"""
    return subject, text


def send_credentials_email(
    *,
    organization: str,
    email: str,
    password: str,
    plan_id: str = "",
) -> bool:
    if not email_delivery_configured():
        logger.warning(
            "Credential email not sent to %s — configure RESEND_API_KEY or SMTP_HOST/SMTP_FROM.",
            email,
        )
        return False

    subject, text = _credentials_email_body(
        organization=organization,
        email=email,
        password=password,
        plan_id=plan_id,
    )
    from_addr = os.getenv("SMTP_FROM", _support_email()).strip()

    if os.getenv("RESEND_API_KEY", "").strip():
        return _send_via_resend(
            from_addr=from_addr,
            to_addr=email,
            subject=subject,
            text=text,
        )

    return _send_via_smtp(
        from_addr=from_addr,
        to_addr=email,
        subject=subject,
        text=text,
    )


def _send_via_smtp(*, from_addr: str, to_addr: str, subject: str, text: str) -> bool:
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() not in {"false", "0", "no"}

    message = EmailMessage()
    message["From"] = from_addr
    message["To"] = to_addr
    message["Subject"] = subject
    message.set_content(text)

    try:
        if use_tls:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
                if username:
                    smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP_SSL(host, port, timeout=30, context=ssl.create_default_context()) as smtp:
                if username:
                    smtp.login(username, password)
                smtp.send_message(message)
    except OSError as exc:
        logger.exception("SMTP credential email failed for %s: %s", to_addr, exc)
        return False

    logger.info("Sent credential email to %s via SMTP.", to_addr)
    return True


def _send_via_resend(*, from_addr: str, to_addr: str, subject: str, text: str) -> bool:
    import json

    api_key = os.getenv("RESEND_API_KEY", "").strip()
    payload = json.dumps(
        {
            "from": from_addr,
            "to": [to_addr],
            "subject": subject,
            "text": text,
        }
    ).encode("utf-8")
    req = request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            if response.status >= 400:
                logger.error("Resend API returned %s for %s", response.status, to_addr)
                return False
    except error.URLError as exc:
        logger.exception("Resend credential email failed for %s: %s", to_addr, exc)
        return False

    logger.info("Sent credential email to %s via Resend.", to_addr)
    return True
