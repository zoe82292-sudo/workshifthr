#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8080}"

echo "Building frontend..."
cd "$ROOT/frontend"
npm run build

echo "Starting ShiftWorksHR at http://localhost:${PORT}"
cd "$ROOT/backend"
source .venv/bin/activate
export PYTHONPATH="$ROOT/backend"

if ! python -c "import fastapi, pandas, openpyxl" 2>/dev/null; then
  echo "Installing backend dependencies..."
  pip install -r requirements.txt
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
