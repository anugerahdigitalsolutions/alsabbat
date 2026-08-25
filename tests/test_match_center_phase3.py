"""ALSABBAT Phase-3 MATCH CENTER verification (self-cleaning).

Proves the Match Center V1 architecture works end to end:
  1. Meta enums expose lineup roles + event types
  2. RBAC: writes require a token (401 without, 200 with super admin)
  3. MatchLineup CRUD (one document per player per match)
  4. Duplicate lineup (same match + same player) is rejected by the unique index
  5. MatchEvent CRUD (timeline)
  6. /api/matches/{id}/relations aggregates lineups, events, player join and
     keeps gallery / media / news / social as separate references

Every document created here is deleted at the end — no permanent seed data.

Run: python /app/tests/test_match_center_phase3.py
"""
from __future__ import annotations

import os
import sys

import requests

BASE = os.environ.get("API_BASE", "http://localhost:8001/api")
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@alsabbat.com")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "Alsabbat2026!")

passed, failed = 0, 0
created = {"lineups": [], "events": [], "players": []}


def check(label: str, ok: bool, extra: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        print(f"  FAIL  {label} {extra}")


def main() -> int:
    session = requests.Session()

    meta = session.get(f"{BASE}/system/meta", timeout=20).json()
    check("meta exposes lineup_roles", "STARTING" in meta.get("lineup_roles", []))
    check("meta exposes match_event_types", "GOAL" in meta.get("match_event_types", []))

    login = session.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    check("super admin login", login.status_code == 200, str(login.status_code))
    if login.status_code != 200:
        return 1
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    matches = session.get(f"{BASE}/matches", params={"limit": 1}, timeout=20).json()
    if not matches.get("items"):
        print("  SKIP  no match available in the database — nothing to verify")
        return 0
    match = matches["items"][0]
    match_id, team_id = match["id"], match["team_id"]

    anon = session.post(f"{BASE}/match-lineups", json={"match_id": match_id, "team_id": team_id, "player_id": "x"}, timeout=20)
    check("lineup write requires auth", anon.status_code in (401, 403), str(anon.status_code))

    player = session.post(
        f"{BASE}/players",
        json={"team_id": team_id, "full_name": "PHASE3 CHECK PLAYER", "jersey_number": 77},
        headers=headers,
        timeout=20,
    )
    check("temp player created", player.status_code == 201, str(player.status_code))
    if player.status_code != 201:
        return 1
    player_id = player.json()["id"]
    created["players"].append(player_id)

    lineup = session.post(
        f"{BASE}/match-lineups",
        json={
            "match_id": match_id,
            "team_id": team_id,
            "player_id": player_id,
            "role": "STARTING",
            "position_label": "CB",
            "is_captain": True,
        },
        headers=headers,
        timeout=20,
    )
    check("lineup created", lineup.status_code == 201, str(lineup.status_code))
    if lineup.status_code == 201:
        created["lineups"].append(lineup.json()["id"])

    dup = session.post(
        f"{BASE}/match-lineups",
        json={"match_id": match_id, "team_id": team_id, "player_id": player_id},
        headers=headers,
        timeout=20,
    )
    check("duplicate lineup rejected", dup.status_code >= 400, str(dup.status_code))
    if dup.status_code == 201:
        created["lineups"].append(dup.json()["id"])

    event = session.post(
        f"{BASE}/match-events",
        json={
            "match_id": match_id,
            "team_id": team_id,
            "side": "CLUB",
            "type": "GOAL",
            "minute": 12,
            "player_id": player_id,
        },
        headers=headers,
        timeout=20,
    )
    check("event created", event.status_code == 201, str(event.status_code))
    if event.status_code == 201:
        created["events"].append(event.json()["id"])

    filtered = session.get(f"{BASE}/match-events", params={"match_id": match_id, "type": "GOAL"}, timeout=20).json()
    check("event filter by match_id + type", filtered.get("total", 0) >= 1)

    rel = session.get(f"{BASE}/matches/{match_id}/relations", timeout=20)
    check("relations endpoint ok", rel.status_code == 200, str(rel.status_code))
    payload = rel.json() if rel.status_code == 200 else {}
    check("relations include lineups", len(payload.get("lineups", [])) >= 1)
    check("relations include events", len(payload.get("events", [])) >= 1)
    check("relations join player data", player_id in (payload.get("players") or {}))
    for key in ("news", "gallery_albums", "images", "videos", "social_content"):
        check(f"relations keep '{key}' as separate reference", key in payload)
    check("match has no embedded media arrays", not any(
        isinstance(v, list) for k, v in (payload.get("match") or {}).items()
    ))

    # ------------------------------------------------------------- cleanup
    for lid in created["lineups"]:
        session.delete(f"{BASE}/match-lineups/{lid}", headers=headers, timeout=20)
    for eid in created["events"]:
        session.delete(f"{BASE}/match-events/{eid}", headers=headers, timeout=20)
    for pid in created["players"]:
        session.delete(f"{BASE}/players/{pid}", headers=headers, timeout=20)

    after = session.get(f"{BASE}/matches/{match_id}/relations", timeout=20).json()
    remaining = [x for x in after.get("lineups", []) if x["player_id"] == player_id]
    check("temporary verification data removed", not remaining)

    print(f"\n=== RESULT: {passed} passed, {failed} failed ===")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
