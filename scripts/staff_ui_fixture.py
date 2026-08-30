"""Fixture sementara untuk uji UI Staff (dipakai screenshot/browser check).

Jalankan:
  python scripts/staff_ui_fixture.py setup    -> buat tim + pemain + staf gaya lama
  python scripts/staff_ui_fixture.py teardown -> hapus semua fixture yang dibuat
"""
from __future__ import annotations

import json
import os
import sys
import uuid

import requests

BASE = os.environ.get("VERIFY_API_BASE", "http://localhost:8001/api")
STATE = "/tmp/staff_ui_fixture.json"


def login() -> str:
    res = requests.post(
        f"{BASE}/auth/login",
        json={
            "email": os.environ.get("VERIFY_ADMIN_EMAIL", "admin@alsabbat.com"),
            "password": os.environ.get("VERIFY_ADMIN_PASSWORD", "Alsabbat2026!"),
        },
        timeout=20,
    )
    res.raise_for_status()
    return res.json()["access_token"]


def setup() -> None:
    head = {"Authorization": f"Bearer {login()}"}
    suffix = uuid.uuid4().hex[:6]
    club_id = requests.get(f"{BASE}/club", timeout=20).json()["items"][0]["id"]
    team = requests.post(
        f"{BASE}/teams",
        headers=head,
        json={"club_id": club_id, "name": f"Tim UI {suffix}", "category": "FIRST_TEAM"},
        timeout=20,
    ).json()
    player = requests.post(
        f"{BASE}/players",
        headers=head,
        json={
            "team_id": team["id"],
            "full_name": f"Pemain UI {suffix}",
            "display_name": f"PEMAIN UI {suffix}",
            "jersey_number": 9,
            "photo": "/api/media/files/image/uji/foto-pemain-ui.jpg",
        },
        timeout=20,
    ).json()
    legacy = requests.post(
        f"{BASE}/staff",
        headers=head,
        json={
            "team_id": team["id"],
            "name": f"Staf Lama UI {suffix}",
            "role": "TEAM_MANAGER",
            "role_label": "Manajer Tim",
        },
        timeout=20,
    ).json()
    state = {
        "suffix": suffix,
        "team_id": team["id"],
        "player_id": player["id"],
        "player_photo": player.get("photo"),
        "player_name": player.get("display_name"),
        "legacy_staff_id": legacy["id"],
    }
    with open(STATE, "w", encoding="utf-8") as handle:
        json.dump(state, handle)
    print(json.dumps(state, indent=2))


def teardown() -> None:
    if not os.path.exists(STATE):
        print("tidak ada state fixture")
        return
    head = {"Authorization": f"Bearer {login()}"}
    with open(STATE, "r", encoding="utf-8") as handle:
        state = json.load(handle)
    # Semua staf pada tim fixture (termasuk yang dibuat lewat UI) dihapus.
    staff = requests.get(
        f"{BASE}/staff", params={"team_id": state["team_id"], "limit": 100}, timeout=20
    ).json()
    for item in staff.get("items", []):
        requests.delete(f"{BASE}/staff/{item['id']}", headers=head, timeout=20)
    requests.delete(f"{BASE}/players/{state['player_id']}", headers=head, timeout=20)
    requests.delete(f"{BASE}/teams/{state['team_id']}", headers=head, timeout=20)
    os.remove(STATE)
    print(f"fixture dihapus ({len(staff.get('items', []))} staf, 1 pemain, 1 tim)")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "setup"
    if action == "setup":
        setup()
    else:
        teardown()
