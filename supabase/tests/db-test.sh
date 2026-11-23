#!/bin/sh
# Database tests against a throwaway local Postgres (no Docker). Applies bootstrap.sql (stand-in
# for Supabase's auth/storage), every migration in order, then each *_test.sql. Exits non-zero on
# the first failing assertion.
set -eu

PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$(mktemp -d "${TMPDIR:-/tmp}/eatery-pg.XXXXXX")"
PORT="${PGTEST_PORT:-54339}"

cleanup() { "$PG_BIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA" -l "$DATA/log" -w start >/dev/null

PSQL="$PG_BIN/psql -h $DATA -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X"

$PSQL -f "$ROOT/tests/bootstrap.sql"
for m in "$ROOT"/migrations/*.sql; do
  echo "migrate  $(basename "$m")"
  $PSQL -f "$m"
done
# Applying twice proves the native-app migration is safe to re-run against a live project.
echo "migrate  0006 again (idempotent)"
$PSQL -f "$ROOT/migrations/0006_native_app.sql"
for t in "$ROOT"/tests/*_test.sql; do
  echo "test     $(basename "$t")"
  status=0
  $PSQL -f "$t" >"$DATA/out" 2>&1 || status=$?
  grep -E 'NOTICE:  ok|ERROR|FAIL' "$DATA/out" | sed 's/^psql:[^ ]* NOTICE:  //; s/^psql:[^ ]* //'
  [ "$status" -eq 0 ] || { echo "FAILED: $(basename "$t")"; exit 1; }
done
echo "all database tests passed"
