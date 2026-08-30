"""FASE 5 — audit READ-ONLY database staging (tanpa write/hapus apa pun).

Run: cd /app/backend && PYTHONPATH=/app/backend python /app/scripts/phase5_db_audit.py
"""
import asyncio

from app.core.config import settings
from app.core.database import Collections, get_db


def dup(pairs):
    return [k for k, v in pairs.items() if v > 1]


async def main():
    db = get_db()
    print(f"database: {settings.DB_NAME}")
    counts = {}
    for name in (
        Collections.CUSTOMERS,
        Collections.PLAYERS,
        Collections.STAFF,
        Collections.MATCHES,
        "member_applications",
        Collections.CLUBS,
    ):
        counts[name] = await db[name].count_documents({})
    print("counts:", counts)

    emails, players, staff, sandbox = {}, {}, {}, []
    async for doc in db[Collections.CUSTOMERS].find({}):
        emails[doc.get("email")] = emails.get(doc.get("email"), 0) + 1
        if doc.get("player_id"):
            players[doc["player_id"]] = players.get(doc["player_id"], 0) + 1
        if doc.get("staff_id"):
            staff[doc["staff_id"]] = staff.get(doc["staff_id"], 0) + 1
        if "sandbox" in (doc.get("email") or "") or "test" in (doc.get("email") or "").lower():
            sandbox.append(doc.get("email"))
        roles = doc.get("roles")
        if roles is not None and (not isinstance(roles, list) or any(
            r not in ("MEMBER", "PEMAIN", "STAFF") for r in roles
        )):
            print("  ! roles tidak valid:", doc.get("email"), roles)
        if roles and doc.get("role") not in roles:
            print("  ! role/roles tidak konsisten:", doc.get("email"), doc.get("role"), roles)

    print("duplicate email:", dup(emails))
    print("player_id dipakai >1 akun:", dup(players))
    print("staff_id dipakai >1 akun:", dup(staff))
    print("akun bernuansa testing tersisa:", sandbox)

    apps = {}
    async for doc in db["member_applications"].find({}):
        key = (doc.get("customer_id"), doc.get("type"), doc.get("status"))
        apps[key] = apps.get(key, 0) + 1
        if doc.get("type") == "STAFF" and doc.get("status") == "APPROVED" and not doc.get("staff_data"):
            print("  ! pengajuan STAFF approved tanpa staff_data:", doc.get("id"))
    pending_dup = [k for k, v in apps.items() if v > 1 and k[2] == "PENDING"]
    print("pengajuan PENDING ganda per akun/tipe:", pending_dup)

    ply_names = {}
    async for doc in db[Collections.PLAYERS].find({}):
        key = (doc.get("full_name"), doc.get("team_id"))
        ply_names[key] = ply_names.get(key, 0) + 1
    stf_names = {}
    async for doc in db[Collections.STAFF].find({}):
        key = (doc.get("name"), doc.get("team_id"))
        stf_names[key] = stf_names.get(key, 0) + 1
    print("kemungkinan duplikat pemain (nama+tim):", dup(ply_names))
    print("kemungkinan duplikat staf (nama+tim):", dup(stf_names))

    club = await db[Collections.CLUBS].find_one({})
    print(
        "club store urls:",
        {k: club.get(k) for k in ("app_playstore_url", "app_appstore_url")} if club else None,
    )
    async for doc in db[Collections.SOCIAL_CONNECTIONS].find({}):
        print("social:", doc.get("platform"), "enabled=", doc.get("enabled"), "connected=", bool(doc.get("access_token")))


if __name__ == "__main__":
    asyncio.run(main())
