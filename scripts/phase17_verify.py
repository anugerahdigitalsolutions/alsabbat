"""FASE 17 verification — Baraya member card & member management (sandbox DB, dropped).

Zero production writes. Run:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase17_verify.py
"""
import asyncio
import os

SANDBOX_DB = "alsabbat_phase17_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402

results = []
SENSITIVE = {"password", "password_hash", "token", "access_token", "jti", "session", "email"}


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
        # ---- two sandbox customers
        async def register(email, name):
            return await c.post(
                "/baraya/register",
                json={
                    "full_name": name,
                    "email": email,
                    "phone": "+628123456789",
                    "password": "Sandbox123",
                    "password_confirmation": "Sandbox123",
                },
            )

        ra = await register("a.sandbox@sandbox-alsabbat.dev", "Baraya Sandbox A")
        rb = await register("b.sandbox@sandbox-alsabbat.dev", "Baraya Sandbox B")
        check("M1 customer A registered with member number", ra.status_code == 201 and ra.json()["customer"]["member_number"], ra.text[:120])
        check("M2 customer B has a different member number",
              rb.status_code == 201 and rb.json()["customer"]["member_number"] != ra.json()["customer"]["member_number"],
              f'{ra.json()["customer"]["member_number"]} vs {rb.json()["customer"]["member_number"]}')
        num_a = ra.json()["customer"]["member_number"]
        num_b = rb.json()["customer"]["member_number"]
        check("M3a member number format ALS-000001", num_a == "ALS-000001" and num_b == "ALS-000002", f"{num_a}/{num_b}")
        check("M3b member number & code unique index",
              await db[Collections.CUSTOMERS].count_documents({"member_number": num_a}) == 1
              and len({ra.json()["customer"]["member_code"], rb.json()["customer"]["member_code"]}) == 2)

        # Fase 3: akun baru harus terverifikasi email sebelum bisa login.
        await get_db()["customers"].update_many({}, {"$set": {"email_verified": True}})
        async def login(email):
            r = await c.post("/baraya/login", json={"email": email, "password": "Sandbox123"})
            return r.json()["access_token"]

        ha = {"Authorization": f"Bearer {await login('a.sandbox@sandbox-alsabbat.dev')}"}
        hb = {"Authorization": f"Bearer {await login('b.sandbox@sandbox-alsabbat.dev')}"}

        card_a = await c.get("/baraya/member-card", headers=ha)
        check("M4 customer A sees own card", card_a.status_code == 200 and card_a.json()["member_number"] == num_a)
        code_a = card_a.json()["member_code"]
        card_b = await c.get("/baraya/member-card", headers=hb)
        check("M5a card endpoint is always self-scoped (B gets B, never A)",
              card_b.json()["member_number"] == num_b and card_b.json()["member_code"] != code_a)
        check("M5b no endpoint exposes another member's card to a customer",
              (await c.get(f"/baraya/admin/{ra.json()['customer']['id']}/member-card", headers=hb)).status_code in (401, 403))
        check("M5c unauthenticated cannot read a card", (await c.get("/baraya/member-card")).status_code in (401, 403))

        verify = await c.get(f"/member/verify/{code_a}")
        vjson = verify.json()
        check("M6 QR verification resolves member A", verify.status_code == 200 and vjson["valid"] and vjson["member_number"] == num_a)
        check("M7a verification payload has no sensitive keys",
              not (set(vjson.keys()) & SENSITIVE), str(list(vjson.keys())))
        check("M7b verification does not leak email/phone/orders",
              "a.sandbox@sandbox-alsabbat.dev" not in verify.text and "+628123456789" not in verify.text)
        check("M7c member_number cannot be used as identifier (no enumeration)",
              (await c.get(f"/member/verify/{num_a}")).json()["found"] is False)
        check("M7d unknown identifier returns found=false", (await c.get("/member/verify/tidakadaidentifier")).json()["found"] is False)

        # ---- admin console
        admin_login = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        check("M14 admin auth still works", admin_login.status_code == 200, str(admin_login.status_code))
        hadm = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        adm_list = await c.get("/baraya/admin/list", headers=hadm)
        check("M12a admin lists members with number & status",
              adm_list.status_code == 200 and all(i.get("member_number") for i in adm_list.json()["items"]))
        check("M12b admin list never exposes password hash", "password_hash" not in adm_list.text)
        check("M12c admin search works", len((await c.get("/baraya/admin/list", params={"q": "Sandbox A"}, headers=hadm)).json()["items"]) == 1)
        adm_card = await c.get(f"/baraya/admin/{ra.json()['customer']['id']}/member-card", headers=hadm)
        check("M12d admin card preview (no credentials)",
              adm_card.status_code == 200 and adm_card.json()["member_number"] == num_a and "password" not in adm_card.text)
        check("M12e admin endpoints require RBAC", (await c.get("/baraya/admin/list")).status_code in (401, 403))

        # ---- membership status
        deact = await c.patch(f"/baraya/admin/{rb.json()['customer']['id']}/status", json={"status": "INACTIVE"}, headers=hadm)
        code_b = card_b.json()["member_code"]
        vb = (await c.get(f"/member/verify/{code_b}")).json()
        check("M8 inactive member verifies as INACTIVE",
              deact.status_code == 200 and vb["found"] and vb["valid"] is False and vb["status"] == "INACTIVE")
        check("M8b inactive account not deleted", await db[Collections.CUSTOMERS].count_documents({"id": rb.json()["customer"]["id"]}) == 1)
        check("M8c inactive account cannot login", (await c.post("/baraya/login", json={"email": "b.sandbox@sandbox-alsabbat.dev", "password": "Sandbox123"})).status_code == 401)

        # ---- profile changes reflect on the card, member number is immutable
        photo = await c.patch("/baraya/me", json={"photo_url": "https://example.test/foto.jpg"}, headers=ha)
        card2 = (await c.get("/baraya/member-card", headers=ha)).json()
        check("M9 changing photo updates the card", photo.status_code == 200 and card2["photo_url"] == "https://example.test/foto.jpg")
        rename = await c.patch("/baraya/me", json={"full_name": "Baraya Sandbox Alfa"}, headers=ha)
        card3 = (await c.get("/baraya/member-card", headers=ha)).json()
        check("M10 changing name updates the card", rename.status_code == 200 and card3["full_name"] == "Baraya Sandbox Alfa")
        check("M11 member number unchanged after profile edits", card3["member_number"] == num_a)
        hack = await c.patch(
            "/baraya/me",
            json={"member_number": "ALS-999999", "member_code": "curang", "status": "ACTIVE", "id": "x"},
            headers=ha,
        )
        after = (await c.get("/baraya/member-card", headers=ha)).json()
        check("M11b customer cannot self-assign member number/status/code",
              after["member_number"] == num_a and after["member_code"] == code_a and after["status"] == "ACTIVE",
              str(hack.status_code))
        bad_photo = await c.patch("/baraya/me", json={"photo_url": "javascript:alert(1)"}, headers=ha)
        check("M11c unsafe photo url rejected", bad_photo.status_code == 422, str(bad_photo.status_code))

        # ---- merchandise flow still intact for a member
        product = await c.post(
            "/merchandise/catalog/products",
            json={"name": "Jersey Sandbox", "price": 250000, "stock_quantity": 5, "status": "ACTIVE"},
            headers=hadm,
        )
        check("M13a product created (admin)", product.status_code == 201, product.text[:160])
        order = await c.post(
            "/merchandise/checkout",
            json={
                "items": [{"product_id": product.json()["id"], "quantity": 1}],
                "customer": {"name": "Baraya Sandbox Alfa", "email": "a.sandbox@sandbox-alsabbat.dev", "phone": "+628123456789"},
                "shipping": {"recipient": "Baraya Sandbox Alfa", "address": "Alamat sandbox 123", "city": "Bandung", "province": "Jawa Barat", "postal_code": "40123"},
            },
            headers=ha,
        )
        check("M13b member checkout works (payment logic untouched)", order.status_code in (200, 201), order.text[:160])
        my_orders = await c.get("/baraya/orders", headers=ha)
        check("M13c member order history works", my_orders.status_code == 200 and my_orders.json()["total"] >= 1)
        check("M15 baraya auth still isolated (admin token rejected on /baraya/me)",
              (await c.get("/baraya/me", headers=hadm)).status_code in (401, 403))
        check("M15b baraya token rejected on admin endpoint", (await c.get("/users", headers=ha)).status_code in (401, 403))

        # ---- regressions
        for path in ("/health", "/club", "/players", "/banners/public", "/site-content/public", "/merchandise/products"):
            r = await c.get(path)
            check(f"R {path} still 200", r.status_code == 200, str(r.status_code))

    await get_client().drop_database(SANDBOX_DB)
    check("Z sandbox database dropped", SANDBOX_DB not in await get_client().list_database_names())

    passed = sum(1 for _, ok in results if ok)
    print(f"\n{passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
