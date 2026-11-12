#!/usr/bin/env python3
"""tests/phase1/role-check.py — owner and staff permission checks, side by side, on the LOCAL stack
(local PostgreSQL 15 + PostgREST + auth stub + the production build of the app). Fake data only.
Each check has an EXPECTATION, and the check passes only when the observed result matches it:
  BLOCK     : staff must be refused (redirect, 403, or the database returns nothing / denies the write)
  NO-MONEY  : staff may open the page, but no money or rate may appear in it or in the data returned
  SEES      : owner must get the money or rate data (owner keeps working)
Usage: BASE=http://127.0.0.1:3200 python3 tests/phase1/role-check.py   (exit 1 if any check mismatches)
"""
import os, sys, re, json, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests
from make_keys import session, OWNER, STAFF, sign
BASE = os.environ.get("BASE", "http://127.0.0.1:3200")
API = os.environ.get("API", "http://127.0.0.1:54321/rest/v1")
G = "aaaaaaaa-0000-4000-8000-00000000000a"
ANON = sign({"role": "anon", "iss": "local", "exp": 4102444800})
PAGE_MONEY_WORDS = ["Pending payment", "kamai", "₹", "Total revenue", "Rate quote", "quote "]

def bearer(uid, email):
    return json.loads(session(uid, email))["access_token"]

def page_text(html):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t))

rows = []
def add(who, label, expect, observed, ok):
    rows.append((who, label, expect, observed, ok))

def web(who, sess, path):
    s = requests.Session()
    s.cookies.update({"sb-localhost-auth-token": urllib.parse.quote(sess)})
    r = s.get(BASE + path, allow_redirects=False, timeout=30)
    loc = r.headers.get("location")
    words = [w for w in PAGE_MONEY_WORDS if w in page_text(r.text)] if r.status_code == 200 else []
    return r, loc, words

def check_page(who, sess, path, expect):
    """BLOCK: staff must be redirected or refused. NO-MONEY: staff opens it, no money words.
    SEES: owner opens it (200); the dashboard must also show the money cards."""
    r, loc, words = web(who, sess, path)
    if r.status_code in (301, 302, 303, 307, 308, 403):
        observed = f"{'redirect ' + loc if loc else 'refused'} ({r.status_code})"
        ok = expect == "BLOCK"
        # a redirect body must not carry owner-only content either
        leaked = [w for w in ["Hall / garden", "Decoration", "Rate card", "Team (owner", "Marketplace", "Pending payment"] if w in r.text]
        if leaked:
            observed += f"; body carries {leaked}"
            ok = False
    else:
        observed = f"opened ({r.status_code}){'; words: ' + ', '.join(words) if words else ''}"
        if expect == "NO-MONEY":
            ok = r.status_code == 200 and not words
        elif expect == "SEES":
            ok = r.status_code == 200 and (bool(words) if path == f"/g/{G}" else True)
        else:
            ok = False
    add(who, f"page {path.replace('/g/'+G, '') or '/'}", expect, observed, ok)

def check_api(who, tok, label, method, path, body, expect):
    h = {"Authorization": "Bearer " + tok, "apikey": ANON, "Accept": "application/json"}
    if body is not None:
        h["Content-Type"] = "application/json"
    r = requests.request(method, API + path, headers=h, json=body, timeout=30)
    if r.status_code >= 400:
        observed, rows_n = f"refused ({r.status_code}) {r.text[:70]}", 0
    else:
        data = r.json() if r.text else []
        rows_n = len(data) if isinstance(data, list) else (1 if data not in (None, "") else 0)
        observed = f"returned {rows_n} row(s)"
    if expect == "BLOCK":
        ok = rows_n == 0
    elif expect == "SEES":
        ok = rows_n > 0
    else:
        ok = True
    add(who, label, expect, observed, ok)
    return r

owner_s, staff_s = session(OWNER, "owner@test.local"), session(STAFF, "staff@test.local")
owner_t, staff_t = bearer(OWNER, "owner@test.local"), bearer(STAFF, "staff@test.local")

# 1. Owner-only direct URLs: staff BLOCK, owner SEES (page opens)
for path in [f"/g/{G}/rates", f"/g/{G}/staff", f"/g/{G}/settings"]:
    check_page("staff", staff_s, path, "BLOCK")
    check_page("owner", owner_s, path, "SEES")  # owner keeps the page (200)

# 2. CSV export route
r, loc, _ = web("staff", staff_s, f"/g/{G}/export")
add("staff", "CSV export /export", "BLOCK", f"refused ({r.status_code}) {r.text[:50]!r}", r.status_code == 403 and "subtotal" not in r.text)
r, loc, _ = web("owner", owner_s, f"/g/{G}/export")
add("owner", "CSV export /export", "SEES", f"downloaded ({r.status_code}), money columns={'subtotal' in r.text}", r.status_code == 200 and "subtotal" in r.text)

