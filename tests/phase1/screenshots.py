#!/usr/bin/env python3
"""tests/phase1/screenshots.py — screenshots of the owner and staff dashboards rendered from the LOCAL
test database (real queries, fake test data). Phone size 390x844, full page.
Usage: BASE=http://127.0.0.1:3200 python3 tests/phase1/screenshots.py /path/out-owner.png /path/out-staff.png
Needs: playwright (python) with chromium, the local stack (setup-local-db.sh, postgrest, auth_stub.py) and a running app."""
import os, sys, json, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from make_keys import session, OWNER, STAFF
BASE = os.environ.get("BASE", "http://127.0.0.1:3200")
GARDEN = os.environ.get("GARDEN", "aaaaaaaa-0000-4000-8000-00000000000a")
owner_out, staff_out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch()
    for who, uid, email, out in [("owner", OWNER, "owner@test.local", owner_out), ("staff", STAFF, "staff@test.local", staff_out)]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        ctx.add_cookies([{"name": "sb-localhost-auth-token", "value": urllib.parse.quote(session(uid, email)),
                          "domain": "127.0.0.1", "path": "/"}])
        ctx.add_init_script("try{localStorage.setItem('rmg-splash-seen','1')}catch(e){}")
        pg = ctx.new_page()
        pg.goto(f"{BASE}/g/{GARDEN}", wait_until="networkidle")
        pg.wait_for_timeout(400)
        # full length of the page in one image; fixed nav and button sit at the bottom as on a phone
        h = pg.evaluate("() => Math.max(document.documentElement.scrollHeight, 844)")
        pg.set_viewport_size({"width": 390, "height": int(h)})
        pg.wait_for_timeout(300)
        pg.screenshot(path=out, full_page=False)
        print(who, "->", out)
        ctx.close()
    b.close()
