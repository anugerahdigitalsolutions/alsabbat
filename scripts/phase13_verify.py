"""Fase 13 verification — throwaway Baraya accounts, deleted at the end."""
import asyncio, os, sys, json
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

BASE = os.environ["REACT_APP_BACKEND_URL"] + "/api"
A = {"full_name": "Verify A Baraya", "email": "verify.a.phase13@barayaverify.dev", "phone": "+628110000001",
     "password": "Verify1234", "password_confirmation": "Verify1234"}
B = {"full_name": "Verify B Baraya", "email": "verify.b.phase13@barayaverify.dev", "phone": "+628110000002",
     "password": "Verify5678", "password_confirmation": "Verify5678"}
ADMIN = {"email": "admin@alsabbat.com", "password": "Alsabbat2026!"}
results = []


def log(name, ok, extra=""):
    results.append((name, ok, extra))
    print(("PASS " if ok else "FAIL ") + name + (f"  {extra}" if extra else ""))


async def main():
    db = AsyncIOMotorClient(os.environ.get("MONGODB_URI") or os.environ["MONGO_URL"])[os.environ.get("MONGODB_DB_NAME") or os.environ["DB_NAME"]]
    order_id = None
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        # clean slate
        for p in (A, B):
            await db.customers.delete_many({"email": p["email"]})

        r1 = await c.post("/baraya/register", json=A)
        log("register A 201", r1.status_code == 201, str(r1.status_code))
        log("register response hides password", "password" not in r1.text.lower(), r1.text[:120])
        r2 = await c.post("/baraya/register", json=B)
        log("register B 201", r2.status_code == 201, str(r2.status_code))

        dup = await c.post("/baraya/register", json=A)
        log("duplicate email rejected", dup.status_code == 409, str(dup.status_code))

        weak = dict(A, email="weak.phase13@barayaverify.dev", password="short", password_confirmation="short")
        log("weak password rejected", (await c.post("/baraya/register", json=weak)).status_code == 422)
        mism = dict(A, email="mismatch.phase13@barayaverify.dev", password_confirmation="Different99")
        log("password mismatch rejected", (await c.post("/baraya/register", json=mism)).status_code == 422)

        bad = await c.post("/baraya/login", json={"email": A["email"], "password": "WrongPass1"})
        log("wrong password 401 + generic msg", bad.status_code == 401 and "tidak sesuai" in bad.text, bad.text[:90])

        la = await c.post("/baraya/login", json={"email": A["email"], "password": A["password"]})
        lb = await c.post("/baraya/login", json={"email": B["email"], "password": B["password"]})
        log("login A 200", la.status_code == 200, str(la.status_code))
        log("login B 200", lb.status_code == 200, str(lb.status_code))
        ta, tb = la.json()["access_token"], lb.json()["access_token"]
        ha, hb = {"Authorization": f"Bearer {ta}"}, {"Authorization": f"Bearer {tb}"}
        cust_a = la.json()["customer"]
        log("login payload has no password_hash", "password_hash" not in la.text)

        me = await c.get("/baraya/me", headers=ha)
        log("GET /baraya/me 200", me.status_code == 200 and me.json()["email"] == A["email"])

        log("customer token rejected on admin /auth/me", (await c.get("/auth/me", headers=ha)).status_code == 401)
        log("customer token rejected on admin orders", (await c.get("/merchandise/orders", headers=ha)).status_code in (401, 403))
        log("customer token rejected on admin users", (await c.get("/users", headers=ha)).status_code in (401, 403))
        log("no token -> /baraya/me 401", (await c.get("/baraya/me")).status_code == 401)

        adm = await c.post("/auth/login", json=ADMIN)
        log("admin login still 200", adm.status_code == 200, str(adm.status_code))
        adm_h = {"Authorization": f"Bearer {adm.json()['access_token']}"}
        log("admin token rejected on /baraya/me", (await c.get("/baraya/me", headers=adm_h)).status_code == 401)
        al = await c.get("/baraya/admin/list", headers=adm_h)
        log("admin can list baraya", al.status_code == 200 and "password_hash" not in al.text)

        # throwaway order owned by A, verified via API isolation
        order_id = "phase13verifyorder"
        await db.orders.insert_one({
            "id": order_id, "order_number": "ALS-VERIFY-000001", "customer_id": cust_a["id"],
            "customer": {"name": A["full_name"], "email": A["email"], "phone": A["phone"]},
            "shipping": {"recipient": A["full_name"], "address": "Jl Verifikasi 1", "city": "Bandung",
                         "province": "Jawa Barat", "postal_code": "40000"},
            "items": [], "subtotal": 0, "shipping_cost": 0, "total": 0, "currency": "IDR",
            "order_status": "PENDING", "payment_status": "PENDING",
            "created_at": "2026-06-26T00:00:00+00:00", "updated_at": "2026-06-26T00:00:00+00:00",
        })
        oa = await c.get(f"/baraya/orders/{order_id}", headers=ha)
        ob = await c.get(f"/baraya/orders/{order_id}", headers=hb)
        log("owner can read own order", oa.status_code == 200, str(oa.status_code))
        log("other customer cannot read it (no IDOR)", ob.status_code == 404, str(ob.status_code))
        la_list = await c.get("/baraya/orders", headers=ha)
        lb_list = await c.get("/baraya/orders", headers=hb)
        log("A order list contains only own", la_list.json()["total"] == 1)
        log("B order list empty", lb_list.json()["total"] == 0)

        lo = await c.post("/baraya/logout", headers=ha)
        log("logout 200", lo.status_code == 200)
        log("revoked session rejected", (await c.get("/baraya/me", headers=ha)).status_code == 401)

        # deactivate via admin -> B cannot use token
        cust_b_id = lb.json()["customer"]["id"]
        st = await c.patch(f"/baraya/admin/{cust_b_id}/status", json={"status": "INACTIVE"}, headers=adm_h)
        log("admin deactivate 200", st.status_code == 200)
        log("inactive customer session revoked", (await c.get("/baraya/me", headers=hb)).status_code == 401)

        # cleanup
        await db.orders.delete_many({"id": order_id})
        for p in (A, B, {"email": "weak.phase13@barayaverify.dev"}, {"email": "mismatch.phase13@barayaverify.dev"}):
            doc = await db.customers.find_one({"email": p["email"]})
            if doc:
                await db.customer_sessions.delete_many({"customer_id": doc["id"]})
            await db.customers.delete_many({"email": p["email"]})
        left_c = await db.customers.count_documents({"email": {"$regex": "phase13@barayaverify.dev"}})
        left_o = await db.orders.count_documents({"id": order_id})
        log("throwaway data removed", left_c == 0 and left_o == 0, f"customers={left_c} orders={left_o}")

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    sys.exit(1 if failed else 0)


asyncio.run(main())
