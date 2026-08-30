"""Fixture pertandingan sementara untuk validasi penghapusan Match Lineups.

  python scripts/match_ui_fixture.py setup     -> tim, pemain, pertandingan + 3 event
                                                  (+1 dokumen match_lineups historis
                                                   ditulis langsung ke Mongo untuk
                                                   membuktikan data historis aman)
  python scripts/match_ui_fixture.py teardown  -> hapus semua fixture
"""
from __future__ import annotations

import json
import os
import sys
import uuid

import requests

BASE = os.environ.get("VERIFY_API_BASE", "http://localhost:8001/api")
STATE = "/tmp/match_ui_fixture.json"


def mongo():
    from pymongo import MongoClient

    env = {}
    with open("/app/backend/.env", "r", encoding="utf-8") as handle:
        for line in handle:
            if "=" in line and not line.strip().startswith("#"):
                key, value = line.strip().split("=", 1)
                env[key] = value.strip().strip('"')
    client = MongoClient(env["MONGO_URL"])
    return client, client[env["MONGODB_DB_NAME"]]


def login() -> str:
    res = requests.post(
        f"{BASE}/auth/login",
        json={"email": "admin@alsabbat.com", "password": "Alsabbat2026!"},
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
        json={"club_id": club_id, "name": f"Tim Match {suffix}", "category": "FIRST_TEAM"},
        timeout=20,
    ).json()
    player = requests.post(
        f"{BASE}/players",
        headers=head,
        json={
            "team_id": team["id"],
            "full_name": f"Pemain Match {suffix}",
            "display_name": f"MATCH {suffix}",
            "jersey_number": 10,
        },
        timeout=20,
    ).json()
    match = requests.post(
        f"{BASE}/matches",
        headers=head,
        json={
            "team_id": team["id"],
            "opponent": {"name": f"Lawan {suffix}"},
            "date": "2026-08-15",
            "time": "16:00",
            "venue": "Stadion Uji",
            "status": "FINISHED",
            "home_score": 2,
            "away_score": 1,
            "formation": "4-3-3",
            "opponent_formation": "4-4-2",
        },
        timeout=20,
    )
    match = match.json()
    events = []
    for payload in (
        {"type": "GOAL", "minute": 12, "player_id": player["id"], "side": "CLUB"},
        {"type": "YELLOW_CARD", "minute": 40, "player_id": player["id"], "side": "CLUB"},
        {"type": "SUBSTITUTION", "minute": 70, "player_id": player["id"], "side": "CLUB"},
    ):
        res = requests.post(
            f"{BASE}/match-events",
            headers=head,
            json={"match_id": match["id"], "team_id": team["id"], **payload},
            timeout=20,
        )
        events.append((res.status_code, res.json().get("id")))
    # Dokumen lineup historis (langsung ke Mongo, meniru data lama sebelum fitur dihapus).
    client, db = mongo()
    lineup_id = uuid.uuid4().hex
    db["match_lineups"].insert_one(
        {
            "id": lineup_id,
            "match_id": match["id"],
            "team_id": team["id"],
            "player_id": player["id"],
            "role": "STARTING",
            "display_order": 1,
            "status": "ACTIVE",
            "created_at": "2026-08-15T16:00:00",
            "updated_at": "2026-08-15T16:00:00",
        }
    )
    client.close()
    state = {
        "suffix": suffix,
        "team_id": team["id"],
        "player_id": player["id"],
        "match_id": match["id"],
        "events": events,
        "lineup_id": lineup_id,
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
    for status, event_id in state["events"]:
        if event_id:
            requests.delete(f"{BASE}/match-events/{event_id}", headers=head, timeout=20)
    requests.delete(f"{BASE}/matches/{state['match_id']}", headers=head, timeout=20)
    requests.delete(f"{BASE}/players/{state['player_id']}", headers=head, timeout=20)
    requests.delete(f"{BASE}/teams/{state['team_id']}", headers=head, timeout=20)
    client, db = mongo()
    db["match_lineups"].delete_one({"id": state["lineup_id"]})
    client.close()
    os.remove(STATE)
    print("fixture match dihapus")


if __name__ == "__main__":
    if (sys.argv[1] if len(sys.argv) > 1 else "setup") == "setup":
        setup()
    else:
        teardown()
