#!/usr/bin/env bash
# Backup ShiftWorksHR persistent data from a Render shell or any host with DATA_DIR set.
set -euo pipefail

DATA_DIR="${DATA_DIR:-/var/data/shiftworkshr}"
BACKUP_DIR="${1:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="${BACKUP_DIR}/shiftworkshr-data-${STAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"
tar -czf "${ARCHIVE}" -C "$(dirname "${DATA_DIR}")" "$(basename "${DATA_DIR}")"
echo "Created ${ARCHIVE}"
