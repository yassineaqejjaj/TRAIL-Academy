#!/usr/bin/env bash
# Logical backup of the PostgreSQL database (schema + data, including the auth schema), optionally copied to S3-compatible storage.
#   DATABASE_URL=postgres://… ./scripts/backup.sh [output-dir]
#   BACKUP_S3_ALIAS=backup BACKUP_S3_BUCKET=trail-backups ./scripts/backup.sh     # also copies with the MinIO client (mc) to a SEPARATE bucket/provider
# Needs pg_dump (same major version as the server). Keeps the 14 most recent local dumps.
# A dump contains personal data and password hashes: store it encrypted, privately, never as a public/CI artifact, and never in this repository.
# Restore:  pg_restore --clean --if-exists --no-owner --dbname "$TARGET_DATABASE_URL" trail-YYYYmmdd-HHMMSS.dump   (try it on a scratch database first)
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
OUT="${1:-./backups}"
mkdir -p "$OUT"
chmod 700 "$OUT"
FILE="$OUT/trail-$(date -u +%Y%m%d-%H%M%S).dump"
umask 077
pg_dump --format=custom --no-owner --no-privileges --file "$FILE" "$DATABASE_URL"
echo "backup written: $FILE ($(wc -c < "$FILE" | tr -d ' ') bytes)"
if [[ -n "${BACKUP_S3_ALIAS:-}" && -n "${BACKUP_S3_BUCKET:-}" ]]; then
  mc cp "$FILE" "$BACKUP_S3_ALIAS/$BACKUP_S3_BUCKET/db/$(basename "$FILE")"
  echo "copied to $BACKUP_S3_ALIAS/$BACKUP_S3_BUCKET/db/"
fi
# Retention: remove all but the 14 newest local dumps.
ls -1t "$OUT"/trail-*.dump 2>/dev/null | tail -n +15 | while read -r old; do rm -f -- "$old"; done
