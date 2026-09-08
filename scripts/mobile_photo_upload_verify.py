"""Verifikasi nyata upload foto mobile terhadap backend EXISTING (dev/preview).

Alur:
 1. daftar akun sandbox lewat /api/baraya/register (butuh OTP)
 2. ambil kode OTP dari log server (hanya aktif di environment non-produksi)
 3. verifikasi OTP -> access_token
 4. UPLOAD FOTO:
    a. multipart benar (boundary dibuat httpx)      -> harus 201/200
    b. Content-Type multipart TANPA boundary        -> harus GAGAL (bukti root cause)
    c. Content-Type application/json + body form    -> harus GAGAL (bukti root cause)
 5. cek endpoint alternatif /api/baraya/me/upload dan /api/baraya/me/photo
 6. HAPUS akun sandbox (DELETE /api/baraya/me/account) supaya database bersih

Tidak ada data uji yang ditinggalkan.
"""
from __future__ import annotations

import io
import re
import subprocess
import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001"
EMAIL = f"mobile.upload.{int(time.time())}@sandbox-alsabbat.dev"
PASSWORD = "Sandbox123"

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00"
    b"\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'} · {name}{' · ' + detail if detail else ''}")


def otp_from_log() -> str | None:
    out = subprocess.run(
        ["bash", "-lc", "grep 'otp.debug_code' /var/log/supervisor/backend.out.log | tail -1"],
        capture_output=True, text=True,
    ).stdout
    match = re.search(r"code=(\d{4,8})", out) or re.search(r"(\d{6})", out)
    return match.group(1) if match else None


with httpx.Client(base_url=BASE, timeout=60) as client:
    register = client.post(
        "/api/baraya/register",
        json={
            "full_name": "Uji Upload Mobile",
            "email": EMAIL,
            "password": PASSWORD,
            "password_confirmation": PASSWORD,
            "phone": "081234567890",
            "accepted_terms": True,
        },
    )
    check("register akun sandbox", register.status_code in (200, 201), f"HTTP {register.status_code} {register.text[:120]}")
    if register.status_code not in (200, 201):
        sys.exit(1)

    time.sleep(1)
    code = otp_from_log()
    check("kode OTP terbaca dari log server", bool(code), f"code={code}")
    verify = client.post("/api/baraya/otp/verify", json={"email": EMAIL, "code": code})
    check("verifikasi OTP", verify.status_code == 200, f"HTTP {verify.status_code} {verify.text[:120]}")
    token = verify.json().get("access_token")
    auth = {"Authorization": f"Bearer {token}"}
    check("access token diterima", bool(token))

    # --- 4a. multipart BENAR (boundary otomatis) -------------------------
    ok_upload = client.post(
        "/api/baraya/uploads/photo",
        headers=auth,
        files={"file": ("player-photo.png", io.BytesIO(PNG), "image/png")},
    )
    body = ok_upload.json() if ok_upload.headers.get("content-type", "").startswith("application/json") else {}
    check(
        "upload multipart benar -> tersimpan",
        ok_upload.status_code in (200, 201) and bool(body.get("url")),
        f"HTTP {ok_upload.status_code} url={body.get('url')}",
    )
    stored_url = body.get("url")

    # --- 4b. multipart TANPA boundary (bug lama) -------------------------
    bad_boundary = client.post(
        "/api/baraya/uploads/photo",
        headers={**auth, "Content-Type": "multipart/form-data"},
        content=b"--x\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.png\"\r\n\r\n" + PNG + b"\r\n--x--\r\n",
    )
    check(
        "Content-Type multipart tanpa boundary -> ditolak backend (root cause)",
        bad_boundary.status_code >= 400,
        f"HTTP {bad_boundary.status_code} {bad_boundary.text[:90]}",
    )

    # --- 4c. Content-Type application/json untuk body form ---------------
    bad_json = client.post(
        "/api/baraya/uploads/photo",
        headers={**auth, "Content-Type": "application/json"},
        content=PNG,
    )
    check(
        "Content-Type application/json untuk upload -> ditolak backend (root cause)",
        bad_json.status_code >= 400,
        f"HTTP {bad_json.status_code} {bad_json.text[:90]}",
    )

    # --- 5. endpoint alternatif existing --------------------------------
    alt = client.post(
        "/api/baraya/me/upload",
        headers=auth,
        files={"file": ("player-photo.png", io.BytesIO(PNG), "image/png")},
    )
    alt_body = alt.json() if alt.status_code < 400 else {}
    check(
        "fallback /api/baraya/me/upload berfungsi",
        alt.status_code in (200, 201) and bool(alt_body.get("photo_url")),
        f"HTTP {alt.status_code} photo_url={alt_body.get('photo_url')}",
    )

    profile = client.post(
        "/api/baraya/me/photo",
        headers=auth,
        files={"file": ("profil.png", io.BytesIO(PNG), "image/png")},
    )
    profile_body = profile.json() if profile.status_code < 400 else {}
    check(
        "foto profil /api/baraya/me/photo tersimpan",
        profile.status_code in (200, 201) and bool(profile_body.get("photo_url")),
        f"HTTP {profile.status_code}",
    )
    me = client.get("/api/baraya/me", headers=auth)
    check(
        "photo_url tersimpan pada profil (tetap ada saat halaman dibuka ulang)",
        me.status_code == 200 and bool(me.json().get("photo_url")),
        f"photo_url={me.json().get('photo_url') if me.status_code == 200 else '-'}",
    )

    # --- ganti foto lagi (replacement) ----------------------------------
    replace = client.post(
        "/api/baraya/uploads/photo",
        headers=auth,
        files={"file": ("player-photo-2.jpg", io.BytesIO(PNG), "image/jpeg")},
    )
    check(
        "ganti foto pemain kedua kali berhasil",
        replace.status_code in (200, 201),
        f"HTTP {replace.status_code}",
    )

    # --- berkas hasil upload bisa dibaca --------------------------------
    if stored_url:
        served = client.get(stored_url if stored_url.startswith("/") else stored_url)
        check("berkas media hasil upload dapat diakses", served.status_code == 200, f"HTTP {served.status_code}")

    # --- 6. bersihkan akun sandbox --------------------------------------
    deleted = client.delete("/api/baraya/me/account", headers=auth)
    check("akun sandbox dihapus permanen", deleted.status_code == 200, f"HTTP {deleted.status_code}")

failed = [name for name, ok, _ in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} PASS")
sys.exit(1 if failed else 0)
