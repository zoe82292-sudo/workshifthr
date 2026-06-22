# WorkShiftHR

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
WorkShiftHR/
  backend/          FastAPI + pandas analysis engine
  frontend/         React upload and results dashboard
  sample-data/      Example compensation file
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

## Analysis notes

- Range penetration requires a valid range spread (`max > min`).
- Salary compression is strongest when a job level or grade column is present.
- Manager vs. report checks require manager IDs that match employee IDs in the same file.
- Outlier merit detection uses the interquartile range (IQR) and needs at least 4 populated merit values.
- Analysis results are returned in the browser and are not persisted server-side.

## Deploy

WorkShiftHR can run as a single web service: the API and built React UI are served together on one port.

### Run locally (production mode)

```bash
./scripts/start-production.sh
```

Open [http://localhost:8080](http://localhost:8080).

### Deploy to Render (recommended)

1. Push this project to a GitHub repository.
2. In [Render](https://render.com), create a **New Web Service** from the repo.
3. Render will detect `render.yaml` and build the Docker image automatically.
4. After deploy, share the Render URL (for example `https://workshifthhr.onrender.com`).

### Temporary public link (local machine must stay on)

```bash
./scripts/start-production.sh
npx localtunnel --port 8080
```

Use the `https://....loca.lt` URL localtunnel prints. This is useful for quick sharing, not long-term hosting.
