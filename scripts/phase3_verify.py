"""FASE 3 verification — user roles, OTP (SMTP2GO), Google login, access control.

Sandbox database only (dropped at the end). Zero production writes, zero real email.
Run:
  cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase3_verify.py
"""
import asyncio
import os
import re

SANDBOX_DB = "alsabbat_phase3_sandbox"
os.environ["MONGODB_DB_NAME"] = SANDBOX_DB
os.environ["DB_NAME"] = SANDBOX_DB
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MAIL_PROVIDER"] = "MEMORY"
os.environ.pop("SMTP2GO_API_KEY", None)
os.environ.pop("GOOGLE_CLIENT_ID", None)

import httpx  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import Collections, ensure_indexes, get_client, get_db  # noqa: E402
from app.services.bootstrap import run_bootstrap  # noqa: E402
from app.services.mailer import get_mailer  # noqa: E402

results = []
EMAIL = "fase3.a@sandbox-alsabbat.dev"
PASSWORD = "Sandbox123"


def check(name, passed, extra=""):
    results.append((name, bool(passed)))
    print(("PASS " if passed else "FAIL ") + name + (f"  [{extra}]" if extra else ""))


def last_code(mailer, email):
    for message in reversed(mailer.outbox):
        if message.to == email:
            found = re.search(r"Kode verifikasi: (\d{6})", message.text)
            if found:
                return found.group(1)
    return None


