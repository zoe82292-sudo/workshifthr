# Sample data

`compensation-sample.csv` powers the public demo (`/api/demo-analysis`, homepage preview, and `/sample-preview`).

## Keep the demo in sync with the tool

After you change the analyzer or edit the sample CSV, regenerate the offline snapshot used when the API is unavailable:

```bash
python scripts/sync_demo_snapshot.py
```

Or:

```bash
cd frontend && npm run sync:demo
```

Commit the updated `frontend/src/data/demo-analysis.snapshot.json` with your changes.
