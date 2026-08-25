"""Fase 5D — detailed audit (READ-ONLY). Dumps every candidate record + references."""
import asyncio
import json
import os

from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[
        os.environ.get("MONGODB_DB_NAME") or os.environ["DB_NAME"]
    ]

    def dump(title, rows):
        print(f"\n===== {title} ({len(rows)}) =====")
        for r in rows:
            print(json.dumps(r, default=str)[:600])

    dump("TEAMS", await db.teams.find({}, {"_id": 0}).to_list(50))
    dump(
        "PLAYERS",
        await db.players.find(
            {}, {"_id": 0, "id": 1, "full_name": 1, "display_name": 1, "jersey_number": 1,
                 "team_id": 1, "photo": 1, "created_at": 1, "updated_at": 1}
        ).to_list(200),
    )
    dump(
        "STAFF",
        await db.staff.find({}, {"_id": 0, "id": 1, "name": 1, "role": 1, "team_id": 1,
                                 "photo": 1, "created_at": 1}).to_list(200),
    )
    dump(
        "MATCHES",
        await db.matches.find({}, {"_id": 0, "id": 1, "opponent": 1, "date": 1, "status": 1,
                                   "team_id": 1, "match_cover": 1, "created_at": 1}).to_list(200),
    )
    dump("LINEUPS", await db.match_lineups.find({}, {"_id": 0}).to_list(200))
    dump("EVENTS", await db.match_events.find({}, {"_id": 0}).to_list(200))
    dump(
        "POSTS",
        await db.posts.find({}, {"_id": 0, "id": 1, "title": 1, "slug": 1, "status": 1,
                                 "match_id": 1, "thumbnail": 1, "author_id": 1,
                                 "created_at": 1}).to_list(200),
    )
    dump(
        "ALBUMS",
        await db.gallery_albums.find({}, {"_id": 0, "id": 1, "title": 1, "slug": 1, "match_id": 1,
                                          "cover_media_id": 1, "status": 1, "media_ids": 1,
                                          "created_at": 1}).to_list(200),
    )
    dump(
        "MEDIA",
        await db.media.find({}, {"_id": 0, "id": 1, "title": 1, "file_name": 1, "file_type": 1,
                                 "url": 1, "storage_key": 1, "album_id": 1, "match_id": 1,
                                 "uploaded_by": 1, "created_at": 1}).to_list(200),
    )
    dump("SEASONS", await db.seasons.find({}, {"_id": 0, "id": 1, "name": 1, "created_at": 1}).to_list(50))
    dump("COMPETITIONS", await db.competitions.find({}, {"_id": 0, "id": 1, "name": 1, "created_at": 1}).to_list(50))
    dump("CATEGORIES", await db.categories.find({}, {"_id": 0, "id": 1, "name": 1, "slug": 1}).to_list(50))
    dump("AUTHORS", await db.authors.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(50))
    dump("SPONSORS", await db.sponsors.find({}, {"_id": 0, "id": 1, "name": 1, "logo": 1}).to_list(50))
    dump("USERS", await db.users.find({}, {"_id": 0, "id": 1, "email": 1, "role": 1, "created_at": 1}).to_list(50))


asyncio.run(main())
