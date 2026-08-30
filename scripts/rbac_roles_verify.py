"""Verifikasi RBAC role baru (non-destruktif: akun uji dibuat lalu dihapus)."""
import os
import sys

import requests

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
ADMIN_EMAIL = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@alsabbat.com")
ADMIN_PASSWORD = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "Alsabbat2026!")
PASSWORD = "RbacUji2026!"

CASES = {
    "MATCH_ADMIN": [
        ("GET", "/api/users", 403),
        ("GET", "/api/baraya/admin/list", 403),
        ("GET", "/api/system/status", 403),
        ("PATCH", "/api/club/CLUB_ID", 403),
        ("DELETE", "/api/matches/tidak-ada", 404),
    ],
    "PLAYER_STAFF_ADMIN": [
        ("GET", "/api/users", 403),
        ("GET", "/api/baraya/admin/list", 200),
        ("PATCH", "/api/club/CLUB_ID", 403),
        ("DELETE", "/api/players/tidak-ada", 404),
    ],
    "FINANCE_ADMIN": [
        ("GET", "/api/merchandise/orders", 200),
        ("GET", "/api/system/status", 403),
        ("GET", "/api/users", 403),
    ],
    "IT_ADMIN": [
        ("GET", "/api/system/status", 200),
        ("GET", "/api/merchandise/orders", 403),
        ("GET", "/api/users", 403),
    ],
    "MEDIA_CONTENT_ADMIN": [
        ("GET", "/api/users", 403),
        ("DELETE", "/api/content/posts/tidak-ada", 404),
        ("DELETE", "/api/matches/tidak-ada", 403),
    ],
    "STORE_MANAGER": [
        ("GET", "/api/merchandise/orders", 200),
        ("DELETE", "/api/merchandise/catalog/products/tidak-ada", 404),
        ("GET", "/api/system/status", 403),
    ],
    "CLUB_ADMIN": [
        ("PATCH", "/api/club/CLUB_ID", 200),
        ("DELETE", "/api/players/tidak-ada", 403),
        ("GET", "/api/users", 403),
    ],
}


def login(email, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def main():
    admin = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    ah = {"Authorization": f"Bearer {admin}"}
    club = requests.get(f"{BASE}/api/club/active", timeout=30).json()["club"]
    club_id = club["id"]
    # PATCH uji memakai nilai yang sudah ada → tidak mengubah data klub.
    club_location = club.get("location") or ""

    ok = fail = 0
    created = []
    try:
        for role, checks in CASES.items():
            email = f"uji.{role.lower()}@sandbox-alsabbat.dev"
            res = requests.post(
                f"{BASE}/api/users",
                headers=ah,
                json={"name": f"Uji {role}", "email": email, "role": role, "password": PASSWORD, "is_active": True},
                timeout=30,
            )
            if res.status_code != 201:
                print(f"FAIL create {role}: {res.status_code} {res.text[:160]}")
                fail += 1
                continue
            created.append(res.json()["id"])
            token = login(email, PASSWORD)
            headers = {"Authorization": f"Bearer {token}"}
            for method, path, expected in checks:
                url = f"{BASE}{path.replace('CLUB_ID', club_id)}"
                body = {"location": club_location} if method == "PATCH" else None
                r = requests.request(method, url, headers=headers, json=body, timeout=30)
                mark = "OK  " if r.status_code == expected else "FAIL"
                if r.status_code == expected:
                    ok += 1
                else:
                    fail += 1
                print(f"{mark} {role:<20} {method:<6} {path:<45} {r.status_code} (harap {expected})")
    finally:
        for user_id in created:
            requests.delete(f"{BASE}/api/users/{user_id}", headers=ah, timeout=30)
        print(f"cleanup: {len(created)} akun uji dihapus")

    print(f"\nHASIL: {ok} lolos, {fail} gagal")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
