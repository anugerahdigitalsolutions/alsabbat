"""Temporary visual-verification seed — writes ONLY into a throwaway database.

Never point this at the production/dev database: it refuses to run unless the
active database name contains 'verify' or 'check'.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import Collections, get_db  # noqa: E402


async def main() -> None:
    db = get_db()
    if not any(token in db.name for token in ("verify", "check")):
        raise SystemExit(f"refusing to seed '{db.name}' — throwaway database required")

    await db[Collections.TEAMS].delete_many({})
    team = {"id": "t-verify", "club_id": "c1", "name": "ALSABBAT", "short_name": "ALSABBAT",
            "category": "FIRST_TEAM", "status": "ACTIVE", "created_at": "2026-01-01T00:00:00Z"}
    await db[Collections.TEAMS].insert_one(dict(team))

    await db[Collections.SEASONS].insert_one(
        {"id": "s-verify", "club_id": "c1", "name": "2026/2027", "status": "ACTIVE",
         "start_date": "2026-01-01", "created_at": "2026-01-01T00:00:00Z"}
    )
    await db[Collections.COMPETITIONS].insert_one(
        {"id": "cp-verify", "season_id": "s-verify", "name": "Liga Komunitas", "type": "LEAGUE",
         "status": "ACTIVE", "created_at": "2026-01-01T00:00:00Z"}
    )
    await db[Collections.PLAYERS].insert_one(
        {"id": "p-verify", "team_id": "t-verify", "full_name": "Verifikasi Pemain",
         "display_name": "V. Pemain", "jersey_number": 10, "position": "FORWARD",
         "status": "ACTIVE", "created_at": "2026-01-01T00:00:00Z"}
    )

    matches = [
        {"id": "mv1", "team_id": "t-verify", "season_id": "s-verify", "competition_id": "cp-verify",
         "opponent": {"name": "Garuda United"}, "date": "2026-03-01", "time": "15:30",
         "venue": "Stadion Komunitas", "venue_type": "HOME", "status": "FINISHED",
         "home_score": 3, "away_score": 1, "formation": "4-3-3", "status_note": None,
         "created_at": "2026-01-01T00:00:00Z"},
        {"id": "mv2", "team_id": "t-verify", "season_id": "s-verify", "competition_id": "cp-verify",
         "opponent": {"name": "Garuda United"}, "date": "2026-04-05", "time": "16:00",
         "venue": "Lapangan Garuda", "venue_type": "AWAY", "status": "FINISHED",
         "home_score": 2, "away_score": 2, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "mv3", "team_id": "t-verify", "season_id": "s-verify", "competition_id": "cp-verify",
         "opponent": {"name": "Garuda United"}, "date": "2026-12-20", "time": "19:30",
         "venue": "Stadion Komunitas", "venue_type": "HOME", "status": "SCHEDULED",
         "home_score": None, "away_score": None, "formation": "4-3-3",
         "created_at": "2026-01-01T00:00:00Z"},
    ]
    await db[Collections.MATCHES].insert_many([dict(m) for m in matches])

    await db[Collections.MATCH_LINEUPS].insert_many(
        [
            {"id": "lv1", "match_id": "mv1", "team_id": "t-verify", "player_id": "p-verify",
             "role": "STARTING", "position": "FORWARD", "shirt_number": 10, "is_captain": True,
             "display_order": 1, "created_at": "2026-01-01T00:00:00Z"},
            {"id": "lv2", "match_id": "mv2", "team_id": "t-verify", "player_id": "p-verify",
             "role": "SUBSTITUTE", "position": "FORWARD", "shirt_number": 10,
             "display_order": 1, "created_at": "2026-01-01T00:00:00Z"},
        ]
    )
    await db[Collections.MATCH_EVENTS].insert_many(
        [
            {"id": "ev1", "match_id": "mv1", "player_id": "p-verify", "type": "GOAL", "side": "CLUB",
             "minute": 23, "display_order": 1, "created_at": "2026-01-01T00:00:00Z"},
            {"id": "ev2", "match_id": "mv1", "player_id": "p-verify", "type": "YELLOW_CARD",
             "side": "CLUB", "minute": 55, "display_order": 2, "created_at": "2026-01-01T00:00:00Z"},
            {"id": "ev3", "match_id": "mv2", "player_id": "p-verify", "type": "ASSIST", "side": "CLUB",
             "minute": 70, "display_order": 1, "created_at": "2026-01-01T00:00:00Z"},
        ]
    )
    await db[Collections.POSTS].insert_one(
        {"id": "post-verify", "title": "Laporan Pertandingan: ALSABBAT 3-1 Garuda United",
         "slug": "laporan-alsabbat-3-1-garuda-united", "post_type": "MATCH_REPORT",
         "status": "PUBLISHED", "excerpt": "Tiga poin di kandang lewat penampilan solid sepanjang 90 menit.",
         "content": "Ringkasan laporan pertandingan untuk verifikasi tampilan.",
         "match_id": "mv1", "published_at": "2026-03-01T12:00:00Z", "seo": {},
         "created_at": "2026-03-01T12:00:00Z"}
    )
    print("seeded throwaway database:", db.name)


if __name__ == "__main__":
    asyncio.run(main())
