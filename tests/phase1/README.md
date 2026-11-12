# tests/phase1 — Phase 1 local checks (fake data, local PostgreSQL only)

Nothing here touches Supabase or Vercel. Keys and users are fake and only work on 127.0.0.1.

1. Local database (PostgreSQL 15). After every rebuild the setup waits until the local API answers cleanly (Step 2 fix for the intermittent owner redirect): `PSQL="sudo -u postgres psql" tests/phase1/setup-local-db.sh`
   Builds `mgp_phase1` from tests/stub-auth.sql + schema.sql + migrations/002 + seed-local.sql.
   Owner: owner@test.local. Staff: staff@test.local. Garden A "Sitara Garden", garden B "Test Lawn B".
2. API door: PostgREST 16.5 with `tests/phase1/postgrest.conf` on 127.0.0.1:3001
   (binary from the PostgREST GitHub release; put it on PATH or edit the path).
3. Auth stub: `python3 tests/phase1/auth_stub.py` (127.0.0.1:54321). Checks the fake HS256 session and
   passes /rest/v1 to PostgREST. It is a test double, not Supabase Auth.
4. App: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from make_keys.py>`
   (use `localhost`, not `127.0.0.1`: the checks read the local session cookie `sb-localhost-auth-token`, which the app names from the URL host. Step 2 fix note.)
   `npm run build && npx next start -p 3200`
5. Checks:
   - `BASE=http://127.0.0.1:3200 python3 tests/phase1/role-check.py` (owner and staff side by side)
   - `BASE=http://127.0.0.1:3200 python3 tests/phase1/screenshots.py owner.png staff.png`
   - `tests/run-schema-check.sh` (45 SQL checks incl. RLS) and `tests/run-public-venues-check.sh` (111 SQL checks)
   - `npm test` (97 unit tests)