# 3. Dashboard and other pages: staff opens them, no money in them; owner sees the money parts
check_page("staff", staff_s, f"/g/{G}", "NO-MONEY")
check_page("owner", owner_s, f"/g/{G}", "SEES")
for path in [f"/g/{G}/calendar", f"/g/{G}/bookings", f"/g/{G}/enquiries", f"/g/{G}/more", f"/g/{G}/bookings/new"]:
    check_page("staff", staff_s, path, "NO-MONEY")
    check_page("owner", owner_s, path, "SEES")

# 4. Database endpoints (what the app and any API client call), staff BLOCK vs owner SEES
for label, path in [("booking_money: earnings and balance", "/booking_money?select=balance,payment_status"),
                    ("booking_lines: rate lines", "/booking_lines?select=item_name,line_total"),
                    ("rate_items: rates", "/rate_items?select=name,peak_rate,off_rate"),
                    ("enquiry_quotes: quoted rates", "/enquiry_quotes?select=rate_quoted")]:
    check_api("staff", staff_t, label, "GET", path, None, "BLOCK")
    check_api("owner", owner_t, label, "GET", path, None, "SEES")
# RPC season totals
check_api("staff", staff_t, "season_summary: season totals", "POST", "/rpc/season_summary", {"p_garden": G, "p_from": "2026-01-01", "p_to": "2026-12-31"}, "BLOCK")
check_api("owner", owner_t, "season_summary: season totals", "POST", "/rpc/season_summary", {"p_garden": G, "p_from": "2026-01-01", "p_to": "2026-12-31"}, "SEES")
# Embedded money in bookings: staff gets the bookings but never a money object
emb = f"/bookings?select=customer_name,booking_money(total_amount,balance)&garden_id=eq.{G}&limit=5"
r = requests.get(API + emb, headers={"Authorization": "Bearer " + staff_t, "apikey": ANON}, timeout=30)
money_objs = sum(1 for b in r.json() if b.get("booking_money")) if r.status_code == 200 else 0
add("staff", "bookings + embedded money object", "BLOCK", f"{r.status_code}, money objects={money_objs}", money_objs == 0 and r.status_code == 200)
r = requests.get(API + emb, headers={"Authorization": "Bearer " + owner_t, "apikey": ANON}, timeout=30)
money_objs = sum(1 for b in r.json() if b.get("booking_money")) if r.status_code == 200 else 0
add("owner", "bookings + embedded money object", "SEES", f"{r.status_code}, money objects={money_objs}", money_objs > 0)

# 5. Staff writes to money and rates are refused by the database (nothing changes)
hs = {"Authorization": "Bearer " + staff_t, "apikey": ANON, "Content-Type": "application/json", "Prefer": "return=representation"}
r = requests.patch(API + f"/rate_items?garden_id=eq.{G}", headers=hs, json={"peak_rate": 1}, timeout=30)
after = requests.get(API + f"/rate_items?select=peak_rate&garden_id=eq.{G}", headers={"Authorization": "Bearer " + owner_t, "apikey": ANON}, timeout=30).json()
changed = any(float(x["peak_rate"]) == 1 for x in after)
add("staff", "change a rate (rate_items)", "BLOCK", f"{r.status_code}, rows changed={changed}", not changed)
r = requests.patch(API + f"/booking_money?garden_id=eq.{G}", headers=hs, json={"advance": 0}, timeout=30)
wrote = r.status_code < 400 and r.text.strip() not in ("", "[]")
add("staff", "edit payment (booking_money)", "BLOCK", f"{r.status_code} {r.text[:40]!r}", not wrote)
r = requests.post(API + "/booking_money", headers=hs, json={"booking_id": "00000000-0000-4000-8000-000000000000", "garden_id": G}, timeout=30)
add("staff", "insert payment row (booking_money)", "BLOCK", f"refused ({r.status_code})", r.status_code >= 400)

print(f"{'WHO':<6} {'CHECK':<40} {'EXPECT':<9} {'OBSERVED':<62} RESULT")
for who, label, expect, observed, ok in rows:
    print(f"{who:<6} {label[:40]:<40} {expect:<9} {observed[:62]:<62} {'PASS' if ok else 'FAIL'}")
fails = [r for r in rows if not r[4]]
print(f"\nchecks: {len(rows)}, passed: {len(rows)-len(fails)}, failed: {len(fails)}")
sys.exit(1 if fails else 0)
