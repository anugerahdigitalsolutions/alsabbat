"""FASE 4B verification — satu akun Baraya dengan profil PEMAIN + STAFF terpisah.

Sandbox database only (dropped at the end). Zero production writes.
Run:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase4b_verify.py
"""
import asyncio
import os
import re

SANDBOX_DB = "alsabbat_phase4b_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402
from app.services.mailer import get_mailer  # noqa: E402

results = []
EMAIL = "fase4b@sandbox-alsabbat.dev"
PASSWORD = "Sandbox123"
PLAYER_PHOTO = "/api/media/foto-pemain-sandbox.jpg"
STAFF_PHOTO = "/api/media/foto-staf-sandbox.jpg"


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


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

        await c.post(
            "/baraya/register",
            json={
                "full_name": "Uji Fase 4B",
                "email": EMAIL,
                "phone": "+628123456702",
                "password": PASSWORD,
                "password_confirmation": PASSWORD,
            },
        )
        code = re.search(
            r"Kode verifikasi: (\d{6})", [m for m in mailer.outbox if m.to == EMAIL][-1].text
        ).group(1)
        verify = await c.post("/baraya/otp/verify", json={"email": EMAIL, "code": code})
        mh = {"Authorization": f"Bearer {verify.json()['access_token']}"}
        customer_id = verify.json()["customer"]["id"]

        access = await c.get("/baraya/access", headers=mh)
        check(
            "F4B-01 MEMBER: boleh ajukan Pemain, TIDAK boleh ajukan Staf",
            access.json()["can_apply_player"] is True and access.json()["can_apply_staff"] is False,
            access.text[:120],
        )

        staff_base = {
            "type": "STAFF",
            "full_name": "Uji Fase 4B",
            "phone": "+628123456702",
            "motivation": "Ingin membantu tim sebagai staf klub.",
            "staff_data": {"name": "Uji Fase 4B", "role": "TEAM_MANAGER", "photo": STAFF_PHOTO},
        }
        early = await c.post("/baraya/applications", json=staff_base, headers=mh)
        check("F4B-02 MEMBER tidak dapat langsung mengajukan Staf (403)", early.status_code == 403, early.text[:120])
        guest_staff = await c.post("/baraya/applications", json=staff_base)
        check("F4B-03 Guest tidak dapat mengajukan Staf (401)", guest_staff.status_code == 401)
        no_data = await c.post(
            "/baraya/applications",
            json={k: v for k, v in staff_base.items() if k != "staff_data"},
            headers=mh,
        )
        check("F4B-04 pengajuan Staf tanpa data staf ditolak (422)", no_data.status_code == 422)

        # --- MEMBER -> PEMAIN (alur Fase 4A tetap)
        club = await db[Collections.CLUBS].find_one({})
        team_id = (await c.post("/teams", json={"club_id": club["id"], "name": "Tim 4B"}, headers=ah)).json()["id"]
        player_id = (
            await c.post(
                "/players",
                json={"team_id": team_id, "full_name": "Slot Pemain", "position": "DEFENDER", "status": "ACTIVE"},
                headers=ah,
            )
        ).json()["id"]
        staff_id = (
            await c.post(
                "/staff",
                json={"team_id": team_id, "name": "Slot Staf", "role": "ANALYST", "status": "ACTIVE"},
                headers=ah,
            )
        ).json()["id"]

        player_app = await c.post(
            "/baraya/applications",
            json={
                "type": "PEMAIN",
                "full_name": "Uji Fase 4B",
                "phone": "+628123456702",
                "motivation": "Ingin bermain untuk AL SABBAT.",
                "player_data": {
                    "full_name": "Uji Fase 4B",
                    "position": "FORWARD",
                    "jersey_number": 9,
                    "photo": PLAYER_PHOTO,
                },
            },
            headers=mh,
        )
        approve_player = await c.patch(
            f"/baraya/admin/applications/{player_app.json()['id']}",
            json={"decision": "APPROVED", "player_id": player_id},
            headers=ah,
        )
        cust = await db[Collections.CUSTOMERS].find_one({"id": customer_id})
        check(
            "F4B-05 MEMBER → PEMAIN (role & roles konsisten)",
            approve_player.status_code == 200
            and cust["role"] == "PEMAIN"
            and cust["roles"] == ["PEMAIN"]
            and cust["player_id"] == player_id,
            str({k: cust.get(k) for k in ("role", "roles", "player_id")}),
        )

        access2 = await c.get("/baraya/access", headers=mh)
        check(
            "F4B-06 PEMAIN: boleh ajukan Staf, tidak boleh ajukan Pemain lagi",
            access2.json()["can_apply_staff"] is True and access2.json()["can_apply_player"] is False,
        )

        # --- PEMAIN -> STAFF
        staff_app = await c.post("/baraya/applications", json=staff_base, headers=mh)
        staff_app_id = staff_app.json().get("id")
        check(
            "F4B-07 PEMAIN dapat mengajukan Staf dengan form Staf (field StaffBase)",
            staff_app.status_code == 201
            and staff_app.json()["staff_data"]["role"] == "TEAM_MANAGER"
            and staff_app.json()["player_data"] is None,
            staff_app.text[:160],
        )
        bad_role = await c.post(
            "/baraya/applications",
            json={**staff_base, "staff_data": {"name": "X", "role": "PRESIDEN"}},
            headers=mh,
        )
        check("F4B-08 role staf di luar enum existing ditolak (422/409)", bad_role.status_code in (409, 422))

        edit = await c.patch(
            f"/baraya/admin/applications/{staff_app_id}/data",
            json={"staff_data": {"name": "Uji Fase 4B", "role": "ASSISTANT_COACH", "role_label": "Asisten Pelatih"}},
            headers=ah,
        )
        check(
            "F4B-09 Admin dapat melengkapi data Staf (foto tetap tersimpan)",
            edit.status_code == 200
            and edit.json()["staff_data"]["role"] == "ASSISTANT_COACH"
            and edit.json()["staff_data"]["photo"] == STAFF_PHOTO,
            edit.text[:160],
        )
        no_link = await c.patch(
            f"/baraya/admin/applications/{staff_app_id}", json={"decision": "APPROVED"}, headers=ah
        )
        check("F4B-10 approve Staf tanpa record Staf existing ditolak (422)", no_link.status_code == 422)

        before_staff = await db[Collections.STAFF].count_documents({})
        before_players = await db[Collections.PLAYERS].count_documents({})
        approve_staff = await c.patch(
            f"/baraya/admin/applications/{staff_app_id}",
            json={"decision": "APPROVED", "staff_id": staff_id},
            headers=ah,
        )
        cust2 = await db[Collections.CUSTOMERS].find_one({"id": customer_id})
        check(
            "F4B-11 satu akun kini PEMAIN + STAFF (status Pemain tidak hilang)",
            approve_staff.status_code == 200
            and set(cust2["roles"]) == {"PEMAIN", "STAFF"}
            and cust2["player_id"] == player_id
            and cust2["staff_id"] == staff_id,
            str({k: cust2.get(k) for k in ("role", "roles", "player_id", "staff_id")}),
        )
        check(
            "F4B-12 tidak ada duplikat record Pemain/Staf",
            before_players == await db[Collections.PLAYERS].count_documents({}) == 1
            and before_staff == await db[Collections.STAFF].count_documents({}) == 1,
        )

        player_doc = await db[Collections.PLAYERS].find_one({"id": player_id})
        staff_doc = await db[Collections.STAFF].find_one({"id": staff_id})
        check(
            "F4B-13 data Pemain & Staf tersimpan terpisah (nama/role masing-masing)",
            player_doc["position"] == "FORWARD"
            and player_doc["jersey_number"] == 9
            and staff_doc["role"] == "ASSISTANT_COACH"
            and staff_doc["role_label"] == "Asisten Pelatih",
            str((player_doc.get("position"), staff_doc.get("role"))),
        )
        check(
            "F4B-14 FOTO Pemain & Staf terpisah (tidak saling menimpa)",
            player_doc["photo"] == PLAYER_PHOTO and staff_doc["photo"] == STAFF_PHOTO,
            f"{player_doc.get('photo')} | {staff_doc.get('photo')}",
        )

        card = await c.get("/baraya/member-card", headers=mh)
        check(
            "F4B-15 kartu member membawa kedua profil",
            card.status_code == 200 and set(card.json()["roles"]) == {"PEMAIN", "STAFF"},
            card.text[:140],
        )
        again = await c.post("/baraya/applications", json=staff_base, headers=mh)
        check("F4B-16 STAFF tidak perlu/ tidak bisa mengajukan Staf lagi (403)", again.status_code == 403)

        gallery = await c.get("/gallery/public/albums", headers=mh)
        check("F4B-17 akses Galeri tetap terbuka untuk profil ganda", gallery.status_code == 200)

        players_public = await c.get("/players")
        staff_public = await c.get("/staff")
        check(
            "F4B-18 website menampilkan Pemain & Staf sebagai entitas terpisah",
            players_public.status_code == 200
            and staff_public.status_code == 200
            and players_public.json()["total"] == 1
            and staff_public.json()["total"] == 1
            and PLAYER_PHOTO in players_public.text
            and STAFF_PHOTO in staff_public.text,
        )

        # akun lama tanpa field `roles` tetap berfungsi (backward compatible)
        await db[Collections.CUSTOMERS].update_one(
            {"id": customer_id}, {"$unset": {"roles": ""}, "$set": {"role": "PEMAIN"}}
        )
        legacy = await c.get("/baraya/access", headers=mh)
        legacy_gallery = await c.get("/gallery/public/albums", headers=mh)
        check(
            "F4B-19 akun lama tanpa field roles tetap valid (backward-compatible)",
            legacy.json()["roles"] == ["PEMAIN"] and legacy_gallery.status_code == 200,
            legacy.text[:120],
        )

        for path in ("/health", "/club/active", "/players", "/staff", "/matches", "/sponsors"):
            res = await c.get(path)
            check(f"F4B-20 regresi {path} tetap 200", res.status_code == 200, str(res.status_code))

    passed = sum(1 for _, ok_ in results if ok_)
    print(f"\n{passed}/{len(results)} PASS")
    await get_client().drop_database(SANDBOX_DB)
    print(f"sandbox database {SANDBOX_DB} dropped")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
