#!/usr/bin/env python3
"""Send a test credential email. Use before adding keys to Render.

Examples:
  RESEND_API_KEY=re_xxx SMTP_FROM="ShiftWorksHR <hello@shiftworkshr.com>" \\
    python3 scripts/test_credential_email.py you@example.com

  SMTP_HOST=mail.privateemail.com SMTP_PORT=587 SMTP_USER=hello@shiftworkshr.com \\
    SMTP_PASSWORD=xxx SMTP_FROM="ShiftWorksHR <hello@shiftworkshr.com>" \\
    python3 scripts/test_credential_email.py you@example.com
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.email_delivery import email_delivery_configured, send_credentials_email  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/test_credential_email.py recipient@email.com", file=sys.stderr)
        return 1

    to_addr = sys.argv[1].strip()
    if not email_delivery_configured():
        print("Email not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_FROM.", file=sys.stderr)
        return 1

    ok = send_credentials_email(
        organization="Test Organization",
        email=to_addr,
        password="Test-Password-123!",
        plan_id="cycle",
    )
    if ok:
        print(f"Sent test credential email to {to_addr}.")
        return 0

    print("Failed to send email. Check API key / SMTP credentials and logs.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
