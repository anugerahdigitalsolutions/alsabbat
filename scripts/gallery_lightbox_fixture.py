"""Fixture uji Galeri: buat akun Baraya (peran PEMAIN), 2 media, dan 1 album publish.

Pemakaian:
  python scripts/gallery_lightbox_fixture.py <base_url> setup
  python scripts/gallery_lightbox_fixture.py <base_url> teardown
State disimpan di /tmp/gallery_lightbox_fixture.json.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import requests

BASE = sys.argv[1].rstrip("/")
ACTION = sys.argv[2] if len(sys.argv) > 2 else "setup"
STATE = Path("/tmp/gallery_lightbox_fixture.json")

ADMIN_EMAIL = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@alsabbat.com")
ADMIN_PASSWORD = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "Alsabbat2026!")
CUST_EMAIL = "uji.galeri@sandbox-alsabbat.dev"
CUST_PASSWORD = "Sandbox123"


def admin_headers():
    token = requests.post(
        f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def make_png(path, color):
    from PIL import Image, ImageDraw

    im = Image.new("RGB", (1600, 1000), color)
    d = ImageDraw.Draw(im)
    d.rectangle([200, 150, 1400, 850], fill=(252, 207, 43))
    im.save(path)


def setup():
    h = admin_headers()
    state = {"media": [], "album": None, "customer": None}

    # ---- akun Baraya + naikkan peran ke PEMAIN agar Galeri dapat diakses
    reg = requests.post(
        f"{BASE}/api/baraya/register",
        json={
            "full_name": "Uji Galeri",
            "email": CUST_EMAIL,
            "phone": "081234567890",
            "password": CUST_PASSWORD,
            "password_confirmation": CUST_PASSWORD,
        },
        timeout=30,
    )
    print("register:", reg.status_code, reg.text[:200])
    log = subprocess.run(
        ["bash", "-lc", "grep 'otp.debug_code' /var/log/supervisor/backend.out.log | tail -1"],
        capture_output=True,
        text=True,
    ).stdout
    code = "".join(ch for ch in log.split("code=")[-1] if ch.isdigit())[:6] if "code=" in log else None
    if not code:
        import re

        m = re.findall(r"\b\d{6}\b", log)
        code = m[-1] if m else None
    print("otp code:", code)
    ver = requests.post(
        f"{BASE}/api/baraya/otp/verify", json={"email": CUST_EMAIL, "code": code}, timeout=30
    )
    print("otp verify:", ver.status_code, ver.text[:200])

    listing = requests.get(f"{BASE}/api/baraya/admin/list", headers=h, timeout=30).json()
    cust = next((c for c in listing["items"] if c["email"] == CUST_EMAIL), None)
    state["customer"] = cust and cust["id"]
    requests.patch(
        f"{BASE}/api/baraya/admin/{state['customer']}/role", headers=h, json={"role": "PEMAIN"}, timeout=30
    )

    # ---- 2 media + album publish
    for i, color in enumerate([(1, 40, 145), (10, 10, 10)]):
        p = f"/tmp/gallery_uji_{i}.png"
        make_png(p, color)
        with open(p, "rb") as fh:
            res = requests.post(
                f"{BASE}/api/media/upload",
                headers=h,
                files={"file": (f"gallery_uji_{i}.png", fh, "image/png")},
                data={"alt_text": f"Foto Uji {i + 1}"},
                timeout=60,
            )
        state["media"].append(res.json()["id"])

    album = requests.post(
        f"{BASE}/api/gallery/albums",
        headers=h,
        json={"title": "Album Uji Lightbox", "description": "Album sementara untuk uji viewer."},
        timeout=30,
    ).json()
    state["album"] = album["id"]
    requests.post(
        f"{BASE}/api/gallery/albums/{album['id']}/media",
        headers=h,
        json={"media_ids": state["media"]},
        timeout=30,
    )
    requests.post(
        f"{BASE}/api/gallery/albums/{album['id']}/publish", headers=h, json={"published": True}, timeout=30
    )
    STATE.write_text(json.dumps(state))
    print("SETUP OK:", state)
    print("album_url:", f"/galeri/{album['id']}")


def teardown():
    h = admin_headers()
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    if state.get("album"):
        requests.delete(f"{BASE}/api/gallery/albums/{state['album']}", headers=h, timeout=30)
    for mid in state.get("media", []):
        requests.delete(f"{BASE}/api/media/{mid}/hard", headers=h, timeout=30)
    if state.get("customer"):
        requests.delete(f"{BASE}/api/baraya/admin/{state['customer']}", headers=h, timeout=30)
    if state.get("player"):
        requests.delete(f"{BASE}/api/players/{state['player']}", headers=h, timeout=30)
    if state.get("team"):
        requests.delete(f"{BASE}/api/teams/{state['team']}", headers=h, timeout=30)
    STATE.unlink(missing_ok=True)
    print("TEARDOWN done")
    print("media total:", requests.get(f"{BASE}/api/media?limit=1", headers=h, timeout=30).json()["total"])
    print("albums total:", requests.get(f"{BASE}/api/gallery/albums?limit=1", headers=h, timeout=30).json()["total"])
    print(
        "baraya total:",
        requests.get(f"{BASE}/api/baraya/admin/list?limit=1", headers=h, timeout=30).json().get("total"),
    )


if __name__ == "__main__":
    setup() if ACTION == "setup" else teardown()
