#!/usr/bin/env python3
"""tests/phase1/e2e_local.py - browser end-to-end checks on the LOCAL stack only (fake data, 127.0.0.1).
Covers: logged-out redirect, wrong password, owner login/logout, staff login/logout, owner and staff
dashboards, create booking, double-booking guard, add payment (owner), receipt link (owner only),
staff cannot see money or edit payments, direct staff URLs. Each check records PASS/FAIL; the run continues.
Usage: BASE=http://127.0.0.1:3200 python3 tests/phase1/e2e_local.py
Needs: local stack (setup-local-db.sh, PostgREST, login-capable auth stub, running app), playwright + chromium.
Test passwords are local fakes that only the local test auth stub accepts.
"""
import os, re, sys, datetime, subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://127.0.0.1:3200")
GID = "aaaaaaaa-0000-4000-8000-00000000000a"
OWNER = ("owner@test.local", os.environ.get("E2E_OWNER_PASS", "local-owner-pass-1"))
STAFF = ("staff@test.local", os.environ.get("E2E_STAFF_PASS", "local-staff-pass-1"))
DB = os.environ.get("TEST_DB", "mgp_phase1")
BOOK_DATE = (datetime.date.today() + datetime.timedelta(days=200)).isoformat()
STAFF_DATE = (datetime.date.today() + datetime.timedelta(days=201)).isoformat()
DOUBLE_MSG = "Is date par booking already hai"
rows = []


def check(who, label, ok, observed):
    rows.append((who, label, "PASS" if ok else "FAIL", observed))


def db(sql):
    out = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", DB, "-tA", "-c", sql],
                         capture_output=True, text=True, timeout=60)
    return out.stdout.strip() if out.returncode == 0 else "ERR:" + out.stderr.strip()


def text(page):
    return re.sub(r"\s+", " ", page.inner_text("body"))


def login(page, creds):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.fill("input[name=email]", creds[0])
    page.fill("input[name=password]", creds[1])
    page.get_by_role("button", name="Login karein").click()
    page.wait_for_function("() => location.pathname.startsWith('/gardens') || location.pathname.startsWith('/login')", timeout=30000)
    page.wait_for_load_state("networkidle")


def logout(page):
    btn = page.locator('button[aria-label="Logout"]:visible')
    if btn.count() == 0:
        btn = page.locator("button:visible", has_text="Logout")
    btn.first.click()
    page.wait_for_url(lambda u: "/login" in u, timeout=30000)
    page.wait_for_load_state("networkidle")


def fill_booking(page, name, phone, date, status=None, guests=None):
    page.goto(f"{BASE}/g/{GID}/bookings/new", wait_until="networkidle")
    page.fill("input[name=customer_name]", name)
    page.fill("input[name=phone]", phone)
    if date:
        page.fill("input[name=event_date]", date)
    page.select_option("select[name=slot]", "din")
    if guests:
        page.fill("input[name=guests]", guests)
    if status:
        page.select_option("select[name=status]", status)


def submit(page, label):
    page.get_by_role("button", name=label).click()
    page.wait_for_function("() => !location.pathname.endsWith('/bookings/new') || location.search.includes('error=')", timeout=30000)
    page.wait_for_load_state("networkidle")


