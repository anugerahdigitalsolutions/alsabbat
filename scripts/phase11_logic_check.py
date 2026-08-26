"""Phase 11 logic verification — runs against a THROWAWAY database.

Usage: MONGODB_DB_NAME=alsabbat_phase11_verify python scripts/phase11_logic_check.py

It creates a temporary database (never the production/dev one), asserts the
derived Head-to-Head and Player Season Statistics logic, then drops it.
No document is ever written to the real application database.
"""
import asyncio
import os
import sys

DB_NAME = "alsabbat_phase11_verify"
os.environ["MONGODB_DB_NAME"] = DB_NAME
os.environ.setdefault("MONGODB_URI", os.environ.get("MONGO_URL", "mongodb://localhost:27017"))

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import Collections, get_client, get_db  # noqa: E402
from app.api.routes.matches import _head_to_head  # noqa: E402
from app.api.routes.players import player_statistics  # noqa: E402


async def main() -> int:
    db = get_db()
    assert db.name == DB_NAME, f"refusing to run against {db.name}"

    await db[Collections.MATCHES].insert_many(
        [
            {"id": "m1", "status": "FINISHED", "venue_type": "HOME", "home_score": 3, "away_score": 1,
             "date": "2026-01-10", "opponent": {"name": "Rival FC"}, "season_id": "s1"},
            {"id": "m2", "status": "FINISHED", "venue_type": "AWAY", "home_score": 2, "away_score": 2,
             "date": "2026-02-10", "opponent": {"name": "rival fc"}, "season_id": "s1"},
            {"id": "m3", "status": "FINISHED", "venue_type": "AWAY", "home_score": 4, "away_score": 0,
             "date": "2026-03-10", "opponent": {"name": "Rival FC"}, "season_id": "s2"},
            {"id": "m4", "status": "SCHEDULED", "venue_type": "HOME", "home_score": None, "away_score": None,
             "date": "2026-04-10", "opponent": {"name": "Rival FC"}, "season_id": "s2"},
            {"id": "m5", "status": "FINISHED", "venue_type": "HOME", "home_score": 1, "away_score": 0,
             "date": "2026-03-20", "opponent": {"name": "Other FC"}, "season_id": "s2"},
        ]
    )
    await db[Collections.SEASONS].insert_many(
        [{"id": "s1", "name": "2025/2026"}, {"id": "s2", "name": "2026/2027"}]
    )

    h2h = await _head_to_head({"id": "m4", "opponent": {"name": "Rival FC"}})
    assert h2h["available"] is True, h2h
    assert h2h["matches_played"] == 3, h2h
    assert (h2h["wins"], h2h["draws"], h2h["losses"]) == (1, 1, 1), h2h
    # 3 + 2 (away) + 0 (away) scored ; 1 + 2 + 4 conceded
    assert h2h["goals_scored"] == 5, h2h
    assert h2h["goals_conceded"] == 7, h2h
    assert len(h2h["recent"]) == 3, h2h
    print("H2H aggregation ...................... OK", h2h["wins"], h2h["draws"], h2h["losses"])

    none_h2h = await _head_to_head({"id": "x", "opponent": {"name": "Unknown FC"}})
    assert none_h2h["available"] is False and none_h2h["matches_played"] == 0
    print("H2H empty state ...................... OK")

    # ---------------------------------------------------------- player stats
    await db[Collections.PLAYERS].insert_one({"id": "p1", "full_name": "Player One"})
    await db[Collections.MATCH_LINEUPS].insert_many(
        [
            {"id": "l1", "match_id": "m1", "player_id": "p1", "role": "STARTING"},
            {"id": "l2", "match_id": "m2", "player_id": "p1", "role": "SUBSTITUTE"},
            {"id": "l3", "match_id": "m3", "player_id": "p1", "role": "STARTING"},
            {"id": "l4", "match_id": "m5", "player_id": "p1", "role": "UNUSED_SUBSTITUTE"},
        ]
    )
    await db[Collections.MATCH_EVENTS].insert_many(
        [
            {"id": "e1", "match_id": "m1", "player_id": "p1", "type": "GOAL"},
            {"id": "e2", "match_id": "m1", "player_id": "p1", "type": "PENALTY_SCORED"},
            {"id": "e3", "match_id": "m2", "player_id": "p1", "type": "ASSIST"},
            {"id": "e4", "match_id": "m2", "player_id": "p1", "type": "YELLOW_CARD"},
            {"id": "e5", "match_id": "m1", "player_id": "p2", "type": "RED_CARD"},
        ]
    )

    stats = await player_statistics("p1", season_id=None)
    assert stats["available"] is True
    by_season = {s["season_id"]: s for s in stats["seasons"]}
    s1 = by_season["s1"]
    assert (s1["appearances"], s1["starts"], s1["substitute_appearances"]) == (2, 1, 1), s1
    assert s1["goals"] == 2 and s1["assists"] == 1 and s1["yellow_cards"] == 1 and s1["red_cards"] == 0, s1
    assert s1["events_available"] is True
    s2 = by_season["s2"]
    # m3 has no events at all and m5 was an unused substitute -> 1 appearance, no fake zeros
    assert s2["appearances"] == 1 and s2["starts"] == 1, s2
    assert s2["goals"] is None and s2["assists"] is None and s2["events_available"] is False, s2
    print("Player statistics (derived) .......... OK", s1["goals"], "goals in", s1["season_name"])
    print("No fake zeros when events missing .... OK", s2["goals"])

    filtered = await player_statistics("p1", season_id="s1")
    assert len(filtered["seasons"]) == 1 and filtered["seasons"][0]["season_id"] == "s1"
    print("Season filter ........................ OK")

    empty = await db[Collections.PLAYERS].insert_one({"id": "p9", "full_name": "No Lineups"})
    assert empty.inserted_id
    no_stats = await player_statistics("p9", season_id=None)
    assert no_stats["available"] is False and no_stats["seasons"] == []
    print("Statistics empty state ............... OK")
    return 0


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    try:
        code = loop.run_until_complete(main())
    finally:
        client = get_client()
        loop.run_until_complete(client.drop_database(DB_NAME))
        print(f"temporary database '{DB_NAME}' dropped")
        loop.close()
    sys.exit(code)
