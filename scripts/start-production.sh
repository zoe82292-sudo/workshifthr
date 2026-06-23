#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building frontend..."
cd "$ROOT/frontend"
npm run build

echo "Starting ShiftWorksHR on http://127.0.0.1:${PORT:-8080}"
cd "$ROOT/backend"
source .venv/bin/activate
export PYTHONPATH="$ROOT/backend"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}"
