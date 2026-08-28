"""Verifikasi P0: slot galeri foto Pemain & Staf tidak bergeser.

Jalankan: python scripts/p0_gallery_slots_verify.py [base_url]
Data uji dibuat lalu DIHAPUS kembali.
"""
import os
import sys

import requests

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@alsabbat.com")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "Alsabbat2026!")

A = "/api/media/files/slot-a.jpg"
B = "/api/media/files/slot-b.jpg"
C = "/api/media/files/slot-c.jpg"

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail else ""))


s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
r.raise_for_status()
s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"

teams = s.get(f"{BASE}/api/teams", params={"limit": 1}, timeout=30).json()["items"]
team_id = teams[0]["id"]

created = []
try:
    # ---- PEMAIN ----
    r = s.post(
        f"{BASE}/api/players",
        json={"team_id": team_id, "full_name": "QA Slot Tester", "gallery_images": ["", "", C]},
        timeout=30,
    )
    check("player create 201", r.status_code in (200, 201), r.status_code)
    player = r.json()
    created.append(("players", player["id"]))
    check("create: slot1 kosong & slot3 terisi", player["gallery_images"] == ["", "", C], player["gallery_images"])

    got = s.get(f"{BASE}/api/players/{player['id']}", timeout=30).json()
    check("reload: posisi slot tetap", got["gallery_images"] == ["", "", C], got["gallery_images"])

    r = s.patch(f"{BASE}/api/players/{player['id']}", json={"gallery_images": [A, "", C]}, timeout=30)
    check("patch slot1+slot3", r.json()["gallery_images"] == [A, "", C], r.json()["gallery_images"])
    got = s.get(f"{BASE}/api/players/{player['id']}", timeout=30).json()
    check("reload slot1+slot3 tetap", got["gallery_images"] == [A, "", C], got["gallery_images"])

    # hapus slot 1 -> slot 3 tidak bergeser
    r = s.patch(f"{BASE}/api/players/{player['id']}", json={"gallery_images": ["", "", C]}, timeout=30)
    check("hapus slot1 tidak menggeser slot3", r.json()["gallery_images"] == ["", "", C], r.json()["gallery_images"])

    # ganti slot 2 saja
    r = s.patch(f"{BASE}/api/players/{player['id']}", json={"gallery_images": ["", B, C]}, timeout=30)
    check("ganti slot2 saja", r.json()["gallery_images"] == ["", B, C], r.json()["gallery_images"])

    # maksimal 3 slot
    r = s.patch(
        f"{BASE}/api/players/{player['id']}",
        json={"gallery_images": [A, B, C, "/api/media/files/slot-d.jpg"]},
        timeout=30,
    )
    check("maksimal 3 slot", r.json()["gallery_images"] == [A, B, C], r.json()["gallery_images"])

    # data lama rapat tetap identik
    r = s.patch(f"{BASE}/api/players/{player['id']}", json={"gallery_images": [A, B]}, timeout=30)
    check("data lama rapat tetap identik", r.json()["gallery_images"] == [A, B], r.json()["gallery_images"])

    # semua kosong -> []
    r = s.patch(f"{BASE}/api/players/{player['id']}", json={"gallery_images": ["", "", ""]}, timeout=30)
    check("semua slot kosong -> []", r.json()["gallery_images"] == [], r.json()["gallery_images"])

    # ---- STAF ----
    r = s.post(
        f"{BASE}/api/staff",
        json={"team_id": team_id, "name": "QA Slot Staf", "gallery_images": ["", "", C]},
        timeout=30,
    )
    check("staff create 201", r.status_code in (200, 201), r.status_code)
    staff = r.json()
    created.append(("staff", staff["id"]))
    check("staff: slot3 tetap", staff["gallery_images"] == ["", "", C], staff["gallery_images"])
    got = s.get(f"{BASE}/api/staff/{staff['id']}", timeout=30).json()
    check("staff reload: slot3 tetap", got["gallery_images"] == ["", "", C], got["gallery_images"])
finally:
    for resource, rid in created:
        s.delete(f"{BASE}/api/{resource}/{rid}", timeout=30)
    print("cleanup:", created)

ok = sum(1 for _, c, _ in results if c)
print(f"\n{ok}/{len(results)} PASS")
sys.exit(0 if ok == len(results) else 1)
