"""FASE 14 verification — in-process app, sandbox DB, MEMORY mailer.

Zero production writes and zero real emails: a throwaway database is used and
dropped at the end, and the mail transport is the in-memory test transport.
Run from /app/backend with backend/.env loaded.
"""
import asyncio
import io
import logging
import os
import sys
from datetime import datetime, timedelta, timezone

SANDBOX_DB = "alsabbat_phase14_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ["RATE_LIMIT_ENABLED"] = "true"
os.environ.setdefault("PUBLIC_SITE_URL", "https://sandbox.local")

import httpx  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from app.main import app  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_db  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402
from app.services.mailer import get_mailer  # noqa: E402

assert settings.MONGODB_DB_NAME == SANDBOX_DB if hasattr(settings, "MONGODB_DB_NAME") else True

LOG_STREAM = io.StringIO()
handler = logging.StreamHandler(LOG_STREAM)
handler.setLevel(logging.DEBUG)
logging.getLogger().addHandler(handler)
logging.getLogger().setLevel(logging.DEBUG)

A = {"full_name": "Fase14 A", "email": "f14.a@barayasandbox.dev", "phone": "+628120000001",
     "password": "OldPass1234", "password_confirmation": "OldPass1234"}
B = {"full_name": "Fase14 B", "email": "f14.b@barayasandbox.dev", "phone": "+628120000002",
     "password": "OldPassB123", "password_confirmation": "OldPassB123"}
INACT = {"full_name": "Fase14 Inactive", "email": "f14.inactive@barayasandbox.dev", "phone": "+628120000003",
         "password": "OldPassC123", "password_confirmation": "OldPassC123"}
NEW_A = "BrandNew1234"
results = []


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


async def clear_rate_limits():
    await get_db()[Collections.RATE_LIMITS].delete_many({})


def last_token(mailer, email):
    for msg in reversed(mailer.outbox):
        if msg.to == email and "token=" in msg.text:
            return msg.text.split("token=")[1].split()[0].strip()
    return None


