"""Verifikasi baseline statistik historis (pemain & klub).

Non-destruktif: seluruh data uji (team, player, season, match, match event) dibuat
lalu DIHAPUS kembali di akhir. Baseline klub dikembalikan ke nilai semula.
"""
import os
import sys

import requests

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
EMAIL = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@alsabbat.com")
PASSWORD = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "Alsabbat2026!")

results = []


def check(label, actual, expected):
    ok = actual == expected
    results.append(ok)
    print(f"{'OK  ' if ok else 'FAIL'} {label}: {actual} (harap {expected})")


def main():
    token = requests.post(
        f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30
    ).json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}

    club = requests.get(f"{BASE}/api/club/active", timeout=30).json()["club"]
    club_id = club["id"]
    club_backup = {k: club.get(k) or 0 for k in ("historical_played", "historical_wins", "historical_draws", "historical_losses")}

    created = {"match_events": [], "matches": [], "players": [], "seasons": [], "teams": []}
    try:
        # ---------------------------------------------------------------- klub baseline
        requests.patch(
            f"{BASE}/api/club/{club_id}",
            headers=h,
            json={
                "historical_played": 120,
                "historical_wins": 75,
                "historical_draws": 15,
                "historical_losses": 30,
            },
            timeout=30,
        ).raise_for_status()
        saved = requests.get(f"{BASE}/api/club/active", timeout=30).json()["club"]
        check("klub baseline main", saved.get("historical_played"), 120)
        check("klub baseline menang", saved.get("historical_wins"), 75)
        check("klub baseline seri", saved.get("historical_draws"), 15)
        check("klub baseline kalah", saved.get("historical_losses"), 30)

        # ---------------------------------------------------------------- pemain baseline
        team = requests.post(
            f"{BASE}/api/teams", headers=h, json={"club_id": club_id, "name": "Tim Uji Baseline"}, timeout=30
        ).json()
        created["teams"].append(team["id"])
        player = requests.post(
            f"{BASE}/api/players",
            headers=h,
            json={
                "team_id": team["id"],
                "full_name": "VIDISTA UJI",
                "position": "FORWARD",
                "status": "ACTIVE",
                "historical_goals": 80,
                "historical_assists": 25,
            },
            timeout=30,
        ).json()
        created["players"].append(player["id"])
        check("pemain baseline gol", player.get("historical_goals"), 80)
        check("pemain baseline assist", player.get("historical_assists"), 25)

        board = requests.get(f"{BASE}/api/players/stats/leaderboard", timeout=30).json()
        row = next((i for i in board["items"] if i["player_id"] == player["id"]), None)
        check("leaderboard tampil tanpa match", bool(row), True)
        check("leaderboard gol = baseline", row and row["goals"], 80)
        check("leaderboard assist = baseline", row and row["assists"], 25)

        stats = requests.get(f"{BASE}/api/players/{player['id']}/statistics", timeout=30).json()
        check("statistik pemain historical", stats.get("historical"), {"goals": 80, "assists": 25})

        # ------------------------------------------------- match + events di atas baseline
        season = requests.post(
            f"{BASE}/api/seasons",
            headers=h,
            json={"club_id": club_id, "name": "Musim Uji Baseline", "start_date": "2026-01-01", "status": "ACTIVE"},
            timeout=30,
        ).json()
        created["seasons"].append(season["id"])
        match = requests.post(
            f"{BASE}/api/matches",
            headers=h,
            json={
                "team_id": team["id"],
                "season_id": season["id"],
                "opponent": {"name": "Lawan Uji"},
                "date": "2026-02-01",
                "status": "FINISHED",
                "venue_type": "HOME",
                "home_score": 2,
                "away_score": 0,
            },
            timeout=30,
        ).json()
        created["matches"].append(match["id"])
        for payload in (
            {"match_id": match["id"], "type": "GOAL", "minute": 10, "player_id": player["id"]},
            {"match_id": match["id"], "type": "GOAL", "minute": 55, "player_id": player["id"]},
            {"match_id": match["id"], "type": "ASSIST", "minute": 70, "player_id": player["id"]},
        ):
            ev = requests.post(f"{BASE}/api/match-events", headers=h, json=payload, timeout=30).json()
            created["match_events"].append(ev["id"])

        board = requests.get(
            f"{BASE}/api/players/stats/leaderboard", params={"season_id": season["id"]}, timeout=30
        ).json()
        row = next((i for i in board["items"] if i["player_id"] == player["id"]), None)
        check("total gol = 80 + 2 event", row and row["goals"], 82)
        check("total assist = 25 + 1 event", row and row["assists"], 26)
        check("baseline tetap terlihat terpisah", row and row["historical_goals"], 80)
        check("top scorer urutan pertama", board["items"][0]["player_id"], player["id"])
        check("events_available", board.get("events_available"), True)

        stats = requests.get(f"{BASE}/api/players/{player['id']}/statistics", timeout=30).json()
        season_row = next((s for s in stats["seasons"] if s["season_id"] == season["id"]), None)
        check("statistik musim (event murni) gol", season_row and season_row["goals"], 2)
        check("statistik musim (event murni) assist", season_row and season_row["assists"], 1)
    finally:
        for ev in created["match_events"]:
            requests.delete(f"{BASE}/api/match-events/{ev}", headers=h, timeout=30)
        for m in created["matches"]:
            requests.delete(f"{BASE}/api/matches/{m}", headers=h, timeout=30)
        for p in created["players"]:
            requests.delete(f"{BASE}/api/players/{p}", headers=h, timeout=30)
        for s in created["seasons"]:
            requests.delete(f"{BASE}/api/seasons/{s}", headers=h, timeout=30)
        for t in created["teams"]:
            requests.delete(f"{BASE}/api/teams/{t}", headers=h, timeout=30)
        requests.patch(f"{BASE}/api/club/{club_id}", headers=h, json=club_backup, timeout=30)
        print("cleanup: data uji dihapus, baseline klub dikembalikan ke", club_backup)

    print(f"\nHASIL: {sum(results)} lolos, {len(results) - sum(results)} gagal")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
