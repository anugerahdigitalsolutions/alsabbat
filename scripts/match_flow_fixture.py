"""Fixture sementara untuk validasi alur Match / Hasil Pertandingan / Kartu.

  python scripts/match_flow_fixture.py setup     -> tim, 2 pemain, 2 match lampau tanpa skor
  python scripts/match_flow_fixture.py status    -> ringkasan skor & event tiap match
  python scripts/match_flow_fixture.py teardown  -> hapus semua fixture (termasuk event baru)
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import uuid

import requests

BASE = os.environ.get("VERIFY_API_BASE", "http://localhost:8001/api")
STATE = "/tmp/match_flow_fixture.json"


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
        json={"club_id": club_id, "name": f"Tim Flow {suffix}", "category": "FIRST_TEAM"},
        timeout=20,
    ).json()
    players = []
    for index, name in enumerate(("VIDISTA UJI", "RAKA UJI"), start=1):
        players.append(
            requests.post(
                f"{BASE}/players",
                headers=head,
                json={
                    "team_id": team["id"],
                    "full_name": f"{name} {suffix}",
                    "display_name": f"{name}",
                    "jersey_number": 10 + index,
                },
                timeout=20,
            ).json()
        )
    today = dt.date.today()
    matches = []
    for index, (delta, venue) in enumerate(((3, "HOME"), (10, "AWAY")), start=1):
        res = requests.post(
            f"{BASE}/matches",
            headers=head,
            json={
                "team_id": team["id"],
                "opponent": {"name": f"Lawan {index} {suffix}"},
                "date": (today - dt.timedelta(days=delta)).isoformat(),
                "time": "16:00",
                "venue": "Stadion Uji",
                "venue_type": venue,
                "status": "SCHEDULED",
                "formation": "4-3-3",
                "opponent_formation": "4-4-2",
            },
            timeout=20,
        )
        matches.append(res.json())
    state = {
        "suffix": suffix,
        "team_id": team["id"],
        "player_ids": [p["id"] for p in players],
        "player_names": [p["display_name"] for p in players],
        "match_ids": [m["id"] for m in matches],
    }
    with open(STATE, "w", encoding="utf-8") as handle:
        json.dump(state, handle)
    print(json.dumps(state, indent=2))


def status() -> None:
    with open(STATE, "r", encoding="utf-8") as handle:
        state = json.load(handle)
    for match_id in state["match_ids"]:
        match = requests.get(f"{BASE}/matches/{match_id}", timeout=20).json()
        events = requests.get(
            f"{BASE}/match-events", params={"match_id": match_id, "limit": 50}, timeout=20
        ).json()
        print(
            f"{match['date']} {match['opponent']['name']} [{match['venue_type']}] "
            f"status={match['status']} skor={match.get('home_score')}-{match.get('away_score')} "
            f"card_feed_bg={bool(match.get('card_feed_background'))} zoom={match.get('card_feed_zoom')}"
        )
        for event in events["items"]:
            print(
                f"    event {event['type']:16} minute={event.get('minute')} "
                f"player_id={event.get('player_id')} related={event.get('related_player_id')} "
                f"name={event.get('player_name')}"
            )
    lb = requests.get(f"{BASE}/players/stats/leaderboard", timeout=20).json()
    print("TOP SCORER:", [(i.get("display_name"), i.get("goals"), i.get("assists")) for i in lb.get("items", [])])


def teardown() -> None:
    if not os.path.exists(STATE):
        print("tidak ada state fixture")
        return
    head = {"Authorization": f"Bearer {login()}"}
    with open(STATE, "r", encoding="utf-8") as handle:
        state = json.load(handle)
    removed = 0
    for match_id in state["match_ids"]:
        events = requests.get(
            f"{BASE}/match-events", params={"match_id": match_id, "limit": 100}, timeout=20
        ).json()
        for event in events.get("items", []):
            requests.delete(f"{BASE}/match-events/{event['id']}", headers=head, timeout=20)
            removed += 1
        requests.delete(f"{BASE}/matches/{match_id}", headers=head, timeout=20)
    for player_id in state["player_ids"]:
        requests.delete(f"{BASE}/players/{player_id}", headers=head, timeout=20)
    requests.delete(f"{BASE}/teams/{state['team_id']}", headers=head, timeout=20)
    os.remove(STATE)
    print(f"fixture dihapus ({removed} event, 2 match, 2 pemain, 1 tim)")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "setup"
    {"setup": setup, "status": status, "teardown": teardown}[action]()
