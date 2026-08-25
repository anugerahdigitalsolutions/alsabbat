"""Fase 5C — audit only. Prints team inventory + relationship counts (no writes)."""
import asyncio, os, re
from motor.motor_asyncio import AsyncIOMotorClient

DB = os.environ.get("MONGODB_DB_NAME") or os.environ.get("DB_NAME") or "alsabbat_platform"

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[DB]
    print("DB:", DB)
    teams = await db.teams.find({}).to_list(500)
    print("TOTAL TEAMS:", len(teams))
    for t in teams:
        tid = t["id"]
        rel = {
            "players": await db.players.count_documents({"team_id": tid}),
            "staff": await db.staff.count_documents({"team_id": tid}),
            "matches": await db.matches.count_documents({"team_id": tid}),
            "lineups": await db.match_lineups.count_documents({"team_id": tid}),
            "events": await db.match_events.count_documents({"team_id": tid}),
            "posts": await db.posts.count_documents({"team_id": tid}),
            "albums": await db.gallery_albums.count_documents({"team_id": tid}),
        }
        print(f"- {tid} | {t.get('name')} | {t.get('category')} | {t.get('status')} | {t.get('created_at')} | {rel}")
    for coll in ["players", "staff", "matches", "match_lineups", "match_events", "posts",
                 "gallery_albums", "media", "seasons", "competitions", "clubs", "users",
                 "categories", "authors", "sponsors", "achievements"]:
        print(coll, await db[coll].count_documents({}))
    client.close()

asyncio.run(main())