def run(p):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    ctx.add_init_script("try{localStorage.setItem('rmg-splash-seen','1')}catch(e){}")
    pg = ctx.new_page()

    # 1. logged out: a protected page goes to /login
    pg.goto(f"{BASE}/g/{GID}", wait_until="networkidle")
    check("anon", "protected page redirects to /login", "/login" in pg.url, pg.url.replace(BASE, ""))

    # 2. wrong password is refused
    login(pg, (OWNER[0], "wrong-password"))
    check("anon", "wrong password stays on login with message", "/login" in pg.url and "galat" in text(pg), pg.url.replace(BASE, ""))

    # 3. owner login and dashboard
    login(pg, OWNER)
    check("owner", "login lands on /gardens", "/gardens" in pg.url, pg.url.replace(BASE, ""))
    pg.goto(f"{BASE}/g/{GID}", wait_until="networkidle")
    t = text(pg)
    ok = "Pending payment" in t and "₹" in t
    check("owner", "dashboard shows owner money words", ok, "Pending payment and ₹ shown" if ok else "missing")

    # 4. owner creates a booking, checks DB totals
    fill_booking(pg, "E2E Test Customer", "9800000001", BOOK_DATE, status="confirmed")
    pg.fill("input[name=advance]", "50000")
    submit(pg, "Booking save karein")
    m = re.search(r"/bookings/([0-9a-f-]{36})", pg.url)
    bid = m.group(1) if m else None
    check("owner", "create booking saves and opens its detail", bid is not None and "saved=1" in pg.url, pg.url.replace(BASE, ""))
    if bid:
        cnt = db(f"select count(*) from bookings where id='{bid}' and customer_name='E2E Test Customer'")
        check("owner", "booking row exists in database", cnt == "1", f"rows={cnt}")
        money = db(f"select bm.subtotal, bm.advance, (select coalesce(sum(quantity*unit_rate),0) from booking_lines bl where bl.booking_id=bm.booking_id) from booking_money bm where bm.booking_id='{bid}'")
        parts = money.split("|")
        try:
            sub, adv, lines = (float(x) for x in parts)
            same = abs(sub - lines) < 0.01 and abs(adv - 50000) < 0.01
        except ValueError:
            same = False
        check("owner", "saved total equals sum of rate lines, advance 50000", same, f"subtotal|advance|lines = {money}")

    # 5. double-booking guard: same date and slot, confirmed
    fill_booking(pg, "E2E Clash Customer", "9800000002", BOOK_DATE, status="confirmed", guests="100")
    submit(pg, "Booking save karein")
    check("owner", "double-booking guard blocks same date and slot", DOUBLE_MSG in text(pg) and "saved=1" not in pg.url,
          "message shown" if DOUBLE_MSG in text(pg) else pg.url.replace(BASE, ""))
    clash_rows = db("select count(*) from bookings where customer_name='E2E Clash Customer'")
    check("owner", "guard saved nothing to the database", clash_rows == "0", f"rows={clash_rows}")

    # 6. add payment (owner) and receipt link (owner only)
    if bid:
        pg.goto(f"{BASE}/g/{GID}/bookings/{bid}", wait_until="networkidle")
        has_receipt = "Receipt WhatsApp par" in text(pg)
        check("owner", "detail page shows Receipt WhatsApp link", has_receipt, "link present" if has_receipt else "missing")
        pg.fill("input[name=balance_paid]", "20000")
        pg.get_by_role("button", name="Changes save karein").click()
        pg.wait_for_function("() => location.search.includes('saved=1') || location.search.includes('error=')", timeout=30000)
        pg.wait_for_load_state("networkidle")
        bp = db(f"select balance_paid, advance from booking_money where booking_id='{bid}'")
        try:
            vals = [float(x) for x in bp.split("|")]
        except ValueError:
            vals = []
        check("owner", "add payment saves balance 20000 next to advance 50000", vals == [20000.0, 50000.0], f"balance_paid|advance = {bp}")
        receipt = pg.locator("a", has_text="Receipt WhatsApp par").first
        href = receipt.get_attribute("href") if receipt.count() else ""
        check("owner", "receipt link opens WhatsApp with the booking text", bool(href) and "wa.me" in href, (href or "no link")[:60])
    logout(pg)
    check("owner", "logout returns to /login", "/login" in pg.url, pg.url.replace(BASE, ""))
    pg.goto(f"{BASE}/g/{GID}", wait_until="networkidle")
    check("anon", "after owner logout the garden page is closed", "/login" in pg.url, pg.url.replace(BASE, ""))

    # 7. staff login and permissions
    login(pg, STAFF)
    pg.goto(f"{BASE}/g/{GID}", wait_until="networkidle")
    t = text(pg)
    hidden = [w for w in ["Pending payment", "Total revenue", "kamai"] if w in t]
    check("staff", "dashboard hides revenue, pending and earnings", not hidden, "none shown" if not hidden else f"shown: {hidden}")
    pg.goto(f"{BASE}/g/{GID}/bookings", wait_until="networkidle")
    tb = text(pg)
    clean = "Pending payment" not in tb and "₹" not in tb
    check("staff", "bookings list shows no money words", clean, "clean" if clean else "money text present")
    fill_booking(pg, "E2E Staff Customer", "9800000003", STAFF_DATE)
    pg.fill("input[name=guests]", "150")
    submit(pg, "Booking save karein")
    sm = re.search(r"/bookings/([0-9a-f-]{36})", pg.url)
    check("staff", "staff can create a booking on a free date", sm is not None and "saved=1" in pg.url, pg.url.replace(BASE, ""))
    if sm:
        pg.goto(f"{BASE}/g/{GID}/bookings/{sm.group(1)}", wait_until="networkidle")
        st = text(pg)
        hidden_ok = "Receipt WhatsApp par" not in st and "Changes save karein" not in st
        check("staff", "staff booking detail hides receipt link and payment editing", hidden_ok, "hidden" if hidden_ok else "visible")
    fill_booking(pg, "E2E Staff Clash", "9800000004", BOOK_DATE)
    submit(pg, "Booking save karein")
    check("staff", "staff also hits the double-booking guard", DOUBLE_MSG in text(pg), "message shown" if DOUBLE_MSG in text(pg) else pg.url.replace(BASE, ""))
    for path in ["/rates", "/staff", "/export"]:
        r = pg.goto(f"{BASE}/g/{GID}{path}", wait_until="networkidle")
        code = r.status if r else None
        final = pg.url.replace(BASE, "")
        blocked = code == 403 or not final.endswith(path)
        check("staff", f"direct URL {path} is blocked for staff", blocked, f"ended at {final} status {code}")
    pg.goto(f"{BASE}/g/{GID}", wait_until="networkidle")
    logout(pg)
    check("staff", "staff logout returns to /login", "/login" in pg.url, pg.url.replace(BASE, ""))
    b.close()


def main():
    try:
        with sync_playwright() as p:
            run(p)
    except Exception as exc:  # keep the rows already recorded; report the stop
        check("harness", "run completed without an unhandled error", False, repr(exc)[:300])
    w = max(len(r[1]) for r in rows)
    print(f"{'WHO':6} {'CHECK':{w}}  RESULT  OBSERVED")
    for who, label, res, obs in rows:
        print(f"{who:6} {label:{w}}  {res:6}  {obs}")
    n_ok = sum(1 for r in rows if r[2] == "PASS")
    print(f"\nchecks: {len(rows)}, passed: {n_ok}, failed: {len(rows) - n_ok}")
    return 0 if n_ok == len(rows) else 1


if __name__ == "__main__":
    sys.exit(main())
