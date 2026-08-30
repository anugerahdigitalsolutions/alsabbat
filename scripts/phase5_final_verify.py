"""FASE 5 final verification — celah yang belum dicakup phase3/4a/4b.

Sandbox database only (dropped at the end). Zero production writes.
Run:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase5_final_verify.py
"""
import asyncio
import os
import re
from datetime import datetime, timedelta, timezone

SANDBOX_DB = "alsabbat_phase5_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services import google_auth  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402
from app.services.mailer import get_mailer  # noqa: E402

results = []
PASSWORD = "Sandbox123"
EMAIL = "fase5@sandbox-alsabbat.dev"
GOOGLE_NEW = "fase5.google@sandbox-alsabbat.dev"


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


FORBIDDEN_KEYS = ("client_secret", "api_key", "access_token", "refresh_token", "password_hash", "token_secret")


def leaks(payload, path=""):
    """Cari KUNCI sensitif pada body JSON (nama env var di `missing_env` bukan kebocoran)."""
    found = []
    if isinstance(payload, dict):
        for k, v in payload.items():
            if k.lower() in FORBIDDEN_KEYS:
                found.append(f"{path}.{k}")
            found += leaks(v, f"{path}.{k}")
    elif isinstance(payload, list):
        for i, v in enumerate(payload):
            found += leaks(v, f"{path}[{i}]")
    return found


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()
    mailer = get_mailer()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        ah = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        # ---------------------------------------------------- Google config OFF
        cfg = await c.get("/baraya/auth/config")
        check(
            "F5-01 /baraya/auth/config NOT_CONFIGURED tanpa crash & tanpa secret",
            cfg.status_code == 200 and cfg.json()["google_enabled"] is False and not leaks(cfg.json()),
            cfg.text[:140],
        )
        off = await c.post(
            "/baraya/google/login",
            json={"code": "dummy-oauth-code-1234567890", "redirect_uri": "https://sandbox.test/cb"},
        )
        check(
            "F5-02 Google login saat OFF → error jujur NOT_CONFIGURED (bukan 5xx)",
            off.status_code in (400, 422, 503) and "google" in off.text.lower(),
            off.text[:160],
        )

        # ---------------------------------------------------- akun email + OTP
        await c.post(
            "/baraya/register",
            json={
                "full_name": "Uji Fase 5",
                "email": EMAIL,
                "phone": "+628123456755",
                "password": PASSWORD,
                "password_confirmation": PASSWORD,
            },
        )
        code = re.search(
            r"Kode verifikasi: (\d{6})", [m for m in mailer.outbox if m.to == EMAIL][-1].text
        ).group(1)
        verify = await c.post("/baraya/otp/verify", json={"email": EMAIL, "code": code})
        mh = {"Authorization": f"Bearer {verify.json()['access_token']}"}
        existing_customer_id = verify.json()["customer"]["id"]
        check("F5-03 register + OTP email tetap berjalan", verify.status_code == 200)

        # ------------------------------------------- Google config ON (simulasi)
        settings.GOOGLE_CLIENT_ID = "sandbox-client-id.apps.googleusercontent.com"
        settings.GOOGLE_CLIENT_SECRET = "sandbox-client-secret"
        cfg_on = await c.get("/baraya/auth/config")
        check(
            "F5-04 saat dikonfigurasi: google_enabled true & hanya client_id publik",
            cfg_on.json()["google_enabled"] is True
            and cfg_on.json()["google_client_id"] == settings.GOOGLE_CLIENT_ID
            and "client_secret" not in cfg_on.text.lower(),
            cfg_on.text[:160],
        )

        async def fake_exchange(code, redirect_uri):  # noqa: ARG001
            return {
                "google_id": f"gid-{code}",
                "email": code,
                "full_name": "Google Sandbox",
                "picture": None,
                "email_verified": True,
            }

        original = google_auth.exchange_code
        google_auth.exchange_code = fake_exchange
        try:
            new_login = await c.post(
                "/baraya/google/login", json={"code": GOOGLE_NEW, "redirect_uri": "https://sandbox.test/cb"}
            )
            gdoc = await db[Collections.CUSTOMERS].find_one({"email": GOOGLE_NEW})
            check(
                "F5-05 akun Google baru → MEMBER, email terverifikasi, token terbit",
                new_login.status_code == 200
                and "access_token" in new_login.json()
                and gdoc["role"] == "MEMBER"
                and gdoc.get("email_verified") is True,
                new_login.text[:140],
            )
            count_before = await db[Collections.CUSTOMERS].count_documents({})
            again = await c.post(
                "/baraya/google/login", json={"code": GOOGLE_NEW, "redirect_uri": "https://sandbox.test/cb"}
            )
            existing = await c.post(
                "/baraya/google/login", json={"code": EMAIL, "redirect_uri": "https://sandbox.test/cb"}
            )
            count_after = await db[Collections.CUSTOMERS].count_documents({})
            check(
                "F5-06 email Google existing tidak membuat akun duplikat",
                again.status_code == 200
                and existing.status_code == 200
                and count_after == count_before
                and await db[Collections.CUSTOMERS].count_documents({"email": EMAIL}) == 1,
                f"{count_before}->{count_after}",
            )
            linked = await db[Collections.CUSTOMERS].find_one({"email": EMAIL})
            check(
                "F5-07 login Google pada akun email existing menautkan google_id (peran tidak berubah)",
                linked.get("google_id") and linked["role"] == "MEMBER" and linked["id"] == existing_customer_id,
                str(linked.get("google_id")),
            )
            pw_login = await c.post("/baraya/login", json={"email": EMAIL, "password": PASSWORD})
            check("F5-08 login password akun tertaut Google tetap berjalan", pw_login.status_code == 200)
        finally:
            google_auth.exchange_code = original
            settings.GOOGLE_CLIENT_ID = None
            settings.GOOGLE_CLIENT_SECRET = None

        # ------------------------------------------------ social / app store
        platforms = await c.get("/social/platforms", headers=ah)
        conns = await c.get("/social/connections", headers=ah)
        check(
            "F5-09 /social/platforms & /connections bebas secret/token",
            platforms.status_code == 200
            and conns.status_code == 200
            and not leaks(platforms.json())
            and not leaks(conns.json()),
            f"{leaks(platforms.json())} {leaks(conns.json())}",
        )
        check(
            "F5-10 status platform sosial jujur (NOT_CONFIGURED tanpa env)",
            all(
                item["connected"] is False
                and item["status"] in ("NOT_CONFIGURED", "DISCONNECTED")
                for item in platforms.json()["items"]
                if item["platform"] != "WEBSITE"
            ),
            str([(i["platform"], i["status"]) for i in platforms.json()["items"]]),
        )
        club = await db[Collections.CLUBS].find_one({})
        store = await c.patch(
            f"/club/{club['id']}",
            json={
                "app_playstore_url": "https://play.google.com/store/apps/details?id=com.alsabbat.app",
                "app_appstore_url": "https://apps.apple.com/id/app/alsabbat/id123456789",
            },
            headers=ah,
        )
        public_club = await c.get("/club/active")
        check(
            "F5-11 URL Play Store / App Store valid & tampil di endpoint publik",
            store.status_code == 200
            and public_club.json()["club"]["app_playstore_url"].startswith("https://play.google.com/")
            and public_club.json()["club"]["app_appstore_url"].startswith("https://apps.apple.com/"),
            store.text[:140],
        )
        bad_store = await c.patch(
            f"/club/{club['id']}", json={"app_playstore_url": "javascript:alert(1)"}, headers=ah
        )
        check("F5-12 URL store tidak valid ditolak (422)", bad_store.status_code == 422, str(bad_store.status_code))
        cleared = await c.patch(
            f"/club/{club['id']}", json={"app_playstore_url": "", "app_appstore_url": ""}, headers=ah
        )
        check(
            "F5-13 store URL dapat dikosongkan kembali (state NOT_CONFIGURED)",
            cleared.status_code == 200
            and not cleared.json()["app_playstore_url"]
            and not cleared.json()["app_appstore_url"],
            cleared.text[:140],
        )

        # ------------------------------------------------------------ matches
        team_id = (await c.post("/teams", json={"club_id": club["id"], "name": "Tim F5"}, headers=ah)).json()["id"]
        today = datetime.now(timezone.utc)
        past = (today - timedelta(days=3)).date().isoformat()
        future = (today + timedelta(days=5)).date().isoformat()
        past_match = await c.post(
            "/matches",
            json={
                "team_id": team_id,
                "opponent": {"name": "Lawan F5"},
                "date": past,
                "time": "16:00",
                "venue": "Lapangan F5",
                "venue_type": "HOME",
                "status": "SCHEDULED",
            },
            headers=ah,
        )
        future_match = await c.post(
            "/matches",
            json={
                "team_id": team_id,
                "opponent": {"name": "Lawan F5"},
                "date": future,
                "time": "16:00",
                "venue": "Lapangan F5",
                "venue_type": "HOME",
                "status": "SCHEDULED",
            },
            headers=ah,
        )
        check(
            "F5-14 admin dapat membuat pertandingan (lewat & mendatang)",
            past_match.status_code == 201 and future_match.status_code == 201,
            f"{past_match.status_code}/{future_match.status_code}",
        )
        result = await c.patch(
            f"/matches/{past_match.json()['id']}",
            json={"status": "FINISHED", "home_score": 3, "away_score": 1},
            headers=ah,
        )
        check(
            "F5-15 Admin dapat menginput hasil pertandingan",
            result.status_code == 200
            and result.json()["home_score"] == 3
            and result.json()["away_score"] == 1
            and result.json()["status"] == "FINISHED",
            result.text[:140],
        )
        listing = await c.get("/matches", params={"limit": 50})
        items = listing.json()["items"]
        upcoming = [
            m
            for m in items
            if m["status"] in ("SCHEDULED", "UPCOMING")
            and m.get("home_score") is None
            and datetime.fromisoformat(f"{m['date']}T{(m.get('time') or '00:00')[:5]}:00+07:00") > today
        ]
        check(
            "F5-16 pertandingan lewat tidak lolos filter Pertandingan Berikutnya (logic homepage)",
            len(upcoming) == 1 and upcoming[0]["date"] == future,
            str([(m["date"], m["status"]) for m in items]),
        )
        card_fields = await c.patch(
            f"/matches/{future_match.json()['id']}",
            json={
                "card_feed_background": "/api/media/feed-f5.jpg",
                "card_story_background": "/api/media/story-f5.jpg",
                "card_feed_focus_y": 30,
                "card_story_zoom": 140,
            },
            headers=ah,
        )
        check(
            "F5-17 background kartu Feed & Story tersimpan terpisah (tidak tertukar)",
            card_fields.status_code == 200
            and card_fields.json()["card_feed_background"] == "/api/media/feed-f5.jpg"
            and card_fields.json()["card_story_background"] == "/api/media/story-f5.jpg"
            and card_fields.json()["card_feed_focus_y"] == 30
            and card_fields.json()["card_story_zoom"] == 140,
            card_fields.text[:180],
        )

        # ------------------------------------------------------------ gallery
        guest_gallery = await c.get("/gallery/public/albums")
        member_gallery = await c.get("/gallery/public/albums", headers=mh)
        check(
            "F5-18 Galeri terkunci untuk Guest & MEMBER (403)",
            guest_gallery.status_code == 403 and member_gallery.status_code == 403,
            f"{guest_gallery.status_code}/{member_gallery.status_code}",
        )

        # --------------------------------------------------------- regresi API
        for path in ("/health", "/club/active", "/players", "/staff", "/matches", "/sponsors", "/content/posts"):
            res = await c.get(path)
            check(f"F5-19 regresi {path} tetap 200", res.status_code == 200, str(res.status_code))

    passed = sum(1 for _, ok_ in results if ok_)
    print(f"\n{passed}/{len(results)} PASS")
    await get_client().drop_database(SANDBOX_DB)
    print(f"sandbox database {SANDBOX_DB} dropped")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
