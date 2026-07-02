FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
# Force a clean frontend build in Docker (avoid stale incremental artifacts).
RUN rm -f tsconfig.tsbuildinfo && npm run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/app ./backend/app
COPY sample-data ./sample-data
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV PYTHONPATH=/app/backend
ENV PORT=8000
ENV DATA_DIR=/var/data/shiftworkshr

WORKDIR /app/backend
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
