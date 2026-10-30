#!/usr/bin/env sh
# Ежедневный бэкап базы в S3-совместимое хранилище своего же контура (данные не покидают регион).
# cron: 15 3 * * * /opt/digital-menu/deploy/backup.sh
# Нужны: docker compose, aws-cli (или s3cmd) и переменные BACKUP_BUCKET, S3_ENDPOINT в окружении.
set -eu
cd "$(dirname "$0")/.."
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="/tmp/digital-menu-$STAMP.sql.gz"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$FILE"
aws --endpoint-url "$S3_ENDPOINT" s3 cp "$FILE" "s3://$BACKUP_BUCKET/db/$STAMP.sql.gz"
rm -f "$FILE"
# Храним 30 дней: настройте lifecycle-правило бакета.
