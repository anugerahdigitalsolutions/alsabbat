"""FASE 15 verification — banners CMS + site_content (sandbox DB, dropped at the end).

Zero production writes: a throwaway database is used and dropped at the end.
Run: cd /app/backend && python /app/scripts/phase15_verify.py
"""
import asyncio
import os
from datetime import date, timedelta

SANDBOX_DB = "alsabbat_phase15_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

results = []


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        login = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        check("A1 admin login", login.status_code == 200, str(login.status_code))
        h = {"Authorization": f"Bearer {login.json()['access_token']}"}

        # ---------------- banners: auth
        unauth = await c.post("/banners", json={"headline_line_1": "X"})
        check("B1 create banner requires auth", unauth.status_code in (401, 403), str(unauth.status_code))

        media = await db[Collections.MEDIA].insert_one(
            {
                "id": "sandbox-media-1",
                "file_name": "hero.jpg",
                "file_type": "IMAGE",
                "mime_type": "image/jpeg",
                "url": "/api/media/files/hero.jpg",
                "status": "ACTIVE",
            }
        )
        check("B2 sandbox media seeded", media.acknowledged)

        b1 = await c.post(
            "/banners",
            json={
                "eyebrow": "ALSABBAT Football Club",
                "headline_line_1": "SATU KLUB.",
                "headline_line_2": "SATU SEMANGAT.",
                "headline_line_3": "SATU ALSABBAT.",
                "meta": "Bersama berjuang.",
                "image_media_id": "sandbox-media-1",
                "cta_label": "Pertandingan",
                "cta_url": "/matches",
                "display_order": 1,
                "status": "ACTIVE",
            },
            headers=h,
        )
        check("B3 create published banner", b1.status_code == 201, b1.text[:120])
        b1_id = b1.json().get("id")

        b2 = await c.post(
            "/banners",
            json={"headline_line_1": "DRAFT BANNER", "display_order": 0, "status": "INACTIVE"},
            headers=h,
        )
        check("B4 create draft banner", b2.status_code == 201, str(b2.status_code))
        b2_id = b2.json().get("id")

        b3 = await c.post(
            "/banners",
            json={
                "headline_line_1": "URL IMAGE",
                "image_url": "https://cdn.example.com/x.jpg",
                "display_order": 2,
                "status": "ACTIVE",
            },
            headers=h,
        )
        b3_id = b3.json().get("id")

        future = (date.today() + timedelta(days=5)).isoformat()
        past = (date.today() - timedelta(days=5)).isoformat()
        b4 = await c.post(
            "/banners",
            json={"headline_line_1": "SCHEDULED FUTURE", "starts_at": future, "display_order": 3, "status": "ACTIVE"},
            headers=h,
        )
        b5 = await c.post(
            "/banners",
            json={"headline_line_1": "EXPIRED", "ends_at": past, "display_order": 4, "status": "ACTIVE"},
            headers=h,
        )
        check("B5 scheduled banners created", b4.status_code == 201 and b5.status_code == 201)

        pub = await c.get("/banners/public")
        items = pub.json()["items"]
        ids = [i["id"] for i in items]
        check("B6 public list only published & live", ids == [b1_id, b3_id], str(len(ids)))
        check("B7 public list sorted by display_order", [i["display_order"] for i in items] == [1, 2])
        check("B8 media library image resolved", items[0]["image_resolved"] == "/api/media/files/hero.jpg", str(items[0]["image_resolved"]))
        check("B9 external url image resolved", items[1]["image_resolved"] == "https://cdn.example.com/x.jpg")
        check("B10 draft excluded from public", b2_id not in ids)
        check("B11 future-scheduled excluded", b4.json()["id"] not in ids)
        check("B12 expired excluded", b5.json()["id"] not in ids)

        prev_unauth = await c.get("/banners/preview")
        check("B13 preview requires permission", prev_unauth.status_code in (401, 403), str(prev_unauth.status_code))
        prev = await c.get("/banners/preview", headers=h)
        check("B14 preview includes drafts", prev.status_code == 200 and b2_id in [i["id"] for i in prev.json()["items"]])
        check("B15 preview resolves images", any(i.get("image_resolved") for i in prev.json()["items"]))

        patched = await c.patch(f"/banners/{b2_id}", json={"status": "ACTIVE", "display_order": 5}, headers=h)
        check("B16 publish draft via PATCH", patched.status_code == 200 and patched.json()["status"] == "ACTIVE")
        ids2 = [i["id"] for i in (await c.get("/banners/public")).json()["items"]]
        check("B17 published draft now public", b2_id in ids2 and ids2[-1] == b2_id, str(ids2))

        bad = await c.post("/banners", json={"headline_line_1": "X", "display_order": -1}, headers=h)
        check("B18 invalid display_order rejected", bad.status_code == 422, str(bad.status_code))

        deleted = await c.delete(f"/banners/{b3_id}", headers=h)
        check("B19 delete banner", deleted.status_code == 200)
        check("B20 deleted banner gone from public", b3_id not in [i["id"] for i in (await c.get("/banners/public")).json()["items"]])

        # ---------------- site content
        sc_unauth = await c.put("/site-content/bulk", json={"items": [{"key": "home.cta.title", "value": "X"}]})
        check("S1 bulk upsert requires auth", sc_unauth.status_code in (401, 403), str(sc_unauth.status_code))

        payload = {
            "items": [
                {"key": "home.cta.title", "value": "Gabung Baraya ALSABBAT", "label": "CTA — Judul", "group": "CTA Penutup"},
                {"key": "home.pillar.club.title", "value": "Satu Klub Saja", "label": "Pilar 1", "group": "Pilar Brand"},
                {"key": "home.label.news", "value": "", "label": "Label — Berita", "group": "Judul Section"},
            ]
        }
        bulk = await c.put("/site-content/bulk", json=payload, headers=h)
        check("S2 bulk upsert saved", bulk.status_code == 200 and bulk.json()["saved"] == 2, bulk.text[:120])

        pubsc = await c.get("/site-content/public")
        values = pubsc.json()["items"]
        check("S3 public map returns saved values", values.get("home.cta.title") == "Gabung Baraya ALSABBAT")
        check("S4 empty value not stored (frontend default applies)", "home.label.news" not in values, str(list(values)))

        again = await c.put(
            "/site-content/bulk",
            json={"items": [{"key": "home.cta.title", "value": "Diperbarui", "group": "CTA Penutup"}]},
            headers=h,
        )
        check("S5 upsert is idempotent (no duplicate key rows)", again.status_code == 200
              and await db[Collections.SITE_CONTENT].count_documents({"key": "home.cta.title"}) == 1)
        check("S6 value updated", (await c.get("/site-content/public")).json()["items"]["home.cta.title"] == "Diperbarui")

        clear = await c.put("/site-content/bulk", json={"items": [{"key": "home.cta.title", "value": ""}]}, headers=h)
        check("S7 clearing a key removes it (fallback to default)", clear.status_code == 200
              and clear.json()["removed"] == 1
              and "home.cta.title" not in (await c.get("/site-content/public")).json()["items"])

        badkey = await c.put("/site-content/bulk", json={"items": [{"key": "Home Hero!", "value": "x"}]}, headers=h)
        check("S8 invalid key rejected", badkey.status_code == 422, str(badkey.status_code))

        dup1 = await c.post("/site-content", json={"key": "home.hero.line1", "value": "A"}, headers=h)
        dup2 = await c.post("/site-content", json={"key": "home.hero.line1", "value": "B"}, headers=h)
        check("S9 duplicate key conflict", dup1.status_code == 201 and dup2.status_code == 409, f"{dup1.status_code}/{dup2.status_code}")

        check("S10 crud list readable", (await c.get("/site-content", params={"limit": 200})).status_code == 200)

        # ---------------- regressions
        for path in ("/health", "/club", "/matches", "/content/posts", "/players", "/merchandise/products"):
            r = await c.get(path)
            check(f"R {path} still 200", r.status_code == 200, str(r.status_code))

    await get_client().drop_database(SANDBOX_DB)
    dropped = SANDBOX_DB not in await get_client().list_database_names()
    check("Z sandbox database dropped", dropped)

    passed = sum(1 for _, ok in results if ok)
    print(f"\n{passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
