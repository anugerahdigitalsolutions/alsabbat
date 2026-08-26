"""FASE 16 verification — club content, squad data, contact & media flow (sandbox DB, dropped).

Zero production writes: throwaway database, dropped at the end.
Run: cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase16_verify.py
"""
import asyncio
import os

SANDBOX_DB = "alsabbat_phase16_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import ensure_indexes, get_client, get_db  # noqa: E402
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
        check("V1 admin login", login.status_code == 200, str(login.status_code))
        h = {"Authorization": f"Bearer {login.json()['access_token']}"}

        # ---------------- club profile (single source of truth)
        club = (await c.get("/club")).json()["items"][0]
        club_id = club["id"]
        media = await c.post(
            "/media",
            json={
                "file_name": "klub-hero.jpg",
                "file_type": "IMAGE",
                "mime_type": "image/jpeg",
                "url": "/api/media/files/klub-hero.jpg",
            },
            headers=h,
        )
        check("V2 media library entry created", media.status_code == 201, str(media.status_code))
        media_url = media.json()["url"]

        patch = await c.patch(
            f"/club/{club_id}",
            json={
                "description": "Profil singkat sandbox.",
                "story": "Cerita klub sandbox.\nBaris kedua.",
                "hero_image": media_url,
                "logo": media_url,
                "location": "Lokasi Sandbox",
                "stadium": "Markas Sandbox",
                "contact": {"email": "sandbox@example.test", "phone": "+62800000000", "whatsapp": "+62800000000", "address": "Alamat Sandbox"},
                "social_media": {"instagram": "https://instagram.com/sandbox"},
            },
            headers=h,
        )
        check("V3 club profile updated (story + hero_image additive)", patch.status_code == 200, patch.text[:120])

        public_club = (await c.get("/club")).json()["items"][0]
        check("V4 story persisted & public", public_club.get("story", "").startswith("Cerita klub sandbox"))
        check("V5 hero_image persisted & public", public_club.get("hero_image") == media_url)
        check("V6 logo from Media Library", public_club.get("logo") == media_url)
        check("V7 contact fields public (single source)", public_club["contact"]["email"] == "sandbox@example.test"
              and public_club["contact"]["address"] == "Alamat Sandbox")
        check("V8 stadium/location public", public_club["stadium"] == "Markas Sandbox" and public_club["location"] == "Lokasi Sandbox")

        unauth = await c.patch(f"/club/{club_id}", json={"description": "hack"})
        check("V9 club write requires auth", unauth.status_code in (401, 403), str(unauth.status_code))

        # ---------------- squad: players & staff
        team = (await c.get("/teams")).json()["items"]
        if not team:
            created_team = await c.post("/teams", json={"club_id": club_id, "name": "ALSABBAT"}, headers=h)
            team_id = created_team.json()["id"]
        else:
            team_id = team[0]["id"]

        p1 = await c.post(
            "/players",
            json={
                "team_id": team_id,
                "full_name": "Pemain Sandbox",
                "jersey_number": 9,
                "position": "FORWARD",
                "photo": media_url,
                "bio": "Bio sandbox.",
                "status": "ACTIVE",
            },
            headers=h,
        )
        check("V10 create player (photo from Media Library)", p1.status_code == 201, p1.text[:120])
        p1_id = p1.json()["id"]

        p2 = await c.post(
            "/players",
            json={"team_id": team_id, "full_name": "Pemain Nonaktif", "position": "DEFENDER", "status": "INACTIVE"},
            headers=h,
        )
        check("V11 create inactive player", p2.status_code == 201)

        active = (await c.get("/players", params={"status": "ACTIVE"})).json()["items"]
        check("V12 public squad shows only ACTIVE players", [i["id"] for i in active] == [p1_id], str(len(active)))
        check("V13 player photo & bio flow to public", active[0]["photo"] == media_url and active[0]["bio"] == "Bio sandbox.")

        edited = await c.patch(f"/players/{p1_id}", json={"jersey_number": 10, "display_name": "P. Sandbox"}, headers=h)
        check("V14 edit player persists", edited.status_code == 200 and edited.json()["jersey_number"] == 10)

        s1 = await c.post(
            "/staff",
            json={
                "team_id": team_id,
                "name": "Pelatih Sandbox",
                "role": "HEAD_COACH",
                "role_label": "Kepala Pelatih",
                "photo": media_url,
                "bio": "Bio staf.",
                "status": "ACTIVE",
            },
            headers=h,
        )
        check("V15 create staff (photo + role_label)", s1.status_code == 201, s1.text[:120])
        s2 = await c.post(
            "/staff",
            json={"team_id": team_id, "name": "Staf Nonaktif", "role": "HEAD_COACH", "status": "INACTIVE"},
            headers=h,
        )
        staff_active = (await c.get("/staff", params={"status": "ACTIVE"})).json()["items"]
        check("V16 public squad shows only ACTIVE staff", s2.status_code == 201 and len(staff_active) == 1)
        check("V17 staff photo/role_label public", staff_active[0]["photo"] == media_url
              and staff_active[0]["role_label"] == "Kepala Pelatih")

        check("V18 player write requires auth", (await c.post("/players", json={"team_id": team_id, "full_name": "X"})).status_code in (401, 403))
        check("V19 staff write requires auth", (await c.post("/staff", json={"team_id": team_id, "name": "X"})).status_code in (401, 403))

        # ---------------- achievements on club page
        ach = await c.post("/achievements", json={"title": "Juara Sandbox", "year": 2026, "status": "ACTIVE"}, headers=h)
        ach_inactive = await c.post("/achievements", json={"title": "Nonaktif", "status": "INACTIVE"}, headers=h)
        pub_ach = (await c.get("/achievements", params={"status": "ACTIVE"})).json()["items"]
        check("V20 achievements feed club honours (ACTIVE only)",
              ach.status_code == 201 and ach_inactive.status_code == 201 and len(pub_ach) == 1, str(len(pub_ach)))

        # ---------------- editorial copy for Club / Squad / Contact
        keys = {
            "club.header.title": "Inilah Klub Sandbox",
            "club.squad.text": "Satu klub, satu tim.",
            "squad.header.title": "Skuad Sandbox",
            "contact.header.title": "Hubungi Sandbox",
        }
        bulk = await c.put(
            "/site-content/bulk",
            json={"items": [{"key": k, "value": v, "group": "Fase16"} for k, v in keys.items()]},
            headers=h,
        )
        check("V21 club/squad/contact copy saved via existing site_content", bulk.status_code == 200 and bulk.json()["saved"] == 4)
        pubmap = (await c.get("/site-content/public")).json()["items"]
        check("V22 copy readable publicly", all(pubmap.get(k) == v for k, v in keys.items()))
        cleared = await c.put("/site-content/bulk", json={"items": [{"key": "club.header.title", "value": ""}]}, headers=h)
        check("V23 clearing copy falls back to code default",
              cleared.json()["removed"] == 1 and "club.header.title" not in (await c.get("/site-content/public")).json()["items"])
        check("V24 site content write requires auth",
              (await c.put("/site-content/bulk", json={"items": [{"key": "club.header.title", "value": "x"}]})).status_code in (401, 403))

        # ---------------- persistence after "refresh" (fresh read)
        again = (await c.get("/club")).json()["items"][0]
        check("V25 data still present on re-read (persisted in MongoDB)",
              again.get("story", "").startswith("Cerita klub sandbox") and again.get("hero_image") == media_url)

        # ---------------- regressions
        for path in ("/health", "/matches", "/content/posts", "/gallery/public/albums", "/merchandise/products", "/sponsors", "/banners/public"):
            r = await c.get(path)
            check(f"R {path} still 200", r.status_code == 200, str(r.status_code))

        check("V26 single-team data (exactly one team)", await db["teams"].count_documents({}) == 1)

    await get_client().drop_database(SANDBOX_DB)
    check("Z sandbox database dropped", SANDBOX_DB not in await get_client().list_database_names())

    passed = sum(1 for _, ok in results if ok)
    print(f"\n{passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
