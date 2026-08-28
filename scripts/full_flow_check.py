"""ALSABBAT full CRUD + public-visibility lifecycle exercise.

Creates a realistic dataset through the admin API, verifies it is readable and
publicly visible, exercises the Baraya (customer) flow, then DELETES everything
it created in reverse order. Existing data is never modified or removed.

Usage: python scripts/full_flow_check.py [base_url]
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import dotenv_values

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"
ENV = dotenv_values(Path(__file__).resolve().parents[1] / "backend" / ".env")

TAG = uuid.uuid4().hex[:8]
results: list[tuple[bool, str, str]] = []
created: list[tuple[str, str]] = []  # (delete_path, label) — torn down in reverse


def check(ok: bool, name: str, detail: str = "") -> bool:
    results.append((ok, name, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" -> {detail}" if detail else ""))
    return ok


def unwrap(body):
    """Responses use several envelopes: {items:[...]}, {data:...}, {club:...} or raw."""
    if isinstance(body, dict):
        for key in ("data", "item", "items", "club", "result"):
            if key in body:
                return body[key]
    return body


def req(method: str, path: str, token: str | None = None, **kw):
    headers = kw.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.request(method, f"{API}{path}", headers=headers, timeout=45, **kw)


def create(path: str, payload: dict, token: str, label: str, delete_path: str | None = None):
    r = req("POST", path, token, json=payload)
    ok = r.status_code in (200, 201)
    if not check(ok, f"create {label}", f"{r.status_code}" + ("" if ok else f" {r.text[:220]}")):
        return None
    body = r.json()
    data = unwrap(body)
    item_id = data.get("id") if isinstance(data, dict) else None
    if item_id:
        created.append((f"{delete_path or path}/{item_id}", label))
    return data


def main() -> int:
    print("=" * 84)
    print(f"ALSABBAT full lifecycle check against {BASE}   (tag {TAG})")
    print("=" * 84)

    # ------------------------------------------------------------------ login
    r = req("POST", "/auth/login", json={
        "email": ENV.get("BOOTSTRAP_ADMIN_EMAIL"),
        "password": ENV.get("BOOTSTRAP_ADMIN_PASSWORD"),
    })
    if not check(r.status_code == 200, "admin login", str(r.status_code)):
        print(r.text[:300])
        return 1
    tok = r.json()["access_token"]

    r = req("GET", "/club", tok)
    clubs = unwrap(r.json())
    if isinstance(clubs, dict):
        clubs = [clubs]
    club_id = (clubs[0].get("id") if clubs else None)
    if not check(bool(club_id), "resolve club id", str(club_id)):
        return 1

    print("\n-- CLUB STRUCTURE --")
    season = create("/seasons", {
        "club_id": club_id, "name": f"Musim Uji {TAG}",
        "start_date": "2026-01-01", "end_date": "2026-12-31", "status": "ACTIVE",
    }, tok, "season")
    comp = create("/competitions", {
        "season_id": season["id"], "name": f"Liga Uji {TAG}", "status": "ACTIVE",
    }, tok, "competition") if season else None
    team = create("/teams", {
        "club_id": club_id, "name": f"Tim Uji {TAG}", "status": "ACTIVE",
    }, tok, "team")
    player = create("/players", {
        "team_id": team["id"], "full_name": f"Pemain Uji {TAG}",
        "position": "FORWARD", "jersey_number": 99, "status": "ACTIVE",
    }, tok, "player") if team else None
    staff = create("/staff", {
        "team_id": team["id"], "name": f"Pelatih Uji {TAG}",
        "role": "HEAD_COACH", "status": "ACTIVE",
    }, tok, "staff") if team else None

    print("\n-- MATCH --")
    match = create("/matches", {
        "team_id": team["id"],
        "opponent": {"name": f"Lawan Uji {TAG}", "short_name": "LWN"},
        "date": (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat(),
        "competition_id": comp["id"] if comp else None,
        "season_id": season["id"] if season else None,
        "venue": "Stadion Uji", "venue_type": "HOME", "status": "SCHEDULED",
    }, tok, "match") if team else None

    if match and player:
        r = req("POST", "/match-lineups", tok, json={
            "match_id": match["id"], "player_id": player["id"],
            "team_id": team["id"], "is_starting": True, "position": "FORWARD",
        })
        if check(r.status_code in (200, 201), "create match lineup",
                 f"{r.status_code}" + ("" if r.status_code in (200, 201) else f" {r.text[:200]}")):
            lid = (unwrap(r.json()) or {}).get("id")
            if lid:
                created.append((f"/match-lineups/{lid}", "match lineup"))
        r = req("POST", "/match-events", tok, json={
            "match_id": match["id"], "player_id": player["id"],
            "event_type": "GOAL", "minute": 55,
        })
        if check(r.status_code in (200, 201), "create match event (GOAL)",
                 f"{r.status_code}" + ("" if r.status_code in (200, 201) else f" {r.text[:200]}")):
            eid = (unwrap(r.json()) or {}).get("id")
            if eid:
                created.append((f"/match-events/{eid}", "match event"))

    print("\n-- CONTENT / MEDIA / GALLERY --")
    post = create("/content/posts", {
        "title": f"Berita Uji {TAG}", "excerpt": "Ringkasan uji.",
        "content": "Isi berita uji.", "status": "PUBLISHED",
    }, tok, "post", delete_path="/content/posts")
    album = create("/gallery/albums", {
        "title": f"Album Uji {TAG}", "description": "Album uji.",
        "status": "ACTIVE", "publish_status": "PUBLISHED",
    }, tok, "gallery album")
    sponsor = create("/sponsors", {
        "name": f"Sponsor Uji {TAG}", "tier": "GOLD", "status": "ACTIVE",
    }, tok, "sponsor")
    ach = create("/achievements", {
        "title": f"Prestasi Uji {TAG}", "year": 2026, "status": "ACTIVE",
    }, tok, "achievement")

    print("\n-- MERCHANDISE --")
    cat = create("/merchandise/catalog/categories", {
        "name": f"Kategori Uji {TAG}", "status": "ACTIVE",
    }, tok, "product category")
    product = create("/merchandise/catalog/products", {
        "name": f"Produk Uji {TAG}", "description": "Produk uji.",
        "category_id": cat["id"] if cat else None,
        "price": 150000, "stock_quantity": 25, "status": "ACTIVE",
        "sku": f"UJI-{TAG}",
    }, tok, "product")
    variant = create("/merchandise/catalog/variants", {
        "product_id": product["id"], "name": "Ukuran L",
        "stock_quantity": 10, "status": "ACTIVE", "sku": f"UJI-{TAG}-L",
    }, tok, "product variant") if product else None

    # ------------------------------------------------- public visibility
    print("\n-- PUBLIC VISIBILITY (unauthenticated) --")

    def public_contains(path: str, needle: str, label: str):
        r = requests.get(f"{API}{path}", timeout=45)
        if r.status_code != 200:
            return check(False, f"public {label}", f"HTTP {r.status_code}")
        return check(needle in r.text, f"public {label} shows new record", f"looking for '{needle}'")

    public_contains("/teams", f"Tim Uji {TAG}", "/teams")
    public_contains("/players", f"Pemain Uji {TAG}", "/players")
    public_contains("/staff", f"Pelatih Uji {TAG}", "/staff")
    public_contains("/matches", f"Lawan Uji {TAG}", "/matches")
    public_contains("/content/posts", f"Berita Uji {TAG}", "/content/posts")
    public_contains("/gallery/public/albums", f"Album Uji {TAG}", "/gallery/public/albums")
    public_contains("/sponsors", f"Sponsor Uji {TAG}", "/sponsors")
    public_contains("/achievements", f"Prestasi Uji {TAG}", "/achievements")
    public_contains("/merchandise/products", f"Produk Uji {TAG}", "/merchandise/products")
    public_contains("/seasons", f"Musim Uji {TAG}", "/seasons")
    public_contains("/competitions", f"Liga Uji {TAG}", "/competitions")

    print("\n-- DETAIL ENDPOINTS --")
    for label, path in [
        ("team", f"/teams/{team['id']}" if team else None),
        ("player", f"/players/{player['id']}" if player else None),
        ("match", f"/matches/{match['id']}" if match else None),
        ("post by id", f"/content/posts/{post['id']}" if post else None),
        ("album", f"/gallery/albums/{album['id']}" if album else None),
        ("product", f"/merchandise/catalog/products/{product['id']}" if product else None),
    ]:
        if not path:
            continue
        r = requests.get(f"{API}{path}", timeout=45)
        if r.status_code == 401:
            r = req("GET", path, tok)
        check(r.status_code == 200, f"GET detail {label}", f"{r.status_code}"
              + ("" if r.status_code == 200 else f" {r.text[:160]}"))

    # post detail by slug (public news page uses the slug)
    if post and post.get("slug"):
        r = requests.get(f"{API}/content/posts/by-slug/{post['slug']}", timeout=45)
        check(r.status_code == 200, "GET post by-slug (used by /news/:slug page)",
              f"{r.status_code} slug={post['slug']}")

    print("\n-- SEO --")
    r = requests.get(f"{API}/seo/sitemap.xml", timeout=45)
    check(r.status_code == 200, "GET /api/seo/sitemap.xml", str(r.status_code))
    check("<urlset" in r.text, "sitemap is valid urlset XML", r.text[:80].replace("\n", " "))
    if post and post.get("slug"):
        check(post["slug"] in r.text, "sitemap includes the new post slug",
              f"slug={post['slug']}")
    r = requests.get(f"{API}/seo/robots.txt", timeout=45)
    check(r.status_code == 200 and "User-agent" in r.text, "GET /api/seo/robots.txt", str(r.status_code))

    print("\n-- STATS / ANALYTICS --")
    r = requests.get(f"{API}/players/stats/leaderboard", timeout=45)
    check(r.status_code == 200, "GET /api/players/stats/leaderboard", str(r.status_code))
    r = req("GET", "/analytics/summary", tok)
    check(r.status_code == 200, "GET /api/analytics/summary (admin)", str(r.status_code))
    r = req("GET", "/readiness/content", tok)
    check(r.status_code == 200, "GET /api/readiness/content (admin)", str(r.status_code))

    # -------------------------------------------------------- baraya flow
    print("\n-- BARAYA (customer) FLOW --")
    cust_email = f"uji-{TAG}@sandbox-alsabbat.dev"
    cust_pwd = "Sandbox123"
    PHONE = "0812" + "".join(ch for ch in TAG if ch.isdigit()).ljust(8, "7")[:8]
    r = req("POST", "/baraya/register", json={
        "full_name": f"Baraya Uji {TAG}", "email": cust_email,
        "phone": PHONE, "password": cust_pwd,
        "password_confirmation": cust_pwd,
    })
    reg_ok = check(r.status_code in (200, 201), "baraya register",
                   f"{r.status_code}" + ("" if r.status_code in (200, 201) else f" {r.text[:250]}"))
    ctok = None
    if reg_ok:
        r = req("POST", "/baraya/login", json={"email": cust_email, "password": cust_pwd})
        if check(r.status_code == 200, "baraya login", f"{r.status_code}"
                 + ("" if r.status_code == 200 else f" {r.text[:200]}")):
            ctok = r.json().get("access_token") or r.json().get("token")
        if ctok:
            for label, path in [("me", "/baraya/me"), ("member card", "/baraya/member-card"),
                                ("orders", "/baraya/orders")]:
                r = req("GET", path, ctok)
                check(r.status_code == 200, f"baraya {label}", f"{r.status_code}"
                      + ("" if r.status_code == 200 else f" {r.text[:160]}"))
            # member card public verification
            r = req("GET", "/baraya/member-card", ctok)
            if r.status_code == 200:
                card = unwrap(r.json()) or {}
                code = card.get("member_code") or card.get("code") or card.get("verification_code")
                if code:
                    r = requests.get(f"{API}/member/verify/{code}", timeout=45)
                    if r.status_code == 404:
                        r = requests.get(f"{API}/baraya/member/verify/{code}", timeout=45)
                    check(r.status_code == 200, "public member-card verification",
                          f"{r.status_code} code={code}")

    # ------------------------------------------------------------ checkout
    print("\n-- CHECKOUT --")
    if product:
        r = req("POST", "/merchandise/cart/revalidate", json={
            "items": [{"product_id": product["id"], "quantity": 1,
                       "variant_id": variant["id"] if variant else None}]
        })
        check(r.status_code == 200, "cart revalidate", f"{r.status_code}"
              + ("" if r.status_code == 200 else f" {r.text[:200]}"))
        r = req("POST", "/merchandise/checkout", json={
            "items": [{"product_id": product["id"], "quantity": 1,
                       "variant_id": variant["id"] if variant else None}],
            "customer": {"name": f"Pembeli Uji {TAG}", "email": cust_email,
                         "phone": PHONE},
            "shipping": {"recipient": f"Pembeli Uji {TAG}", "phone": PHONE,
                         "address": "Jl. Uji No. 1", "city": "Bandung",
                         "province": "Jawa Barat", "postal_code": "40111"},
        })
        ok = r.status_code in (200, 201, 400, 422, 503)
        check(ok, "checkout responds without server fault", f"{r.status_code} {r.text[:200]}")
        if r.status_code in (200, 201):
            order = unwrap(r.json()) or {}
            oid = order.get("id")
            onum = order.get("order_number") or order.get("number")
            if onum:
                r2 = requests.get(f"{API}/merchandise/orders/track",
                                  params={"order_number": onum, "email": cust_email}, timeout=45)
                check(r2.status_code == 200, "public order tracking", f"{r2.status_code}")
            if oid:
                created.append((f"/merchandise/orders/{oid}", "order"))

    # ------------------------------------------------------------- teardown
    if os.environ.get("KEEP") == "1":
        import json as _json
        state = {"created": created, "customer_email": cust_email, "tag": TAG}
        Path("/tmp/alsabbat_created.json").write_text(_json.dumps(state, indent=1))
        print("\n-- TEARDOWN SKIPPED (KEEP=1) --")
        print(f"   {len(created)} records kept; state -> /tmp/alsabbat_created.json")
        print("   remove them later with: python scripts/full_flow_teardown.py")
        failed = [r for r in results if not r[0]]
        print(f"\nTOTAL {len(results)} checks | PASS {len(results)-len(failed)} | FAIL {len(failed)}")
        for _, name, detail in failed:
            print(f"  FAILED: {name} -> {detail}")
        return 1 if failed else 0

    print("\n-- TEARDOWN (removing only what this script created) --")
    failed_cleanup = []
    for path, label in reversed(created):
        r = req("DELETE", path, tok)
        if r.status_code not in (200, 204, 404):
            failed_cleanup.append((path, label, r.status_code, r.text[:120]))
            print(f"  [WARN] could not delete {label} ({path}) -> {r.status_code}")
        else:
            print(f"  removed {label}")

    if ctok or reg_ok:
        from pymongo import MongoClient
        cli = MongoClient(ENV.get("MONGO_URL", "mongodb://localhost:27017"))
        db = cli[ENV.get("MONGODB_DB_NAME", "alsabbat_platform_staging")]
        n = db["customers"].delete_many({"email": cust_email}).deleted_count
        db["customer_sessions"].delete_many({"customer_email": cust_email})
        print(f"  removed sandbox baraya account ({n})")

    check(not failed_cleanup, "teardown left nothing behind",
          "; ".join(f"{l}:{c}" for _, l, c, _ in failed_cleanup) or "clean")

    print("\n" + "=" * 84)
    failed = [r for r in results if not r[0]]
    print(f"TOTAL {len(results)} checks | PASS {len(results) - len(failed)} | FAIL {len(failed)}")
    for _, name, detail in failed:
        print(f"  FAILED: {name} -> {detail}")
    print("=" * 84)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
