from __future__ import annotations

import html
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


def _sign_in_url() -> str:
    return f"{_public_app_url()}/#sign-in"


def _recover_access_url() -> str:
    return f"{_public_app_url()}/recover-access"


def _credentials_email_body(
    *,
    organization: str,
    email: str,
    password: str,
    plan_id: str,
    recovery: bool = False,
) -> tuple[str, str, str]:
    plan_name = PLAN_LABELS.get(plan_id, "ShiftWorksHR")
    sign_in_url = _sign_in_url()
    recover_url = _recover_access_url()
    support = _support_email()

    if recovery:
        subject = f"Your ShiftWorksHR access details"
        intro = "We received a request to recover access to ShiftWorksHR."
        save_note = "Your organization password was reset. Save this email and share the new password with authorized teammates."
    else:
        subject = f"Your ShiftWorksHR {plan_name} login"
        intro = f"Welcome to ShiftWorksHR! Your {plan_name} access is ready."
        save_note = (
            "Save this email — for security, your password is shown only once on the checkout page."
        )

    text = f"""{intro}

Organization: {organization}
Sign-in email: {email}
Shared password: {password}

Sign in: {sign_in_url}

Forgot your password later? Recover access: {recover_url}

Your organization shares one password. Teammates with an authorized work email on the
same domain can sign in with this password. After sign-in, add teammates from Team access
in the analyzer.

{save_note}

Questions? Reply to {support}
"""

    safe_org = html.escape(organization)
    safe_email = html.escape(email)
    safe_password = html.escape(password)
    safe_support = html.escape(support)

    html_body = f"""<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2933;">
    <p>{html.escape(intro)}</p>
    <table cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Organization</strong></td><td>{safe_org}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Sign-in email</strong></td><td>{safe_email}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Shared password</strong></td><td><code>{safe_password}</code></td></tr>
    </table>
    <p>
      <a href="{html.escape(sign_in_url, quote=True)}" style="display:inline-block;padding:12px 18px;background:#1f4d3a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
        Sign in to ShiftWorksHR
      </a>
    </p>
    <p>
      Forgot your password later?
      <a href="{html.escape(recover_url, quote=True)}">Recover access</a>
      with the same work email you use to sign in.
    </p>
    <p style="color:#52606d;">
      Your organization shares one password. After sign-in, add authorized teammates from
      Team access in the analyzer.
    </p>
    <p style="color:#52606d;">{html.escape(save_note)}</p>
    <p style="color:#52606d;">Questions? Reply to <a href="mailto:{safe_support}">{safe_support}</a></p>
  </body>
</html>
"""
    return subject, text, html_body


def send_credentials_email(
    *,
    organization: str,
    email: str,
    password: str,
    plan_id: str = "",
    recovery: bool = False,
) -> bool:
    if not email_delivery_configured():
        logger.warning(
            "Credential email not sent to %s — configure RESEND_API_KEY or SMTP_HOST/SMTP_FROM.",
            email,
        )
        return False

    subject, text, html_body = _credentials_email_body(
        organization=organization,
        email=email,
        password=password,
        plan_id=plan_id,
        recovery=recovery,
    )
    from_addr = os.getenv("SMTP_FROM", _support_email()).strip()

    if os.getenv("RESEND_API_KEY", "").strip():
        return _send_via_resend(
            from_addr=from_addr,
            to_addr=email,
            subject=subject,
            text=text,
            html=html_body,
        )

    return _send_via_smtp(
        from_addr=from_addr,
        to_addr=email,
        subject=subject,
        text=text,
        html=html_body,
    )


def _send_via_smtp(
    *,
    from_addr: str,
    to_addr: str,
    subject: str,
    text: str,
    html: str,
) -> bool:
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
    message.add_alternative(html, subtype="html")

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


def _send_via_resend(
    *,
    from_addr: str,
    to_addr: str,
    subject: str,
    text: str,
    html: str,
) -> bool:
    import json

    api_key = os.getenv("RESEND_API_KEY", "").strip()
    payload = json.dumps(
        {
            "from": from_addr,
            "to": [to_addr],
            "subject": subject,
            "text": text,
            "html": html,
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


def send_teammate_invite_email(*, organization: str, email: str) -> bool:
    if not email_delivery_configured():
        logger.warning("Teammate invite not sent to %s — email delivery is not configured.", email)
        return False

    sign_in_url = _sign_in_url()
    recover_url = _recover_access_url()
    support = _support_email()
    subject = f"You've been added to {organization} on ShiftWorksHR"

    text = f"""You've been added to {organization} on ShiftWorksHR.

Sign in with:
- Work email: {email}
- Your organization's shared password (ask your HR admin if you don't have it yet)

Sign in: {sign_in_url}

After your first sign-in, you can recover access any time at {recover_url}.

Questions? Reply to {support}
"""

    safe_org = html.escape(organization)
    safe_email = html.escape(email)
    safe_support = html.escape(support)
    html_body = f"""<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2933;">
    <p>You&apos;ve been added to <strong>{safe_org}</strong> on ShiftWorksHR.</p>
    <table cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Work email</strong></td><td>{safe_email}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0;"><strong>Password</strong></td><td>Your organization&apos;s shared password</td></tr>
    </table>
    <p>Ask your HR admin for the shared password if you don&apos;t have it yet.</p>
    <p>
      <a href="{html.escape(sign_in_url, quote=True)}" style="display:inline-block;padding:12px 18px;background:#1f4d3a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
        Sign in to ShiftWorksHR
      </a>
    </p>
    <p>
      After your first sign-in, you can
      <a href="{html.escape(recover_url, quote=True)}">recover access</a>
      any time with this work email.
    </p>
    <p style="color:#52606d;">Questions? Reply to <a href="mailto:{safe_support}">{safe_support}</a></p>
  </body>
</html>
"""

    from_addr = os.getenv("SMTP_FROM", _support_email()).strip()
    if os.getenv("RESEND_API_KEY", "").strip():
        return _send_via_resend(
            from_addr=from_addr,
            to_addr=email,
            subject=subject,
            text=text,
            html=html_body,
        )
    return _send_via_smtp(
        from_addr=from_addr,
        to_addr=email,
        subject=subject,
        text=text,
        html=html_body,
    )
