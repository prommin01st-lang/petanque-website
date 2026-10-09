#!/usr/bin/env bash
# Back up the SQLite database and uploads from the running app container.
set -euo pipefail
umask 077
cd "$(dirname "$0")"

STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=${BACKUP_DIR:-./backups}
KEEP=14
mkdir -p -m 700 "$BACKUP_DIR"

# Consistent DB snapshot (fixed in-container name, overwritten each run).
docker compose exec -T app /server backup --force /data/backup-latest.db
docker compose cp app:/data/backup-latest.db "$BACKUP_DIR/backup-$STAMP.db"

# Uploads.
docker compose cp app:/data/uploads "$BACKUP_DIR/uploads-$STAMP"
tar -czf "$BACKUP_DIR/uploads-$STAMP.tgz" -C "$BACKUP_DIR" "uploads-$STAMP"
rm -rf "$BACKUP_DIR/uploads-$STAMP"

# Keep the newest $KEEP of each.
ls -1t "$BACKUP_DIR"/backup-*.db 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --
ls -1t "$BACKUP_DIR"/uploads-*.tgz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --

echo "backup complete: $BACKUP_DIR/backup-$STAMP.db, $BACKUP_DIR/uploads-$STAMP.tgz"
