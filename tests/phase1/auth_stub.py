#!/usr/bin/env python3
"""
tests/phase1/auth_stub.py — LOCAL test stand-in for the Supabase API door (not Supabase).
- /auth/v1/user : checks the HS256 bearer token against the local test secret and returns the user.
- /rest/v1/*    : passes the request to a local PostgREST (which runs on local PostgreSQL 15).
Test secret and keys are fake and only work on 127.0.0.1. Usage: python3 tests/phase1/auth_stub.py
"""
import base64, hashlib, hmac, json, os, time, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

SECRET = os.environ.get("LOCAL_JWT_SECRET", "local-test-jwt-secret-only-for-127-0-0-1-0123456789")
PGREST = os.environ.get("LOCAL_PGREST", "http://127.0.0.1:3001")
PORT = int(os.environ.get("LOCAL_AUTH_PORT", "54321"))


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def sign(claims: dict) -> str:
    h = b64u(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    p = b64u(json.dumps(claims).encode())
    s = b64u(hmac.new(SECRET.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest())
    return f"{h}.{p}.{s}"


def verify(token: str):
    try:
        h, p, s = token.split(".")
        good = b64u(hmac.new(SECRET.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(good, s):
            return None
        pad = "=" * (-len(p) % 4)
        claims = json.loads(base64.urlsafe_b64decode(p + pad))
        if claims.get("exp", 0) < time.time():
            return None
        return claims
    except Exception:
        return None


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body: bytes, ctype="application/json", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/auth/v1/user"):
            auth = self.headers.get("Authorization", "")
            tok = auth.replace("Bearer ", "", 1)
            claims = verify(tok)
            if not claims or claims.get("role") != "authenticated":
                return self._send(401, json.dumps({"message": "invalid JWT"}).encode())
            user = {"id": claims["sub"], "aud": "authenticated", "role": "authenticated",
                    "email": claims.get("email", ""), "app_metadata": {}, "user_metadata": {}}
            return self._send(200, json.dumps(user).encode())
        return self._proxy()

    def do_POST(self):
        return self._proxy()

    do_PATCH = do_PUT = do_DELETE = do_HEAD = do_POST

    _HOP = {"connection", "keep-alive", "transfer-encoding", "content-length", "date", "server"}

    def _proxy(self):
        if not self.path.startswith("/rest/v1/"):
            return self._send(404, b'{"message":"not found in local stub"}')
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        target = PGREST + self.path[len("/rest/v1"):]
        req = urllib.request.Request(target, data=body, method=self.command)
        for k in ("Authorization", "Content-Type", "Prefer", "Accept", "Accept-Profile", "Content-Profile", "Range"):
            if self.headers.get(k):
                req.add_header(k, self.headers.get(k))
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                code, data, hdrs = r.status, r.read(), r.headers
        except urllib.error.HTTPError as e:
            code, data, hdrs = e.code, e.read(), e.headers
        # HEAD carries headers only; the count comes back in Content-Range, which the client reads
        self.send_response(code)
        for k, v in hdrs.items():
            if k.lower() not in self._HOP:
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)) if self.command != "HEAD" else "0")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)


if __name__ == "__main__":
    print(f"local auth stub on 127.0.0.1:{PORT} -> PostgREST {PGREST}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
