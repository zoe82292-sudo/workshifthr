# Render production setup

Use this checklist once per environment (shiftworkshr.com).

## 1. Persistent disk (saved history + Stripe orgs)

1. Open [Render Dashboard](https://dashboard.render.com) → **shiftworkshr** web service.
2. Go to **Disks** → **Add disk** (if not already present):
   - **Name:** `shiftworkshr-data`
   - **Mount path:** `/var/data/shiftworkshr`
   - **Size:** 1 GB
3. Go to **Environment** → set:
   - `DATA_DIR` = `/var/data/shiftworkshr`
4. **Save** and wait for redeploy.

### Verify

```bash
curl -s https://shiftworkshr.com/api/health | python3 -m json.tool
```

Expected:

```json
"data_dir": {
  "path": "/var/data/shiftworkshr",
  "writable": true,
  "using_persistent_disk": true,
  "warning": null
}
```

If `path` is still `/app/backend/data`, the env var is missing or overridden — delete any empty `DATA_DIR` entry and set it explicitly.

After deploy, the app also auto-uses `/var/data/shiftworkshr` on Render when `DATA_DIR` is unset.

---

## 2. Credential email after checkout

Customers receive login details by email automatically after Stripe checkout (in addition to the one-time screen).

### Option A — Resend (recommended)

1. Create account at [resend.com](https://resend.com).
2. Add and verify domain `shiftworkshr.com` (DNS records in Cloudflare).
3. Create API key.
4. In Render **Environment**:
   - `RESEND_API_KEY` = `re_...`
   - `SMTP_FROM` = `ShiftWorksHR <hello@shiftworkshr.com>`

### Option B — SMTP (Google Workspace, etc.)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hello@shiftworkshr.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=ShiftWorksHR <hello@shiftworkshr.com>
SMTP_USE_TLS=true
```

### Verify

Health check should show:

```json
"credential_email_configured": true
```

Complete a Stripe **test** checkout and confirm the welcome email arrives.

---

## 3. End-to-end smoke test

1. Test checkout (Stripe test card `4242…`).
2. Confirm `/checkout/success` shows credentials.
3. Confirm welcome email received.
4. Sign in → upload `sample-data/compensation-sample.csv`.
5. **Save to history** → trigger manual redeploy → sign in again → history still present.

---

## 4. Layout check

After each deploy, hard-refresh the homepage (Cmd+Shift+R) and confirm:

- **Pricing** — three cards, no overlapping text on FAQ
- **Product preview** — demo metric boxes show titles at top, not empty tall cards
- **Flagged issues tab** in demo — table + metrics render cleanly
