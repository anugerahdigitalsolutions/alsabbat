"""Fase 5E — auth/test-account cleanup + club identity fix.

Deletes ONLY users matching the confirmed test signature
(email `content<timestamp>@alsabbat.com` + role CONTENT_ADMIN) and their sessions.
Also normalises the club document (single-team description, brand dark = #000000).

Usage:
    python phase5e_cleanup.py            # dry-run
    python phase5e_cleanup.py --apply
"""
import asyncio
import os
import re
import sys

from motor.motor_asyncio import AsyncIOMotorClient

APPLY = "--apply" in sys.argv
TEST_EMAIL = re.compile(r"^content\d{9,11}@alsabbat\.com$")
NEW_DESCRIPTION = "Official website of ALSABBAT Football Club."


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[
        os.environ.get("MONGODB_DB_NAME") or os.environ["DB_NAME"]
    ]

    users = await db.users.find({}, {"_id": 0}).to_list(200)
    test_users = [
        u for u in users
        if TEST_EMAIL.match(u.get("email") or "") and u.get("role") == "CONTENT_ADMIN"
    ]
    kept = [u["email"] for u in users if u not in test_users]
    ids = [u["id"] for u in test_users]
    sessions = await db.sessions.count_documents({"user_id": {"$in": ids}})

    print("users total:", len(users))
    print("test users to delete:", [u["email"] for u in test_users])
    print("users kept:", kept)
    print("sessions belonging to test users:", sessions,
          "| total sessions:", await db.sessions.count_documents({}))

    club = await db.clubs.find_one({}, {"_id": 0})
    print("\nclub description (before):", club.get("description"))
    print("club tertiary_color (before):", club.get("tertiary_color"))
    print("club stadium/location (test-injected):", club.get("stadium"), "/", club.get("location"))

    if not APPLY:
        print("\ndry-run only — rerun with --apply")
        return

    if ids:
        print("deleted users:", (await db.users.delete_many({"id": {"$in": ids}})).deleted_count)
        print("deleted sessions:", (await db.sessions.delete_many({"user_id": {"$in": ids}})).deleted_count)

    await db.clubs.update_one(
        {"id": club["id"]},
        {"$set": {"description": NEW_DESCRIPTION, "tertiary_color": "#000000",
                  "stadium": None, "location": None}},
    )
    after = await db.clubs.find_one({}, {"_id": 0})
    print("\nclub description (after):", after.get("description"))
    print("club tertiary_color (after):", after.get("tertiary_color"))
    print("users after:", await db.users.count_documents({}),
          "| sessions after:", await db.sessions.count_documents({}))


asyncio.run(main())
