#!/usr/bin/env bash
# tests/run-public-venues-check.sh
# schema.sql + migrations/002_public_venues.sql local PostgreSQL 15 par chalakar
# public (anon) privacy checks chalata hai. Supabase par nahi chalta.
#
# Use karne ka tarika:
#   PSQL="sudo -u postgres psql" ./tests/run-public-venues-check.sh
#   (default PSQL: psql -U postgres)
set -euo pipefail

DB="${TEST_DB:-mgp_public_venues_test}"
PSQL="${PSQL:-psql -U postgres}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Test database banate hain: $DB"
$PSQL -d postgres -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"

echo "== schema.sql + migrations/002 + tests/public-venues-check.sql chalate hain"
(cd "$ROOT" && $PSQL -d "$DB" -q -f tests/public-venues-check.sql > /tmp/mgp-public-check.out 2>&1) || true

FAILED=$($PSQL -d "$DB" -tA -c "select count(*) filter (where not pass) from pv_log")
TOTAL=$($PSQL -d "$DB" -tA -c "select count(*) from pv_log")
echo "== Public venues checks: $TOTAL, failed: $FAILED"
if [ "$FAILED" != "0" ] || [ "$TOTAL" = "0" ]; then
  $PSQL -d "$DB" -c "select label, detail from pv_log where not pass"
  exit 1
fi
echo "== SAB PASS"
