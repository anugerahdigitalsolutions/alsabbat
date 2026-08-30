"""Backfill slug sponsor (non-destruktif: HANYA menambah field `slug` bila kosong).

Dry-run  : python scripts/sponsor_slug_backfill.py
Terapkan : python scripts/sponsor_slug_backfill.py --apply
"""
import asyncio
import os
import sys

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../backend")
load_dotenv("/app/backend/.env")

from app.models.base import slugify  # noqa: E402

APPLY = "--apply" in sys.argv


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["MONGODB_DB_NAME"]]
    used = {
        doc["slug"]
        async for doc in db.sponsors.find({"slug": {"$nin": [None, ""]}}, {"slug": 1})
    }
    changed = 0
    async for doc in db.sponsors.find({"$or": [{"slug": None}, {"slug": ""}, {"slug": {"$exists": False}}]}):
        base = slugify(doc.get("name") or "")
        slug = base
        i = 2
        while slug in used:
            slug = f"{base}-{i}"
            i += 1
        used.add(slug)
        print(f"{doc.get('name')} -> {slug}" + ("" if APPLY else "  (dry-run)"))
        if APPLY:
            await db.sponsors.update_one({"id": doc["id"]}, {"$set": {"slug": slug}})
        changed += 1
    print(f"{'diperbarui' if APPLY else 'kandidat'}: {changed}")


asyncio.run(main())
