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
# Applying 0006 and everything after it again proves they are safe to re-run against a live
# project. The later ones must follow, as they would: 0006 revokes table grants that they add to.
for m in "$ROOT"/migrations/*.sql; do
  case "$(basename "$m")" in 000[0-5]_*) continue ;; esac
  echo "migrate  $(basename "$m") again (idempotent)"
  $PSQL -f "$m"
done
for t in "$ROOT"/tests/*_test.sql; do
  echo "test     $(basename "$t")"
  status=0
  $PSQL -f "$t" >"$DATA/out" 2>&1 || status=$?
  grep -E 'NOTICE:  ok|ERROR|FAIL' "$DATA/out" | sed 's/^psql:[^ ]* NOTICE:  //; s/^psql:[^ ]* //'
  [ "$status" -eq 0 ] || { echo "FAILED: $(basename "$t")"; exit 1; }
done
echo "all database tests passed"
