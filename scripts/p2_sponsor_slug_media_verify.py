"""Verifikasi end-to-end: upload media (sanitizer) + slug sponsor + sponsor utama.

python scripts/p2_sponsor_slug_media_verify.py [base_url]
Semua data uji dibuat lalu DIHAPUS kembali.
"""
import io
import os
import sys

import requests
from PIL import Image, PngImagePlugin

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@alsabbat.com")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "Alsabbat2026!")

results = []


def check(name, cond, detail=""):
    results.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail else ""))


def png_transparent(text=None):
    img = Image.new("RGBA", (600, 200), (0, 0, 0, 0))
    for x in range(0, 600, 2):
        for y in range(0, 200, 2):
            img.putpixel((x, y), ((x * 3) % 255, (y * 7) % 255, (x + y) % 255, 200))
    buf = io.BytesIO()
    if text:
        meta = PngImagePlugin.PngInfo()
        meta.add_text("Comment", text)
        img.save(buf, format="PNG", pnginfo=meta)
    else:
        img.save(buf, format="PNG")
    return buf.getvalue()


def jpeg():
    img = Image.new("RGB", (600, 400))
    for x in range(600):
        for y in range(0, 400, 2):
            img.putpixel((x, y), ((x * 5) % 255, (y * 3) % 255, 120))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
r.raise_for_status()
s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"

media_ids = []
sponsor_ids = []


def upload(filename, content, mime):
    return s.post(
        f"{BASE}/api/media/upload",
        files={"file": (filename, content, mime)},
        timeout=60,
    )


try:
    # ---------------- SANITIZER (lewat API + storage existing) ----------------
    r = upload("logo-transparan.png", png_transparent(), "image/png")
    check("upload PNG transparan valid → 200/201", r.status_code in (200, 201), r.status_code)
    if r.status_code in (200, 201):
        doc = r.json()
        media_ids.append(doc["id"])
        check("PNG tersimpan sebagai image/png", doc.get("mime_type") == "image/png", doc.get("mime_type"))
        got = s.get(f"{BASE}{doc['url']}", timeout=30)
        check("berkas PNG dapat dibaca ulang", got.status_code == 200 and got.content[:8] == b"\x89PNG\r\n\x1a\n", got.status_code)

    r = upload("payload.png", png_transparent(text="<html><script>alert(1)</script></html>"), "image/png")
    check("upload PNG valid ber-metadata HTML → diterima", r.status_code in (200, 201), r.status_code)
    if r.status_code in (200, 201):
        doc = r.json()
        media_ids.append(doc["id"])
        got = s.get(f"{BASE}{doc['url']}", timeout=30)
        check("payload HTML tidak tersimpan di server", b"<html" not in got.content and b"<script" not in got.content)

    r = upload("foto.jpg", jpeg(), "image/jpeg")
    check("upload JPEG valid → 200/201", r.status_code in (200, 201), r.status_code)
    if r.status_code in (200, 201):
        media_ids.append(r.json()["id"])

    r = upload("evil.jpg", b"<html><body><script>alert(1)</script></body></html>", "image/jpeg")
    check("HTML berkedok .jpg DITOLAK", r.status_code >= 400, r.status_code)
    r = upload("evil.svg", b"<svg xmlns='http://www.w3.org/2000/svg'><script>x</script></svg>", "image/svg+xml")
    check("SVG DITOLAK", r.status_code >= 400, r.status_code)
    r = upload("app.png", b"MZ\x90\x00" + b"\x00" * 800, "image/png")
    check("executable berkedok .png DITOLAK", r.status_code >= 400, r.status_code)
    r = upload("kosong.png", b"", "image/png")
    check("berkas kosong DITOLAK", r.status_code >= 400, r.status_code)

    # ---------------------------- SLUG SPONSOR ----------------------------
    r = s.post(f"{BASE}/api/sponsors", json={"name": "PT ABC Indonesia"}, timeout=30)
    check("sponsor baru dibuat", r.status_code in (200, 201), r.status_code)
    sp = r.json()
    sponsor_ids.append(sp["id"])
    check("slug otomatis dari nama", sp.get("slug") == "pt-abc-indonesia", sp.get("slug"))

    r = s.get(f"{BASE}/api/sponsors/by-slug/pt-abc-indonesia", timeout=30)
    check("GET via slug berhasil", r.status_code == 200 and r.json()["id"] == sp["id"], r.status_code)

    r = s.get(f"{BASE}/api/sponsors/by-slug/{sp['id']}", timeout=30)
    check("GET via ID lama tetap berhasil", r.status_code == 200 and r.json()["id"] == sp["id"], r.status_code)

    r = s.post(f"{BASE}/api/sponsors", json={"name": "PT ABC Indonesia"}, timeout=30)
    check("slug duplikat DITOLAK (409/422)", r.status_code in (409, 422), r.status_code)
    if r.status_code in (200, 201):
        sponsor_ids.append(r.json()["id"])

    r = s.patch(f"{BASE}/api/sponsors/{sp['id']}", json={"name": "PT ABC Nusantara Jaya"}, timeout=30)
    check("ganti nama sponsor berhasil", r.status_code == 200, r.status_code)
    check("slug TIDAK berubah otomatis", r.json().get("slug") == "pt-abc-indonesia", r.json().get("slug"))
    r = s.get(f"{BASE}/api/sponsors/by-slug/pt-abc-indonesia", timeout=30)
    check("tautan lama masih hidup setelah nama berubah", r.status_code == 200, r.status_code)

    r = s.patch(f"{BASE}/api/sponsors/{sp['id']}", json={"slug": "PT ABC Nusantara Jaya!"}, timeout=30)
    check("slug manual dinormalisasi", r.json().get("slug") == "pt-abc-nusantara-jaya", r.json().get("slug"))

    r = s.get(f"{BASE}/api/sponsors/by-slug/slug-yang-tidak-ada", timeout=30)
    check("slug tidak dikenal → 404", r.status_code == 404, r.status_code)

    # -------------------------- SPONSOR UTAMA --------------------------
    r = s.patch(f"{BASE}/api/sponsors/{sp['id']}", json={"is_featured": True}, timeout=30)
    check("tandai sponsor utama", r.json().get("is_featured") is True, r.json().get("is_featured"))
    r = s.get(f"{BASE}/api/sponsors", params={"is_featured": True, "limit": 20}, timeout=30)
    check("filter sponsor utama bekerja", all(i.get("is_featured") for i in r.json()["items"]), r.json()["total"])
    r = s.get(f"{BASE}/api/sponsors", params={"limit": 50}, timeout=30)
    others = [i for i in r.json()["items"] if i["id"] != sp["id"]]
    check("sponsor lain TIDAK ikut jadi utama", all(not i.get("is_featured") for i in others),
          [(i["name"], i.get("is_featured")) for i in others])
finally:
    for mid in media_ids:
        s.delete(f"{BASE}/api/media/{mid}", timeout=30)
    for sid in sponsor_ids:
        s.delete(f"{BASE}/api/sponsors/{sid}", timeout=30)
    print("cleanup media:", media_ids, "sponsors:", sponsor_ids)

ok = sum(1 for r in results if r)
print(f"\n{ok}/{len(results)} PASS")
sys.exit(0 if ok == len(results) else 1)
