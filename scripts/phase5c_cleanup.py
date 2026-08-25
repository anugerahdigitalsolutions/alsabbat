"""Fase 5C — single-team cleanup.

Consolidates development/demo Team documents into ONE canonical ALSABBAT team.
Relationships (players, staff, matches, lineups, events, posts, media, gallery albums)
are re-pointed to the kept team — nothing but Team documents is deleted.

Usage:
    python phase5c_cleanup.py           # dry-run report
    python phase5c_cleanup.py --apply   # perform changes
"""
import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

KEEP_ID = "fa1680d3dbd647da8b6130a999540e7f"
CANONICAL_NAME = "ALSABBAT"
CANONICAL_SHORT = "ALSABBAT"
REL_COLLECTIONS = [
    "players",
    "staff",
    "matches",
    "match_lineups",
    "match_events",
    "posts",
    "media",
    "gallery_albums",
]
APPLY = "--apply" in sys.argv


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[
        os.environ.get("MONGODB_DB_NAME") or os.environ["DB_NAME"]
    ]

    keep = await db.teams.find_one({"id": KEEP_ID})
    if not keep:
        raise SystemExit(f"Team to keep not found: {KEEP_ID}")

    club = await db.clubs.find_one({})
    others = [t["id"] async for t in db.teams.find({"id": {"$ne": KEEP_ID}}, {"id": 1})]
    print(f"teams before: {len(others) + 1} | keep: {KEEP_ID} | to remove: {len(others)}")

    for coll in REL_COLLECTIONS:
        n = await db[coll].count_documents({"team_id": {"$in": others}})
        print(f"  re-point {coll}: {n}")
        if APPLY and n:
            await db[coll].update_many(
                {"team_id": {"$in": others}}, {"$set": {"team_id": KEEP_ID}}
            )

    if APPLY:
        update = {"name": CANONICAL_NAME, "short_name": CANONICAL_SHORT, "status": "ACTIVE"}
        if club and keep.get("club_id") != club["id"]:
            update["club_id"] = club["id"]
        await db.teams.update_one({"id": KEEP_ID}, {"$set": update})
        result = await db.teams.delete_many({"id": {"$in": others}})
        print(f"deleted teams: {result.deleted_count}")
        print("teams after:", await db.teams.count_documents({}))
    else:
        print("dry-run only — rerun with --apply")


asyncio.run(main())
