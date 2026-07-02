# ShiftWorksHR

Compensation analysis web app for HR teams. Upload an Excel or CSV file and automatically surface pay range issues, duplicate IDs, range penetration, salary compression, and data quality problems.

## What it detects

| Check | Description |
| --- | --- |
| Below range minimum | Employees paid under their assigned range minimum |
| Above range maximum | Employees paid above their assigned range maximum |
| Duplicate employee IDs | Same employee ID appearing on multiple rows |
| Range penetration | `(salary - min) / (max - min) × 100`, with position bands |
| Salary compression | Level inversions, overlapping ranges, employee-level pay inversions |
| Managers below direct reports | Manager base pay lower than a direct report's pay |
| Missing bonus targets | Rows with no bonus target value |
| Missing salary ranges | Rows missing range minimum and/or maximum |
| Invalid effective dates | Unparseable, missing, future, or unusually old dates |
| Outlier merit increases | Merit % values outside the IQR-based expected range |
| Missing compensation data | Missing employee ID, salary, or range values |

## Project structure

```
ShiftWorksHR/
  backend/          FastAPI + pandas analysis engine
  frontend/         React upload and results dashboard
  sample-data/      Example compensation file
  render.yaml       Render blueprint (Docker + persistent disk)
```

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 3. Try the sample file

Use `sample-data/compensation-sample.csv` to verify all analysis categories.

## Expected file columns

**Required**

- Employee ID
- Current salary
- Range minimum
- Range maximum

**Optional (enables extended checks)**

- Employee name
- Job level / grade (salary compression)
- Manager ID (managers paid below reports)
- Bonus target (missing bonus target checks)
- Effective date (date validation)
- Merit increase % (outlier detection)
- Gender (pay equity by gender)
- Race/ethnicity (pay equity by demographic group)

## Analysis notes

- Pay equity analysis compares median pay by gender and race/ethnicity. Groups with fewer than five employees are hidden. Same job level breakdowns are included when a job level column is present. This is decision support only — not a legal pay equity audit.

- Range penetration requires a valid range spread (`max > min`).
- Salary compression is strongest when a job level or grade column is present.
- Manager vs. report checks require manager IDs that match employee IDs in the same file.
- Outlier merit detection uses the interquartile range (IQR) and needs at least 4 populated merit values.
- Upload size limit is **25 MB** by default (`MAX_UPLOAD_BYTES`).
- Analysis results are returned in the browser. Uploads are not persisted server-side by default. Signed-in users may optionally **Save to history** (JSON snapshot, up to 25 runs **per user account**, deletable).

## Authentication

Email + password login protects file upload and analysis when credentials are configured.

### Local development (auth off)

Leave `AUTH_USERS` unset and leave `provisioned_orgs.json` empty — the app works without a login screen.

### Production credentials

Two supported formats for `AUTH_USERS`:

**Simple (comma-separated):**

```text
you@company.com:Password1,client@acme.com:Password2
```

**JSON (recommended — shared org password + domain login):**

```json
[
  {
    "organization": "Acme Corp",
    "password": "YourSharedPassword123!",
    "emails": ["hr@acme.com"],
    "allow_domain": "acme.com"
  }
]
```

- `organization` — label shown in the app
- `password` — shared password for the org (hashed on first load)
- `emails` — explicit authorized addresses
- `allow_domain` — any `@acme.com` address can sign in with the shared password

After Stripe checkout, orgs are provisioned automatically into `DATA_DIR/provisioned_orgs.json` (persistent disk in production).

| Variable | Example | Notes |
| --- | --- | --- |
| `JWT_SECRET` | `a-long-random-string-here` | Required when auth is enabled (32+ characters) |
| `AUTH_USERS` | see JSON above | Optional if you only use Stripe-provisioned orgs |
| `JWT_EXPIRE_HOURS` | `24` | Session length |

Sessions last 24 hours by default (`JWT_EXPIRE_HOURS` to override).

## Deploy

ShiftWorksHR runs as a single web service: the API and built React UI are served together on one port.

### Run locally (production mode)

```bash
./scripts/start-production.sh
```

Open [http://localhost:8080](http://localhost:8080).

### Deploy to Render (recommended)

1. Push this project to a GitHub repository.
2. In [Render](https://render.com), create a **New Blueprint** or **Web Service** from the repo.
3. Render reads `render.yaml`:
   - **Starter** plan (required for persistent disk)
   - 1 GB disk mounted at `/var/data/shiftworkshr`
   - `DATA_DIR=/var/data/shiftworkshr`
4. Set secret environment variables in the Render dashboard (see `.env.example`):
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_CYCLE`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_MONTHLY`
   - Optional manual orgs: `AUTH_USERS`
5. Point **shiftworkshr.com** DNS to Render and set `PUBLIC_APP_URL=https://shiftworkshr.com`.
6. After deploy, verify persistence:

```bash
curl -s https://shiftworkshr.com/api/health | jq '.data_dir'
# expect: { "path": "/var/data/shiftworkshr", "writable": true }
```

### Stripe webhook

In Stripe Dashboard → Developers → Webhooks:

- **URL:** `https://shiftworkshr.com/api/billing/webhook`
- **Events:**
  - `checkout.session.completed`
  - `invoice.paid`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the signing secret to `STRIPE_WEBHOOK_SECRET` on Render.

### End-to-end smoke test (production)

1. Complete a test checkout (Stripe test mode).
2. Save credentials from `/checkout/success` — password is shown once.
3. Sign in → upload `sample-data/compensation-sample.csv` → export PDF/Excel.
4. Save to history → reload → history entry still present after redeploy (confirms disk).

## Tests

```bash
# Backend
pytest backend/tests -q

# Frontend build
cd frontend && npm ci && npm run build

# Playwright smoke (requires running server on :8080 with auth enabled)
export JWT_SECRET=local-e2e-jwt-secret-at-least-32-characters
export AUTH_USERS='[{"email":"demo@shiftworkshr.com","password":"DemoPass123!","organization":"Demo Org"}]'
./scripts/start-production.sh &
cd frontend && npx playwright test
```

CI runs pytest, frontend build, and Playwright smoke tests on push/PR.

## Temporary public link (local machine must stay on)

```bash
./scripts/start-production.sh
npx localtunnel --port 8080
```

Use the `https://....loca.lt` URL localtunnel prints. Useful for quick sharing, not long-term hosting.
