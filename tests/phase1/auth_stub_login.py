# tests/phase1/auth_stub_login.py - LOCAL test harness only (fake users, fake passwords, 127.0.0.1 only).
# Start it instead of auth_stub.py when running tests/phase1/e2e_local.py: python3 tests/phase1/auth_stub_login.py
# Wraps tests/phase1/auth_stub.py and adds the password sign-in and sign-out endpoints the stock stub lacks,
# so the login and logout form can be tested end to end on the local stack. Not Supabase.
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import auth_stub as A
from make_keys import session, OWNER, STAFF
PASSWORDS = {"owner@test.local": "local-owner-pass-1", "staff@test.local": "local-staff-pass-1"}
UIDS = {"owner@test.local": OWNER, "staff@test.local": STAFF}
_orig_post = A.H.do_POST
def do_POST(self):
    if self.path.startswith("/auth/v1/token"):
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n) or b"{}")
        email = body.get("email", "")
        if PASSWORDS.get(email) != body.get("password", ""):
            return self._send(400, json.dumps({"error": "invalid_grant", "error_description": "Invalid login credentials"}).encode())
        return self._send(200, session(UIDS[email], email).encode())
    if self.path.startswith("/auth/v1/logout"):
        return self._send(204, b"")
    return _orig_post(self)
A.H.do_POST = do_POST
print("local login-capable auth stub on 127.0.0.1:%d" % A.PORT, flush=True)
A.ThreadingHTTPServer(("127.0.0.1", A.PORT), A.H).serve_forever()
