#!/usr/bin/env python3
"""tests/phase1/make_keys.py — prints LOCAL test keys (anon key, owner/staff sessions as JSON) for the
local stack only. Same HS256 secret as auth_stub.py. Fake users, 127.0.0.1 only."""
import sys, json, time
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from auth_stub import sign
EXP = int(time.time()) + 30 * 24 * 3600
OWNER = "11111111-1111-4111-8111-111111111111"
STAFF = "22222222-2222-4222-8222-222222222222"
def session(uid, email):
    tok = sign({"sub": uid, "role": "authenticated", "aud": "authenticated", "email": email, "exp": EXP})
    return json.dumps({"access_token": tok, "token_type": "bearer", "expires_in": 2592000,
                       "expires_at": EXP, "refresh_token": "local-refresh-not-used",
                       "user": {"id": uid, "aud": "authenticated", "email": email}})
if __name__ == "__main__":
    out = {"anon": sign({"role": "anon", "iss": "local", "exp": EXP}),
           "owner_session": session(OWNER, "owner@test.local"),
           "staff_session": session(STAFF, "staff@test.local")}
    json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "keys.local.json", "w"))
    print("keys written (local only)")
