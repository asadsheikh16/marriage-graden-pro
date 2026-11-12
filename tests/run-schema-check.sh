#!/usr/bin/env bash
# tests/run-schema-check.sh
# schema.sql ko PostgreSQL 15 par chalakar RLS, double-booking guard aur paise ke rules check karta hai.
# Ye Supabase par nahi chalta; ye sirf local database par logic ka test hai.
#
# Use karne ka tarika (local PostgreSQL 15 chahiye):
#   PSQL="psql -h localhost -p 5432 -U postgres" ./tests/run-schema-check.sh
set -euo pipefail

DB="${TEST_DB:-mgp_schema_test}"
PSQL="${PSQL:-psql -U postgres}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Test database banate hain: $DB"
$PSQL -d postgres -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"

echo "== schema.sql + tests/schema-check.sql chalate hain"
(cd "$ROOT" && $PSQL -d "$DB" -q -f tests/schema-check.sql > /tmp/mgp-schema-check.out 2>&1) || true

FAILED=$($PSQL -d "$DB" -tA -c "select count(*) filter (where not pass) from test_log")
TOTAL=$($PSQL -d "$DB" -tA -c "select count(*) from test_log")
echo "== Checks: $TOTAL, failed: $FAILED"
if [ "$FAILED" != "0" ]; then
  $PSQL -d "$DB" -c "select label, detail from test_log where not pass"
  exit 1
fi
echo "== SAB PASS"