async def main():
    await ensure_indexes()
    await run_bootstrap()
    mailer = get_mailer()
    check("MEMORY mail transport active (no production email)", type(mailer).__name__ == "MemoryMailer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        db = get_db()

        # ---------- baseline (regressions P25/P24/P26/P27)
        check("P25 register regression", (await c.post("/baraya/register", json=A)).status_code == 201)
        check("P25b register B", (await c.post("/baraya/register", json=B)).status_code == 201)
        check("P25c register inactive-target", (await c.post("/baraya/register", json=INACT)).status_code == 201)
        la = await c.post("/baraya/login", json={"email": A["email"], "password": A["password"]})
        check("P24 existing login regression", la.status_code == 200, str(la.status_code))
        ha = {"Authorization": f"Bearer {la.json()['access_token']}"}
        # second active session for the same customer (revocation test)
        la2 = await c.post("/baraya/login", json={"email": A["email"], "password": A["password"]})
        ha2 = {"Authorization": f"Bearer {la2.json()['access_token']}"}
        lb = await c.post("/baraya/login", json={"email": B["email"], "password": B["password"]})
        hb = {"Authorization": f"Bearer {lb.json()['access_token']}"}
        check("P26 profile regression", (await c.get("/baraya/me", headers=ha)).status_code == 200)
        cp = await c.post("/baraya/change-password", json={"current_password": "wrong", "new_password": "Whatever123"}, headers=ha)
        check("P27 change-password regression (wrong current -> 401)", cp.status_code == 401)
        check("P12b change-password requires auth", (await c.post("/baraya/change-password", json={"current_password": "x", "new_password": "Whatever123"})).status_code == 401)

        await clear_rate_limits()

        # ---------- forgot password
        f1 = await c.post("/baraya/forgot-password", json={"email": A["email"]})
        f2 = await c.post("/baraya/forgot-password", json={"email": "not.registered@barayasandbox.dev"})
        check("P1 forgot (registered) 200", f1.status_code == 200, str(f1.status_code))
        check("P2 forgot (unregistered) identical response", f2.status_code == f1.status_code and f2.json() == f1.json(), f2.text[:80])
        check("P3 enumeration protection (generic message, no ids)",
              "Jika email terdaftar" in f1.text and "customer_id" not in f1.text and "status" not in f1.text)
        f3 = await c.post("/baraya/forgot-password", json={"email": "  NOT.Registered2@BarayaSandbox.dev "})
        check("P17a normalised/unknown email -> same generic response", f3.status_code == 200 and f3.json() == f1.json())

        token = last_token(mailer, A["email"])
        check("P5 reset token created and mailed", bool(token), f"len={len(token or '')}")
        check("P19 token not in API response", token not in f1.text)
        reset_docs = [d async for d in db[Collections.CUSTOMER_PASSWORD_RESETS].find({})]
        check("P6 plaintext token not stored (only sha256 hash)",
              all(token != d.get("token_hash") and "token" not in {k for k in d if k != "token_hash"} for d in reset_docs)
              and all(len(d["token_hash"]) == 64 for d in reset_docs))
        check("P20 token never logged", token not in LOG_STREAM.getvalue())
        check("P17b exactly one reset row for the registered request",
              await db[Collections.CUSTOMER_PASSWORD_RESETS].count_documents({}) == 1)

        # ---------- rate limit (P4)
        await clear_rate_limits()
        statuses = []
        for _ in range(7):
            statuses.append((await c.post("/baraya/forgot-password", json={"email": A["email"]})).status_code)
        check("P4 forgot-password rate limited", 429 in statuses, str(statuses))
        await clear_rate_limits()
        rstatuses = []
        for _ in range(12):
            rstatuses.append((await c.post("/baraya/reset-password", json={"token": "x" * 40, "password": "Dummy1234", "password_confirmation": "Dummy1234"})).status_code)
        check("P4b reset-password rate limited", 429 in rstatuses, str(sorted(set(rstatuses))))
        await clear_rate_limits()

        # a fresh token for the successful reset (earlier ones are still valid)
        await c.post("/baraya/forgot-password", json={"email": A["email"]})
        token = last_token(mailer, A["email"])
        await clear_rate_limits()

        # ---------- validation
        weak = await c.post("/baraya/reset-password", json={"token": token, "password": "short", "password_confirmation": "short"})
        check("P13 weak password -> 422", weak.status_code == 422, str(weak.status_code))
        mism = await c.post("/baraya/reset-password", json={"token": token, "password": "Valid12345", "password_confirmation": "Other12345"})
        check("P14 password mismatch -> 422", mism.status_code == 422, str(mism.status_code))
        bad = await c.post("/baraya/reset-password", json={"token": "z" * 44, "password": NEW_A, "password_confirmation": NEW_A})
        check("P12 invalid token rejected (generic)", bad.status_code == 401 and "tidak valid" in bad.text)

        # expired token
        exp_doc = {
            "id": "sandbox-expired", "customer_id": (await db[Collections.CUSTOMERS].find_one({"email": A["email"]}))["id"],
            "token_hash": __import__("hashlib").sha256(b"expired-sandbox-token").hexdigest(),
            "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "used_at": None, "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db[Collections.CUSTOMER_PASSWORD_RESETS].insert_one(exp_doc)
        expired = await c.post("/baraya/reset-password", json={"token": "expired-sandbox-token", "password": NEW_A, "password_confirmation": NEW_A})
        check("P11 expired token rejected", expired.status_code == 401, str(expired.status_code))

        # ---------- successful reset
        ok = await c.post("/baraya/reset-password", json={"token": token, "password": NEW_A, "password_confirmation": NEW_A})
        check("P7 valid token -> reset success", ok.status_code == 200, str(ok.status_code))
        check("P19b success response has no token", token not in ok.text)
        await clear_rate_limits()

        old_login = await c.post("/baraya/login", json={"email": A["email"], "password": A["password"]})
        check("P8 old password cannot login", old_login.status_code == 401, str(old_login.status_code))
        new_login = await c.post("/baraya/login", json={"email": A["email"], "password": NEW_A})
        check("P9 new password can login", new_login.status_code == 200, str(new_login.status_code))
        ha_new = {"Authorization": f"Bearer {new_login.json()['access_token']}"}

        again = await c.post("/baraya/reset-password", json={"token": token, "password": "Another1234", "password_confirmation": "Another1234"})
        check("P10 token single-use (second attempt fails)", again.status_code == 401, str(again.status_code))

        check("P15 all old customer sessions revoked",
              (await c.get("/baraya/me", headers=ha)).status_code == 401
              and (await c.get("/baraya/me", headers=ha2)).status_code == 401)
        check("P15b new session works", (await c.get("/baraya/me", headers=ha_new)).status_code == 200)
        check("P18 other customer session untouched", (await c.get("/baraya/me", headers=hb)).status_code == 200)

        # ---------- customer isolation on reset (P18b / P11 IDOR)
        await c.post("/baraya/forgot-password", json={"email": B["email"]})
        token_b = last_token(mailer, B["email"])
        check("P18c token for B differs from A", token_b and token_b != token)
        me_b_before = (await c.get("/baraya/me", headers=hb)).json()["email"]
        await clear_rate_limits()
        r_b = await c.post("/baraya/reset-password", json={"token": token_b, "password": "BeeNew12345", "password_confirmation": "BeeNew12345"})
        check("P18d B reset only affects B", r_b.status_code == 200 and me_b_before == B["email"]
              and (await c.post("/baraya/login", json={"email": A["email"], "password": NEW_A})).status_code == 200)

        # ---------- inactive customer (P17)
        inact_doc = await db[Collections.CUSTOMERS].find_one({"email": INACT["email"]})
        await db[Collections.CUSTOMERS].update_one({"id": inact_doc["id"]}, {"$set": {"status": "INACTIVE"}})
        await clear_rate_limits()
        before = len([m for m in mailer.outbox if m.to == INACT["email"]])
        fi = await c.post("/baraya/forgot-password", json={"email": INACT["email"].upper() + " "})
        after = len([m for m in mailer.outbox if m.to == INACT["email"]])
        check("P17c inactive: generic response, no token issued",
              fi.status_code == 200 and fi.json() == f1.json() and after == before, f"{before}->{after}")
        check("P17d inactive cannot login", (await c.post("/baraya/login", json={"email": INACT["email"], "password": INACT["password"]})).status_code == 401)
        # forge a reset row for the inactive customer -> must still fail
        await db[Collections.CUSTOMER_PASSWORD_RESETS].insert_one({
            "id": "sandbox-inactive", "customer_id": inact_doc["id"],
            "token_hash": __import__("hashlib").sha256(b"inactive-sandbox-token").hexdigest(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "used_at": None, "created_at": datetime.now(timezone.utc).isoformat()})
        ri = await c.post("/baraya/reset-password", json={"token": "inactive-sandbox-token", "password": "Inact12345", "password_confirmation": "Inact12345"})
        check("P17e inactive cannot gain access via reset", ri.status_code == 401, str(ri.status_code))

        # ---------- admin separation (P16 / P21 / P22)
        await clear_rate_limits()
        adm = await c.post("/auth/login", json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD})
        check("admin login works (unchanged flow)", adm.status_code == 200, str(adm.status_code))
        adm_h = {"Authorization": f"Bearer {adm.json()['access_token']}"}
        check("P21 admin token rejected on /baraya/me", (await c.get("/baraya/me", headers=adm_h)).status_code == 401)
        check("P22 baraya token rejected on admin endpoints",
              (await c.get("/auth/me", headers=ha_new)).status_code == 401
              and (await c.get("/users", headers=ha_new)).status_code in (401, 403))
        check("P16 admin session still valid after customer resets", (await c.get("/auth/me", headers=adm_h)).status_code == 200)
        check("P16b admin sessions untouched", await db[Collections.SESSIONS].count_documents({"revoked": True}) == 0)

        # ---------- guest checkout regression (P23)
        await db[Collections.PRODUCTS].insert_one({
            "id": "f14product", "name": "Sandbox Fase 14", "slug": "sandbox-fase-14", "status": "ACTIVE",
            "price": 50000, "currency": "IDR", "stock_quantity": 10, "media_ids": [], "display_order": 1,
            "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()})
        body = {"items": [{"product_id": "f14product", "variant_id": None, "quantity": 1}],
                "customer": {"name": "Guest Sandbox", "email": "guest@barayasandbox.dev", "phone": "+628120000009"},
                "shipping": {"recipient": "Guest Sandbox", "address": "Jl Sandbox 1", "city": "Bandung",
                             "province": "Jawa Barat", "postal_code": "40000"}}
        g = await c.post("/merchandise/checkout", json=body)
        check("P23 guest checkout still works", g.status_code == 201 and g.json()["order"].get("customer_id") is None, str(g.status_code))
        cust = await c.post("/merchandise/checkout", json=body, headers=ha_new)
        check("P23b baraya checkout still links customer_id", cust.status_code == 201 and bool(cust.json()["order"].get("customer_id")))

        # ---------- log hygiene
        logs = LOG_STREAM.getvalue()
        check("P20b no password in logs", NEW_A not in logs and A["password"] not in logs)
        check("P20c no reset token in logs", all(t not in logs for t in filter(None, [token, token_b])))

    # ---------- cleanup: drop the whole sandbox database
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    await client.drop_database(SANDBOX_DB)
    remaining = await client[SANDBOX_DB].list_collection_names()
    check("sandbox database dropped", remaining == [], str(remaining))

    failed = [n for n, ok_ in results if not ok_]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    if failed:
        print("FAILED:", failed)
    sys.exit(1 if failed else 0)


asyncio.run(main())
