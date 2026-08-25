"""Fase 5D — production data cleanup (test/development artefacts only).

Every candidate is matched against an explicit test signature. Records that do not
match are left untouched and reported. Media is only removed when its metadata is a
test artefact AND no remaining document references it.

Usage:
    python phase5d_cleanup.py            # dry-run report
    python phase5d_cleanup.py --apply    # perform deletions
"""
import asyncio
import os
import re
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

APPLY = "--apply" in sys.argv
STORAGE_ROOT = Path("/app/backend/media_storage")
TS = r"\d{9,11}"

SIGNATURES = {
    "players": lambda d: d.get("full_name") == "Ahmad Sabbat"
    and d.get("jersey_number") == 10
    and not d.get("photo"),
    "staff": lambda d: d.get("name") == "Coach Ali"
    and d.get("role") == "HEAD_COACH"
    and not d.get("photo"),
    "matches": lambda d: (d.get("opponent") or {}).get("name") == "Rival FC",
    "posts": lambda d: bool(re.fullmatch(rf"(alsabbat-wins|ca-post)-{TS}", d.get("slug") or "")),
    "gallery_albums": lambda d: bool(re.fullmatch(rf"matchday-{TS}", d.get("slug") or ""))
    or bool(re.fullmatch(rf"Matchday Album {TS}", d.get("title") or "")),
    "seasons": lambda d: bool(re.fullmatch(rf"Season {TS}", d.get("name") or "")),
    "competitions": lambda d: bool(re.fullmatch(rf"Liga {TS}", d.get("name") or "")),
    "categories": lambda d: bool(re.fullmatch(rf"Match Report {TS}", d.get("name") or "")),
    "authors": lambda d: bool(re.fullmatch(rf"Media Officer {TS}", d.get("name") or "")),
    "sponsors": lambda d: bool(re.fullmatch(rf"Sponsor {TS}", d.get("name") or "")),
}

MEDIA_TEST = lambda d: (d.get("url") or "").startswith("https://cdn.example.com/") or (
    d.get("file_name") == "pitch.png" and (d.get("storage_key") or "").endswith("-pitch.png")
)


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[
        os.environ.get("MONGODB_DB_NAME") or os.environ["DB_NAME"]
    ]

    plan, unresolved = {}, {}
    for coll, is_test in SIGNATURES.items():
        docs = await db[coll].find({}, {"_id": 0}).to_list(1000)
        plan[coll] = [d["id"] for d in docs if is_test(d)]
        keep = [d["id"] for d in docs if not is_test(d)]
        if keep:
            unresolved[coll] = keep

    # ---- media: test signature + zero remaining references -------------------
    media_docs = await db.media.find({}, {"_id": 0}).to_list(1000)
    referenced = set()
    for coll, fields in {
        "clubs": ("logo",),
        "teams": ("logo",),
        "players": ("photo",),
        "staff": ("photo",),
        "sponsors": ("logo",),
        "posts": ("thumbnail",),
        "matches": ("match_cover",),
    }.items():
        for doc in await db[coll].find({}, {"_id": 0}).to_list(1000):
            if coll in plan and doc["id"] in plan[coll]:
                continue  # document itself is being deleted
            for f in fields:
                if doc.get(f):
                    referenced.add(str(doc[f]))
    for album in await db.gallery_albums.find({}, {"_id": 0}).to_list(1000):
        if album["id"] in plan["gallery_albums"]:
            continue
        if album.get("cover_media_id"):
            referenced.add(album["cover_media_id"])
        for mid in album.get("media_ids") or []:
            referenced.add(mid)

    media_delete, media_keep = [], []
    for m in media_docs:
        blocked = m["id"] in referenced or (m.get("url") in referenced)
        if MEDIA_TEST(m) and not blocked:
            media_delete.append(m)
        else:
            media_keep.append(m)
    plan["media"] = [m["id"] for m in media_delete]
    if media_keep:
        unresolved["media"] = [m["id"] for m in media_keep]

    print("=== DELETE PLAN ===")
    for coll, ids in plan.items():
        total = await db[coll].count_documents({})
        print(f"{coll}: delete {len(ids)} / {total}")
    print("\n=== KEPT (not matching test signature) ===")
    print(unresolved or "none")

    files = [STORAGE_ROOT / m["storage_key"] for m in media_delete if m.get("storage_key")]
    print("\nphysical files to delete:", [str(f) for f in files])

    if not APPLY:
        print("\ndry-run only — rerun with --apply")
        return

    for coll, ids in plan.items():
        if ids:
            r = await db[coll].delete_many({"id": {"$in": ids}})
            print(f"deleted {coll}: {r.deleted_count}")
    for f in files:
        if f.is_file():
            f.unlink()
            print("removed file:", f)

    print("\n=== AFTER ===")
    for coll in list(SIGNATURES) + ["media", "match_lineups", "match_events", "teams", "clubs", "users"]:
        print(coll, await db[coll].count_documents({}))


asyncio.run(main())
