"""ALSABBAT Phase-1 CORE POC.

Proves, in isolation, that the foundation actually works:
  1. Health check + DB connectivity
  2. Super admin login (JWT) + /auth/me + session management
  3. Club centralized configuration read/update
  4. Multi-team architecture (Club -> Team)
  5. Player + Staff under a Team
  6. Season -> Competition -> Match relationship chain
  7. Content (category/tag/author/post) with SEO slug
  8. Media metadata + upload through the Media Service (file NOT in DB)
  9. Gallery album -> media items
 10. Sponsor
 11. RBAC enforced server-side (Content Admin blocked from club/match writes)
 12. Match relations endpoint (architecture for Match Center)
 13. Analytics event + summary, SEO settings/sitemap, System status
 14. Logout revokes the session

Run: python /app/tests/test_core_phase1.py
"""
from __future__ import annotations

import io
import os
import sys
import time

import requests

BASE = os.environ.get("API_BASE", "http://localhost:8001/api")
ADMIN_EMAIL = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@alsabbat.com")
ADMIN_PASSWORD = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "Alsabbat2026!")

PASS, FAIL = [], []


def check(name: str, condition: bool, detail: str = "") -> bool:
    if condition:
        PASS.append(name)
        print(f"  PASS  {name}")
    else:
        FAIL.append(f"{name} :: {detail}")
        print(f"  FAIL  {name} :: {detail}")
    return condition