async def main():
    assert settings.DB_NAME == SANDBOX_DB, settings.DB_NAME
    await ensure_indexes()
    await run_bootstrap()
    db = get_db()
    mailer = get_mailer()
    check("F3-00 mailer sandbox = MEMORY (tanpa email nyata)", type(mailer).__name__ == "MemoryMailer")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://sandbox/api", timeout=60) as c:
        # ------------------------------------------------------- konfigurasi
        cfg = await c.get("/baraya/auth/config")
        body = cfg.json()
        check(
            "F3-01 auth/config jujur melaporkan Google & email belum dikonfigurasi",
            cfg.status_code == 200 and body["google_enabled"] is False and body["email_provider"] == "MEMORY",
            cfg.text[:120],
        )
        check("F3-02 auth/config tidak memuat secret", "secret" not in cfg.text.lower())

        # ------------------------------------------------------- pendaftaran
        reg = await c.post(
            "/baraya/register",
            json={
                "full_name": "Baraya Fase Tiga",
                "email": EMAIL,
                "phone": "+628123456789",
                "password": PASSWORD,
                "password_confirmation": PASSWORD,
            },
        )
        rbody = reg.json() if reg.status_code < 500 else {}
        check(
            "F3-03 register meminta verifikasi OTP",
            reg.status_code == 201 and rbody.get("verification_required") is True and rbody["customer"]["role"] == "MEMBER",
            reg.text[:160],
        )
        check("F3-04 email OTP dikirim ke provider", rbody.get("otp_delivered") is True)
        doc = await db[Collections.CUSTOMERS].find_one({"email": EMAIL})
        check("F3-05 akun baru belum terverifikasi", doc.get("email_verified") is False)

        otp_doc = await db[Collections.CUSTOMER_OTPS].find_one({"email": EMAIL, "purpose": "REGISTER"})
        code = last_code(mailer, EMAIL)
        check("F3-06 OTP disimpan sebagai hash saja (bukan plaintext)",
              otp_doc and "code" not in otp_doc and len(otp_doc["code_hash"]) == 64 and otp_doc["code_hash"] != code)

        # -------------------------------------------------- login sebelum OTP
        pre = await c.post("/baraya/login", json={"email": EMAIL, "password": PASSWORD})
        check("F3-07 login ditolak sebelum email diverifikasi (403)", pre.status_code == 403, pre.text[:120])

        wrong = await c.post("/baraya/otp/verify", json={"email": EMAIL, "code": "000000"})
        check("F3-08 kode salah ditolak", wrong.status_code == 401, wrong.text[:100])

        code = last_code(mailer, EMAIL)  # login gagal mengirim kode baru
        ok = await c.post("/baraya/otp/verify", json={"email": EMAIL, "code": code})
        token = ok.json().get("access_token") if ok.status_code == 200 else None
        check("F3-09 OTP benar → terverifikasi + sesi terbit", ok.status_code == 200 and bool(token), ok.text[:140])
        headers = {"Authorization": f"Bearer {token}"}

        again = await c.post("/baraya/otp/verify", json={"email": EMAIL, "code": code})
        check("F3-10 OTP sekali pakai (kode lama tidak bisa diulang)", again.status_code == 401)

        me = await c.get("/baraya/me", headers=headers)
        check(
            "F3-11 /me: role MEMBER + email_verified true + tanpa password_hash",
            me.status_code == 200
            and me.json()["role"] == "MEMBER"
            and me.json()["email_verified"] is True
            and "password_hash" not in me.text,
            me.text[:140],
        )

        after = await c.post("/baraya/login", json={"email": EMAIL, "password": PASSWORD})
        check("F3-12 login berhasil setelah verifikasi", after.status_code == 200)

        # ------------------------------------------------ akses galeri (403)
        guest = await c.get("/gallery/public/albums")
        member = await c.get("/gallery/public/albums", headers=headers)
        check("F3-13 Guest tidak bisa membuka galeri (403)", guest.status_code == 403, guest.text[:120])
        check("F3-14 MEMBER tidak bisa membuka galeri (403)", member.status_code == 403, member.text[:120])
        check("F3-15 pesan 403 mengarahkan ke pendaftaran Pemain", "Pemain" in member.text)

        access = await c.get("/baraya/access", headers=headers)
        check(
            "F3-16 /baraya/access melaporkan hak akses MEMBER",
            access.status_code == 200 and access.json()["can_view_gallery"] is False,
            access.text[:120],
        )

        # ----------------------------------------------------------- admin
        login_admin = await c.post(
            "/auth/login",
            json={"email": settings.BOOTSTRAP_ADMIN_EMAIL, "password": settings.BOOTSTRAP_ADMIN_PASSWORD},
        )
        admin_token = login_admin.json().get("access_token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        check("F3-17 admin login (RBAC existing tidak berubah)", login_admin.status_code == 200 and bool(admin_token))

        noauth = await c.get("/baraya/admin/applications")
        check("F3-18 endpoint admin pengajuan menolak tanpa token (401)", noauth.status_code == 401)
        cross = await c.get("/baraya/admin/applications", headers=headers)
        check("F3-19 token Baraya tidak bisa dipakai di endpoint admin", cross.status_code in (401, 403))

        settings_res = await c.get("/baraya/admin/auth-settings", headers=admin_headers)
        sbody = settings_res.json() if settings_res.status_code == 200 else {}
        check(
            "F3-20 admin auth-settings jujur (belum dikonfigurasi) & tanpa secret",
            settings_res.status_code == 200
            and sbody["google"]["configured"] is False
            and settings_res.json()["email"]["configured"] is False
            and "api-" not in settings_res.text
            and "client_secret" not in settings_res.json()["google"],
            settings_res.text[:160],
        )

        # ------------------------------------------------------- pengajuan
        payload = {
            "type": "PEMAIN",
            "full_name": "Baraya Fase Tiga",
            "phone": "+628123456789",
            "position": "Tengah",
            "motivation": "Ingin bermain untuk AL SABBAT dan berkembang bersama tim.",
        }
        app_res = await c.post("/baraya/applications", json=payload, headers=headers)
        check("F3-21 pengajuan Pemain dibuat (201, status PENDING)",
              app_res.status_code == 201 and app_res.json()["status"] == "PENDING", app_res.text[:140])
        app_id = app_res.json().get("id")

        dup = await c.post("/baraya/applications", json=payload, headers=headers)
        check("F3-22 pengajuan ganda ditolak (409)", dup.status_code == 409)

        anon_app = await c.post("/baraya/applications", json=payload)
        check("F3-23 pengajuan wajib login (401)", anon_app.status_code == 401)

        listing = await c.get("/baraya/admin/applications", params={"status": "PENDING"}, headers=admin_headers)
        check(
            "F3-24 admin melihat pengajuan + data akun (tanpa password_hash)",
            listing.status_code == 200
            and listing.json()["total"] == 1
            and listing.json()["items"][0]["customer"]["email"] == EMAIL
            and "password_hash" not in listing.text,
            listing.text[:160],
        )

        no_link = await c.patch(
            f"/baraya/admin/applications/{app_id}", json={"decision": "APPROVED"}, headers=admin_headers
        )
        check("F3-25 approve tanpa tautan record ditolak (422)", no_link.status_code == 422, no_link.text[:140])

        bad_link = await c.patch(
            f"/baraya/admin/applications/{app_id}",
            json={"decision": "APPROVED", "player_id": "tidak-ada"},
            headers=admin_headers,
        )
        check("F3-26 approve dengan record tidak ada ditolak (404)", bad_link.status_code == 404)

        club = await db[Collections.CLUBS].find_one({})
        team = await db[Collections.TEAMS].find_one({})
        if not team:
            team_res = await c.post(
                "/teams",
                json={"club_id": club["id"], "name": "AL SABBAT Sandbox"},
                headers=admin_headers,
            )
            team = team_res.json()
        player = await c.post(
            "/players",
            json={"team_id": team["id"], "full_name": "Pemain Sandbox", "position": "MIDFIELDER", "status": "ACTIVE"},
            headers=admin_headers,
        )
        player_id = player.json().get("id")
        check("F3-27 record Pemain dibuat lewat Admin API existing", player.status_code in (200, 201) and bool(player_id), player.text[:140])

        approve = await c.patch(
            f"/baraya/admin/applications/{app_id}",
            json={"decision": "APPROVED", "player_id": player_id, "note": "Selamat bergabung."},
            headers=admin_headers,
        )
        check(
            "F3-28 approve menaikkan peran & menautkan record existing",
            approve.status_code == 200
            and approve.json()["status"] == "APPROVED"
            and approve.json()["customer"]["role"] == "PEMAIN"
            and approve.json()["customer"]["player_id"] == player_id,
            approve.text[:180],
        )

        decided_again = await c.patch(
            f"/baraya/admin/applications/{app_id}",
            json={"decision": "REJECTED"},
            headers=admin_headers,
        )
        check("F3-29 pengajuan yang sudah diputuskan tidak bisa diputuskan lagi (409)", decided_again.status_code == 409)

        gallery_ok = await c.get("/gallery/public/albums", headers=headers)
        check("F3-30 PEMAIN dapat membuka galeri (200)", gallery_ok.status_code == 200, gallery_ok.text[:120])

        access2 = await c.get("/baraya/access", headers=headers)
        check("F3-31 hak akses ikut naik otomatis", access2.json()["can_view_gallery"] is True)

        card = await c.get("/baraya/member-card", headers=headers)
        check(
            "F3-32 kartu member menampilkan peran PEMAIN & tanpa data sensitif",
            card.status_code == 200 and card.json()["role"] == "PEMAIN" and "password" not in card.text.lower(),
            card.text[:160],
        )

        mine = await c.get("/baraya/applications/mine", headers=headers)
        check("F3-33 riwayat pengajuan milik sendiri terbaca", mine.status_code == 200 and mine.json()["total"] == 1)

        # -------------------------------------------------- ubah peran admin
        role_bad = await c.patch(f"/baraya/admin/{doc['id']}/role", json={"role": "STAFF"}, headers=admin_headers)
        check("F3-34 ubah peran STAFF tanpa record staf ditolak (422)", role_bad.status_code == 422)
        role_reset = await c.patch(f"/baraya/admin/{doc['id']}/role", json={"role": "MEMBER"}, headers=admin_headers)
        check(
            "F3-35 admin bisa menurunkan peran ke MEMBER (tautan dilepas)",
            role_reset.status_code == 200 and role_reset.json()["role"] == "MEMBER" and not role_reset.json().get("player_id"),
            role_reset.text[:140],
        )
        gallery_locked = await c.get("/gallery/public/albums", headers=headers)
        check("F3-36 peran diturunkan → galeri kembali terkunci (403)", gallery_locked.status_code == 403)

        await c.patch(f"/baraya/admin/{doc['id']}/role", json={"role": "PEMAIN", "player_id": player_id}, headers=admin_headers)

        # ----------------------------------------------- reset kata sandi OTP
        req_reset = await c.post("/baraya/otp/request", json={"email": EMAIL, "purpose": "RESET"})
        check("F3-37 permintaan OTP reset memakai respons generik", req_reset.status_code == 200 and "Jika email" in req_reset.text)
        unknown = await c.post("/baraya/otp/request", json={"email": "tidak.ada@sandbox-alsabbat.dev", "purpose": "RESET"})
        check(
            "F3-38 email tidak terdaftar tetap generik (anti-enumerasi)",
            unknown.status_code == 200 and unknown.json()["delivered"] is False and unknown.json()["message"] == req_reset.json()["message"],
        )
        reset_code = last_code(mailer, EMAIL)
        bad_reset = await c.post(
            "/baraya/reset-password-otp",
            json={"email": EMAIL, "code": "111111", "password": "Sandbox456", "password_confirmation": "Sandbox456"},
        )
        check("F3-39 reset dengan kode salah ditolak (401)", bad_reset.status_code == 401)
        good_reset = await c.post(
            "/baraya/reset-password-otp",
            json={"email": EMAIL, "code": reset_code, "password": "Sandbox456", "password_confirmation": "Sandbox456"},
        )
        check("F3-40 reset kata sandi via OTP berhasil", good_reset.status_code == 200, good_reset.text[:140])
        old_session = await c.get("/baraya/me", headers=headers)
        check("F3-41 semua sesi lama dicabut setelah reset (401)", old_session.status_code == 401)
        relogin = await c.post("/baraya/login", json={"email": EMAIL, "password": "Sandbox456"})
        check("F3-42 login dengan kata sandi baru berhasil", relogin.status_code == 200)
        old_pass = await c.post("/baraya/login", json={"email": EMAIL, "password": PASSWORD})
        check("F3-43 kata sandi lama tidak berlaku lagi", old_pass.status_code == 401)

        # ---------------------------------------------------------- Google
        g = await c.post(
            "/baraya/google/login",
            json={"code": "kode-google-palsu-1234567890", "redirect_uri": "https://contoh.test/auth/google"},
        )
        check(
            "F3-44 login Google tanpa konfigurasi melaporkan jujur (422, bukan sukses palsu)",
            g.status_code == 422 and "belum dikonfigurasi" in g.text,
            g.text[:140],
        )

        # ------------------------------------------------------- regresi
        regress = {
            "/club": 200,
            "/players": 200,
            "/matches": 200,
            "/content/posts": 200,
            "/sponsors": 200,
            "/banners/public": 200,
            "/site-content/public": 200,
            "/achievements": 200,
            "/merchandise/products": 200,
            "/health": 200,
        }
        for path, expected in regress.items():
            res = await c.get(path)
            check(f"F3-45 regresi {path} tetap {expected}", res.status_code == expected, str(res.status_code))

        verify_public = await c.get(f"/member/verify/{(await db[Collections.CUSTOMERS].find_one({'email': EMAIL}))['member_code']}")
        vbody = verify_public.json()
        check(
            "F3-46 verifikasi QR publik tanpa email/telepon & memuat peran",
            verify_public.status_code == 200 and vbody["role"] == "PEMAIN" and "email" not in verify_public.text and "phone" not in verify_public.text,
            verify_public.text[:160],
        )

    passed = sum(1 for _, ok_ in results if ok_)
    print(f"\n{passed}/{len(results)} PASS")

    await get_client().drop_database(SANDBOX_DB)
    print(f"sandbox database {SANDBOX_DB} dropped")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
