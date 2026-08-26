"""FASE 19 verification — Content Readiness dashboard & workflow (sandbox DB, dropped).

Menolak berjalan bila DB_NAME bukan database sandbox.
Run: cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase19_verify.py
"""
import asyncio
import os

SANDBOX_DB = "alsabbat_phase19_sandbox"
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


def cat(payload, cid):
    return next(c for c in payload["categories"] if c["id"] == cid)


async def main():
    # Guard: never run against production
    if settings.DB_NAME != SANDBOX_DB or "sandbox" not in settings.DB_NAME:
        raise SystemExit(f"REFUSED: database bukan sandbox ({settings.DB_NAME})")

    await ensure_indexes()
    await run_bootstrap()
    db = get_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        h = {"Authorization": f"Bearer {admin.json()['access_token']}"}

        r = await c.get("/readiness/content", headers=h)
        check("P19-01 dashboard readiness dapat diambil", r.status_code == 200, str(r.status_code))
        base = r.json()
        check("P19-13/14 endpoint butuh RBAC (unauth 401)", (await c.get("/readiness/content")).status_code in (401, 403))
        check("P19-02a database kosong → status BELUM DIISI, bukan contoh data",
              cat(base, "players")["status"] == "BELUM DIISI" and cat(base, "players")["counts"]["total"] == 0)
        check("P19-03a persen konsisten dengan done/total",
              all(c_["percent"] == round(c_["done"] / c_["total"] * 100) for c_ in base["categories"] if c_["total"]))
        check("P19-03b overall konsisten",
              base["overall"]["done"] == sum(c_["done"] for c_ in base["categories"])
              and base["overall"]["total"] == sum(c_["total"] for c_ in base["categories"]))
        check("P19-04 setiap kategori punya route admin existing",
              all(c_["route"].startswith("/admin/") for c_ in base["categories"]), str(len(base["categories"])))

        counts_before = {name: await db[name].count_documents({}) for name in
                         ["players", "staff", "matches", "posts", "products", "banners", "site_content", "customers"]}
        await c.get("/readiness/content", headers=h)
        counts_after = {name: await db[name].count_documents({}) for name in counts_before}
        check("P19-05 membuka dashboard/checklist tidak membuat data baru", counts_before == counts_after, str(counts_after))

        # isi data nyata (sandbox) lalu pastikan status berubah
        club = (await c.get("/club")).json()["items"][0]
        await c.patch(
            f"/club/{club['id']}",
            json={
                "description": "Deskripsi sandbox", "story": "Cerita sandbox", "location": "Bandung",
                "stadium": "Markas sandbox", "logo": "/api/media/files/logo.jpg", "hero_image": "/api/media/files/hero.jpg",
                "contact": {"email": "sandbox@sandbox-alsabbat.dev", "phone": "+628123456789", "whatsapp": "+628123456789", "address": "Alamat"},
                "social_media": {"instagram": "https://instagram.com/sandbox"},
            },
            headers=h,
        )
        teams = (await c.get("/teams")).json()["items"]
        team_id = teams[0]["id"] if teams else (await c.post("/teams", json={"club_id": club["id"], "name": "ALSABBAT"}, headers=h)).json()["id"]
        await c.post("/players", json={"team_id": team_id, "full_name": "Pemain Sandbox", "jersey_number": 7,
                                       "position": "FORWARD", "photo": "/api/media/files/p.jpg", "status": "ACTIVE"}, headers=h)
        await c.post("/staff", json={"team_id": team_id, "name": "Staf Sandbox", "role": "HEAD_COACH",
                                     "photo": "/api/media/files/s.jpg", "status": "ACTIVE"}, headers=h)
        after = (await c.get("/readiness/content", headers=h)).json()
        check("P19-02b status naik setelah data nyata diisi (Profil Klub SIAP)", cat(after, "club_profile")["status"] == "SIAP",
              str(cat(after, "club_profile")))
        check("P19-02c Foto Utama Klub & Kontak menjadi SIAP",
              cat(after, "club_hero")["status"] == "SIAP" and cat(after, "club_contact")["status"] == "SIAP")
        check("P19-02d Skuad & Staf mengikuti data nyata",
              cat(after, "players")["status"] == "SIAP" and cat(after, "staff")["status"] == "SIAP",
              f'{cat(after, "players")["percent"]}/{cat(after, "staff")["percent"]}')
        check("P19-02e kategori tanpa data tetap BELUM DIISI (tidak dikarang)",
              cat(after, "matches")["status"] == "BELUM DIISI" and cat(after, "merchandise")["status"] == "BELUM DIISI")
        check("P19-03c overall naik", after["overall"]["percent"] > base["overall"]["percent"],
              f'{base["overall"]["percent"]}% → {after["overall"]["percent"]}%')

        # P19-06..09 fitur fase sebelumnya tetap bekerja
        media = await c.post("/media", json={"file_name": "x.jpg", "file_type": "IMAGE", "mime_type": "image/jpeg",
                                             "url": "/api/media/files/x.jpg"}, headers=h)
        check("P19-06 Media Library tetap bekerja", media.status_code == 201 and (await c.get("/media")).status_code == 200)
        banner = await c.post("/banners", json={"headline_line_1": "SANDBOX", "status": "ACTIVE",
                                               "image_media_id": media.json()["id"]}, headers=h)
        pub_banner = (await c.get("/banners/public")).json()
        check("P19-07 Banner Hero tetap bekerja (+resolusi gambar)",
              banner.status_code == 201 and pub_banner["total"] == 1
              and pub_banner["items"][0]["image_resolved"] == "/api/media/files/x.jpg")
        sc = await c.put("/site-content/bulk", json={"items": [{"key": "home.hero.line1", "value": "SANDBOX"}]}, headers=h)
        check("P19-08 site_content tetap bekerja",
              sc.status_code == 200 and (await c.get("/site-content/public")).json()["items"]["home.hero.line1"] == "SANDBOX")
        bg = await c.put("/site-content/bulk", json={"items": [{"key": "member.card.background_url", "value": "/api/media/files/x.jpg"}]}, headers=h)
        ready_bg = (await c.get("/readiness/content", headers=h)).json()
        check("P19-09 latar Kartu Member tetap bekerja & terbaca dashboard",
              bg.status_code == 200 and cat(ready_bg, "member_card")["status"] == "SIAP")
        check("P19-09b Banner & Konten Homepage terbaca dashboard",
              cat(ready_bg, "banners")["percent"] == 100 and cat(ready_bg, "home_content")["done"] >= 1)

        # P19-11 tidak ada ticketing
        ticket_routes = [route.path for route in app.routes if "ticket" in route.path.lower() or "seat" in route.path.lower()]
        check("P19-11 tidak ada endpoint ticketing/seat", ticket_routes == [], str(ticket_routes))
        standings = [route.path for route in app.routes if "standing" in route.path.lower() or "klasemen" in route.path.lower()]
        check("P19-16 tidak ada endpoint klasemen", standings == [], str(standings))

        # regresi cepat
        for path in ("/health", "/club", "/players", "/staff", "/matches", "/content/posts", "/gallery/public/albums",
                     "/merchandise/products", "/sponsors", "/banners/public", "/site-content/public"):
            rr = await c.get(path)
            check(f"R {path} still 200", rr.status_code == 200, str(rr.status_code))

        check("P19-12 tidak ada flag demo/test di data sandbox",
              await db[Collections.PLAYERS].count_documents({"demo": True}) == 0)

    await get_client().drop_database(SANDBOX_DB)
    check("Z sandbox database dropped", SANDBOX_DB not in await get_client().list_database_names())

    passed = sum(1 for _, ok in results if ok)
    print(f"\n{passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