def hdr(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    print("\n=== ALSABBAT PHASE 1 CORE POC ===\n")

    # 1. Health
    r = requests.get(f"{BASE}/health", timeout=15)
    check("health endpoint 200", r.status_code == 200, r.text[:200])
    check("database connected", r.json().get("database") == "connected", r.text[:200])

    # 2. Auth
    r = requests.post(
        f"{BASE}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20
    )
    if not check("super admin login", r.status_code == 200, r.text[:300]):
        return 1
    token = r.json()["access_token"]
    check("super admin has wildcard permission", "*" in r.json()["user"]["permissions"])

    r = requests.get(f"{BASE}/auth/me", headers=hdr(token), timeout=15)
    check("/auth/me works", r.status_code == 200 and r.json()["email"] == ADMIN_EMAIL, r.text[:200])
    check(
        "protected route rejects missing token",
        requests.get(f"{BASE}/auth/me", timeout=15).status_code == 401,
    )
    check(
        "protected route rejects invalid token",
        requests.get(f"{BASE}/auth/me", headers=hdr("garbage"), timeout=15).status_code == 401,
    )
    check(
        "wrong password rejected",
        requests.post(
            f"{BASE}/auth/login", json={"email": ADMIN_EMAIL, "password": "nope"}, timeout=15
        ).status_code
        == 401,
    )

    # 3. Club
    r = requests.get(f"{BASE}/club/active", timeout=15)
    club = (r.json() or {}).get("club")
    if not check("default club configuration exists", bool(club), r.text[:300]):
        return 1
    check(
        "brand colors seeded",
        club["primary_color"] == "#FCCF2B"
        and club["secondary_color"] == "#012891"
        and club["tertiary_color"] == "#222222"
        and club["light_color"] == "#FEFEFE",
        str({k: club.get(k) for k in ("primary_color", "secondary_color")}),
    )
    club_id = club["id"]
    r = requests.patch(
        f"{BASE}/club/{club_id}",
        headers=hdr(token),
        json={"location": "Indonesia", "stadium": "ALSABBAT Arena"},
        timeout=15,
    )
    check("club config update", r.status_code == 200 and r.json()["stadium"] == "ALSABBAT Arena", r.text[:200])

    stamp = str(int(time.time()))

    # 4. Teams (multi-team)
    created_teams = []
    for name, category in (
        (f"First Team {stamp}", "FIRST_TEAM"),
        (f"Youth Team {stamp}", "YOUTH_TEAM"),
    ):
        r = requests.post(
            f"{BASE}/teams",
            headers=hdr(token),
            json={"club_id": club_id, "name": name, "short_name": "ALS", "category": category},
            timeout=15,
        )
        if check(f"create team ({category})", r.status_code == 201, r.text[:300]):
            created_teams.append(r.json())
    if len(created_teams) < 2:
        return 1
    team_id = created_teams[0]["id"]
    r = requests.get(f"{BASE}/teams?club_id={club_id}", timeout=15)
    check("list teams filtered by club_id", r.status_code == 200 and r.json()["total"] >= 2, r.text[:200])

    # 5. Player + Staff
    r = requests.post(
        f"{BASE}/players",
        headers=hdr(token),
        json={
            "team_id": team_id,
            "full_name": "Ahmad Sabbat",
            "display_name": "A. Sabbat",
            "jersey_number": 10,
            "position": "FORWARD",
            "date_of_birth": "2001-05-14",
            "nationality": "Indonesia",
            "height_cm": 178,
            "weight_kg": 72,
            "social_media": {"instagram": "https://instagram.com/example"},
        },
        timeout=15,
    )
    check("create player", r.status_code == 201, r.text[:300])
    player_id = r.json().get("id") if r.status_code == 201 else None
    check(
        "player validation rejects bad jersey number",
        requests.post(
            f"{BASE}/players",
            headers=hdr(token),
            json={"team_id": team_id, "full_name": "Bad Player", "jersey_number": 500},
            timeout=15,
        ).status_code
        == 422,
    )
    r = requests.post(
        f"{BASE}/staff",
        headers=hdr(token),
        json={"team_id": team_id, "name": "Coach Ali", "role": "HEAD_COACH"},
        timeout=15,
    )
    check("create staff", r.status_code == 201, r.text[:300])

    # 6. Season -> Competition -> Match
    r = requests.post(
        f"{BASE}/seasons",
        headers=hdr(token),
        json={
            "club_id": club_id,
            "name": f"Season {stamp}",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "status": "ACTIVE",
        },
        timeout=15,
    )
    if not check("create season", r.status_code == 201, r.text[:300]):
        return 1
    season_id = r.json()["id"]

    r = requests.post(
        f"{BASE}/competitions",
        headers=hdr(token),
        json={"season_id": season_id, "name": f"Liga {stamp}", "type": "LEAGUE"},
        timeout=15,
    )
    if not check("create competition linked to season", r.status_code == 201, r.text[:300]):
        return 1
    competition_id = r.json()["id"]

    r = requests.post(
        f"{BASE}/matches",
        headers=hdr(token),
        json={
            "team_id": team_id,
            "season_id": season_id,
            "competition_id": competition_id,
            "opponent": {"name": "Rival FC", "short_name": "RIV"},
            "date": "2026-03-15",
            "time": "19:30",
            "venue": "ALSABBAT Arena",
            "venue_type": "HOME",
            "status": "SCHEDULED",
        },
        timeout=15,
    )
    if not check("create match with full relationships", r.status_code == 201, r.text[:300]):
        return 1
    match = r.json()
    match_id = match["id"]
    check("match has unique id", bool(match_id) and len(match_id) >= 16)
    check(
        "match references season+competition+team",
        match["season_id"] == season_id
        and match["competition_id"] == competition_id
        and match["team_id"] == team_id,
    )
    r = requests.patch(
        f"{BASE}/matches/{match_id}",
        headers=hdr(token),
        json={"status": "FINISHED", "home_score": 3, "away_score": 1},
        timeout=15,
    )
    check("update match result", r.status_code == 200 and r.json()["home_score"] == 3, r.text[:200])
    r = requests.get(f"{BASE}/matches?season_id={season_id}&status=FINISHED", timeout=15)
    check("filter matches by season+status", r.status_code == 200 and r.json()["total"] >= 1, r.text[:200])

    # 7. Content
    r = requests.post(
        f"{BASE}/content/categories",
        headers=hdr(token),
        json={"name": f"Match Report {stamp}"},
        timeout=15,
    )
    check("create category", r.status_code == 201, r.text[:300])
    category_id = r.json().get("id")
    check("category slug auto-generated", bool(r.json().get("slug")), r.text[:200])

    r = requests.post(f"{BASE}/content/tags", headers=hdr(token), json={"name": f"tag{stamp}"}, timeout=15)
    check("create tag", r.status_code == 201, r.text[:300])
    tag_id = r.json().get("id")

    r = requests.post(
        f"{BASE}/content/authors", headers=hdr(token), json={"name": f"Media Officer {stamp}"}, timeout=15
    )
    check("create author", r.status_code == 201, r.text[:300])
    author_id = r.json().get("id")

    slug = f"alsabbat-wins-{stamp}"
    r = requests.post(
        f"{BASE}/content/posts",
        headers=hdr(token),
        json={
            "title": "ALSABBAT Wins The Opener",
            "slug": slug,
            "content": "Full match report body.",
            "category_id": category_id,
            "tag_ids": [tag_id],
            "author_id": author_id,
            "match_id": match_id,
            "team_id": team_id,
            "status": "PUBLISHED",
            "published_at": "2026-03-15T22:00:00Z",
        },
        timeout=15,
    )
    if not check("create post linked to match", r.status_code == 201, r.text[:300]):
        return 1
    post_id = r.json()["id"]
    r = requests.get(f"{BASE}/content/posts/by-slug/{slug}", timeout=15)
    check("fetch post by SEO slug", r.status_code == 200 and r.json()["id"] == post_id, r.text[:200])
    r = requests.post(
        f"{BASE}/content/posts",
        headers=hdr(token),
        json={"title": "Duplicate slug", "slug": slug},
        timeout=15,
    )
    check("duplicate slug rejected (409)", r.status_code == 409, r.text[:200])

    # 8. Media (metadata + real upload through Media Service)
    r = requests.post(
        f"{BASE}/media",
        headers=hdr(token),
        json={
            "file_name": "external-cdn-image.jpg",
            "file_type": "IMAGE",
            "mime_type": "image/jpeg",
            "file_size": 123456,
            "url": "https://cdn.example.com/external-cdn-image.jpg",
            "storage_provider": "EXTERNAL",
            "match_id": match_id,
        },
        timeout=15,
    )
    check("create media metadata (external/CDN)", r.status_code == 201, r.text[:300])

    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
        b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05"
        b"\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    r = requests.post(
        f"{BASE}/media/upload",
        headers=hdr(token),
        files={"file": ("pitch.png", io.BytesIO(png), "image/png")},
        data={"alt_text": "Pitch", "match_id": match_id},
        timeout=30,
    )
    if check("upload media file via Media Service", r.status_code == 201, r.text[:300]):
        uploaded = r.json()
        check("uploaded media stored outside DB (storage_key present)", bool(uploaded.get("storage_key")))
        file_url = uploaded["url"]
        served = requests.get(f"{BASE.replace('/api','')}{file_url}", timeout=15)
        check("stored file is retrievable from storage", served.status_code == 200, str(served.status_code))
    r = requests.post(
        f"{BASE}/media/upload",
        headers=hdr(token),
        files={"file": ("evil.exe", io.BytesIO(b"MZ" * 100), "application/x-msdownload")},
        timeout=20,
    )
    check("disallowed file type rejected", r.status_code == 422, r.text[:200])

    # 9. Gallery
    r = requests.post(
        f"{BASE}/gallery/albums",
        headers=hdr(token),
        json={
            "title": f"Matchday Album {stamp}",
            "slug": f"matchday-{stamp}",
            "match_id": match_id,
            "date": "2026-03-15",
        },
        timeout=15,
    )
    if not check("create gallery album", r.status_code == 201, r.text[:300]):
        return 1
    album_id = r.json()["id"]
    r = requests.post(
        f"{BASE}/media",
        headers=hdr(token),
        json={
            "file_name": "album-photo.jpg",
            "file_type": "IMAGE",
            "mime_type": "image/jpeg",
            "url": "https://cdn.example.com/album-photo.jpg",
            "album_id": album_id,
            "match_id": match_id,
        },
        timeout=15,
    )
    check("attach media to album", r.status_code == 201, r.text[:300])
    r = requests.get(f"{BASE}/gallery/albums/{album_id}/media", timeout=15)
    check("album -> media items relation", r.status_code == 200 and r.json()["total"] >= 1, r.text[:200])

    # 10. Sponsor
    r = requests.post(
        f"{BASE}/sponsors",
        headers=hdr(token),
        json={"name": f"Sponsor {stamp}", "website": "https://sponsor.example.com", "display_order": 1},
        timeout=15,
    )
    check("create sponsor", r.status_code == 201, r.text[:300])

    # 11. RBAC enforced server-side
    content_admin_email = f"content{stamp}@alsabbat.com"
    r = requests.post(
        f"{BASE}/users",
        headers=hdr(token),
        json={
            "email": content_admin_email,
            "name": "Content Admin",
            "role": "CONTENT_ADMIN",
            "password": "ContentAdmin123!",
        },
        timeout=20,
    )
    if not check("super admin can create admin users", r.status_code == 201, r.text[:300]):
        return 1
    r = requests.post(
        f"{BASE}/auth/login",
        json={"email": content_admin_email, "password": "ContentAdmin123!"},
        timeout=20,
    )
    if not check("content admin login", r.status_code == 200, r.text[:300]):
        return 1
    ca_token = r.json()["access_token"]

    r = requests.post(
        f"{BASE}/content/posts",
        headers=hdr(ca_token),
        json={"title": f"Content admin post {stamp}", "slug": f"ca-post-{stamp}"},
        timeout=15,
    )
    check("content admin CAN create posts", r.status_code == 201, r.text[:200])
    check(
        "content admin BLOCKED from club write",
        requests.patch(
            f"{BASE}/club/{club_id}", headers=hdr(ca_token), json={"location": "hack"}, timeout=15
        ).status_code
        == 403,
    )
    check(
        "content admin BLOCKED from match write",
        requests.post(
            f"{BASE}/matches",
            headers=hdr(ca_token),
            json={"team_id": team_id, "opponent": {"name": "X"}, "date": "2026-04-01"},
            timeout=15,
        ).status_code
        == 403,
    )
    check(
        "content admin BLOCKED from user management",
        requests.get(f"{BASE}/users", headers=hdr(ca_token), timeout=15).status_code == 403,
    )
    check(
        "content admin BLOCKED from system status",
        requests.get(f"{BASE}/system/status", headers=hdr(ca_token), timeout=15).status_code == 403,
    )

    # 12. Match relations architecture
    r = requests.get(f"{BASE}/matches/{match_id}/relations", timeout=15)
    ok = r.status_code == 200
    check("match relations endpoint", ok, r.text[:200])
    if ok:
        data = r.json()
        check("match relations include news", len(data["news"]) >= 1)
        check("match relations include gallery albums", len(data["gallery_albums"]) >= 1)
        check("match relations include images", len(data["images"]) >= 1)

    # 13. Analytics, SEO, System
    r = requests.post(
        f"{BASE}/analytics/events",
        json={"event_type": "PAGE_VIEW", "path": "/", "entity_type": "match", "entity_id": match_id},
        timeout=15,
    )
    check("analytics event tracked", r.status_code == 201, r.text[:200])
    r = requests.get(f"{BASE}/analytics/summary", headers=hdr(token), timeout=15)
    check("analytics summary (admin)", r.status_code == 200 and r.json()["total_events"] >= 1, r.text[:200])
    r = requests.get(f"{BASE}/seo/settings", timeout=15)
    check("seo settings", r.status_code == 200 and "open_graph" in r.json(), r.text[:200])
    r = requests.get(f"{BASE}/seo/sitemap.xml", timeout=15)
    check("sitemap.xml", r.status_code == 200 and "<urlset" in r.text, r.text[:200])
    r = requests.get(f"{BASE}/seo/robots.txt", timeout=15)
    check("robots.txt", r.status_code == 200 and "Sitemap:" in r.text, r.text[:200])
    r = requests.get(f"{BASE}/system/status", headers=hdr(token), timeout=20)
    check(
        "system status (admin)",
        r.status_code == 200 and r.json()["database"]["connected"] is True,
        r.text[:200],
    )
    r = requests.get(f"{BASE}/system/meta", timeout=15)
    check("platform meta enums", r.status_code == 200 and "player_positions" in r.json(), r.text[:200])

    # 14. Logout revokes session
    r = requests.post(f"{BASE}/auth/logout", headers=hdr(ca_token), timeout=15)
    check("logout succeeds", r.status_code == 200, r.text[:200])
    check(
        "revoked session cannot be reused",
        requests.get(f"{BASE}/auth/me", headers=hdr(ca_token), timeout=15).status_code == 401,
    )

    print(f"\n=== RESULT: {len(PASS)} passed, {len(FAIL)} failed ===")
    for f in FAIL:
        print(f"  - {f}")
    return 0 if not FAIL else 1


if __name__ == "__main__":
    sys.exit(main())
