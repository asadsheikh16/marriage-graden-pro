#!/usr/bin/env bash
# tests/phase1/setup-local-db.sh
# Local PostgreSQL 15 test database for the Phase 1 checks. NOT Supabase, no real keys.
# Builds: auth stub (tests/stub-auth.sql), schema.sql, migrations/002, seed-local.sql.
# Usage: PSQL="sudo -u postgres psql" ./tests/phase1/setup-local-db.sh
set -euo pipefail
DB="${TEST_DB:-mgp_phase1}"
PSQL="${PSQL:-sudo -u postgres psql}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# close the local stack's open connections to the test DB first (PostgREST pool), then rebuild it
$PSQL -d postgres -q -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$DB' and pid <> pg_backend_pid()" >/dev/null
$PSQL -d postgres -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
$PSQL -d "$DB" -q -v ON_ERROR_STOP=1 -f "$ROOT/tests/stub-auth.sql"
$PSQL -d "$DB" -q -v ON_ERROR_STOP=1 -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login noinherit password 'local-only-test'; end if; end \$\$;" -c "grant anon, authenticated to authenticator"
$PSQL -d "$DB" -q -v ON_ERROR_STOP=1 -f "$ROOT/schema.sql"
$PSQL -d "$DB" -q -v ON_ERROR_STOP=1 -f "$ROOT/migrations/002_public_venues.sql"
$PSQL -d "$DB" -q -v ON_ERROR_STOP=1 -f "$ROOT/tests/phase1/seed-local.sql"
echo "== local DB $DB ready (owner@test.local, staff@test.local)"
# Step 2 fix (root cause of the intermittent owner /rates -> /gardens): dropping the DB ends the
# connections PostgREST still holds in its pool, so its first few calls after a rebuild return 503
# (57P01 / PGRST001). Wait here until the API answers cleanly, so the first permission check is
# never the one that hits a dead pool connection.
API_PROBE="${API_PROBE:-http://127.0.0.1:3001/rpc/my_role}"
OWNER_UID="11111111-1111-4111-8111-111111111111"
GARDEN="aaaaaaaa-0000-4000-8000-00000000000a"
ok_in_row=0
for i in $(seq 1 120); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_PROBE" -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $(python3 -c "import sys;sys.path.insert(0,'$ROOT/tests/phase1');from make_keys import session,OWNER;import json;print(json.loads(session(OWNER,'owner@test.local'))['access_token'])")" \
    -d "{\"p_garden\": \"$GARDEN\"}" || echo 000)
  if [ "$code" = "200" ]; then ok_in_row=$((ok_in_row+1)); else ok_in_row=0; fi
  [ "$ok_in_row" -ge 5 ] && break
  sleep 0.5
done
echo "== API ready after rebuild: $ok_in_row clean answers in a row (probe attempts: $i)"
