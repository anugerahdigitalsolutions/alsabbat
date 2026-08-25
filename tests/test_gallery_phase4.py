"""ALSABBAT Phase-4 MATCH GALLERY & MEDIA verification (self-cleaning).

Proves the Phase 4 workflow on top of the EXISTING media system:
  1. Photo upload through /api/media/upload (image dimensions captured)
  2. Video upload through the same endpoint (single Media entity, no new system)
  3. Disallowed MIME rejected, anonymous upload blocked
  4. Gallery album create -> attach existing media -> cover -> reorder -> publish
  5. Public endpoints expose PUBLISHED albums only (DRAFT returns 404 / hidden)
  6. Match relations expose match_media coming from published albums
  7. Detach keeps the file in the Media Library (album relation only)

Every document/file created here is removed at the end (no production data).

Run: python /app/tests/test_gallery_phase4.py
"""
from __future__ import annotations

import os
import struct
import sys
import zlib

import requests

BASE = os.environ.get("API_BASE", "http://localhost:8001/api")
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@alsabbat.com")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "Alsabbat2026!")

passed, failed = 0, 0


def check(label: str, ok: bool, extra: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        print(f"  FAIL  {label} {extra}")


def png_bytes(width: int = 320, height: int = 200, color=(252, 207, 43)) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(color) * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def main() -> int:
    s = requests.Session()
    login = s.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    check("super admin login", login.status_code == 200, str(login.status_code))
    if login.status_code != 200:
        return 1
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    media_ids, album_ids = [], []

    photo = s.post(
        f"{BASE}/media/upload",
        files={"file": ("PHASE4-CHECK-photo.png", png_bytes(), "image/png")},
        data={"alt_text": "verification photo", "caption": "verification caption"},
        headers=headers,
        timeout=60,
    )
    check("photo upload", photo.status_code == 201, str(photo.status_code))
    if photo.status_code == 201:
        doc = photo.json()
        media_ids.append(doc["id"])
        check("image dimensions captured", doc.get("width") == 320 and doc.get("height") == 200)
        check("binary not stored in mongo (url/storage_key only)", bool(doc.get("storage_key")))

    video = s.post(
        f"{BASE}/media/upload",
        files={
            "file": (
                "PHASE4-CHECK-video.mp4",
                b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + os.urandom(1024),
                "video/mp4",
            )
        },
        headers=headers,
        timeout=60,
    )
    check("video upload", video.status_code == 201, str(video.status_code))
    if video.status_code == 201:
        media_ids.append(video.json()["id"])
        check("video stored as Media entity (file_type VIDEO)", video.json().get("file_type") == "VIDEO")

    bad = s.post(
        f"{BASE}/media/upload",
        files={"file": ("bad.exe", b"MZ" * 16, "application/x-msdownload")},
        headers=headers,
        timeout=30,
    )
    check("disallowed mime rejected", bad.status_code >= 400, str(bad.status_code))

    anon = requests.post(
        f"{BASE}/media/upload",
        files={"file": ("anon.png", png_bytes(8, 8), "image/png")},
        timeout=30,
    )
    check("anonymous upload blocked", anon.status_code in (401, 403), str(anon.status_code))

    matches = s.get(f"{BASE}/matches", params={"limit": 1}, timeout=20).json()
    match_id = matches["items"][0]["id"] if matches.get("items") else None

    album = s.post(
        f"{BASE}/gallery/albums",
        json={
            "title": "PHASE4 CHECK Album",
            "description": "verification album",
            "match_id": match_id,
            "publish_status": "DRAFT",
        },
        headers=headers,
        timeout=20,
    )
    check("album created as DRAFT", album.status_code == 201, str(album.status_code))
    if album.status_code != 201:
        return 1
    album_id = album.json()["id"]
    album_ids.append(album_id)

    attach = s.post(
        f"{BASE}/gallery/albums/{album_id}/media",
        json={"media_ids": media_ids},
        headers=headers,
        timeout=20,
    )
    check("existing media attached to album", attach.status_code == 200 and attach.json().get("attached") == len(media_ids))

    s.patch(f"{BASE}/gallery/albums/{album_id}", json={"cover_media_id": media_ids[0]}, headers=headers, timeout=20)
    order = s.patch(
        f"{BASE}/gallery/albums/{album_id}/media/order",
        json={"media_ids": list(reversed(media_ids))},
        headers=headers,
        timeout=20,
    )
    check("media order saved", order.status_code == 200)

    hidden = s.get(f"{BASE}/gallery/public/albums", timeout=20).json()
    check("DRAFT album hidden from public list", all(a["id"] != album_id for a in hidden.get("items", [])))
    check("DRAFT album detail not public", s.get(f"{BASE}/gallery/public/albums/{album_id}", timeout=20).status_code == 404)

    pub = s.post(f"{BASE}/gallery/albums/{album_id}/publish", params={"publish": True}, headers=headers, timeout=20)
    check("album published", pub.status_code == 200 and pub.json().get("publish_status") == "PUBLISHED")

    listed = s.get(f"{BASE}/gallery/public/albums", timeout=20).json()
    entry = next((a for a in listed.get("items", []) if a["id"] == album_id), None)
    check("published album visible publicly", entry is not None)
    if entry:
        check("public album exposes cover + counters", bool(entry.get("cover_url_resolved")) and entry.get("media_total") == len(media_ids))
        check("public album exposes related match", bool(entry.get("match")) if match_id else True)

    detail = s.get(f"{BASE}/gallery/public/albums/{album_id}", timeout=20)
    check("public album detail ok", detail.status_code == 200)
    if detail.status_code == 200:
        names = [m["file_name"] for m in detail.json().get("media", [])]
        check("album media follows manual order", names and names[0].endswith(".mp4"))

    if match_id:
        rel = s.get(f"{BASE}/matches/{match_id}/relations", timeout=20).json()
        check("match relations expose match_media", len(rel.get("match_media", [])) == len(media_ids))
        check("match relations expose published albums", any(a["id"] == album_id for a in rel.get("published_gallery_albums", [])))
        check("match document still has no embedded media arrays", not any(isinstance(v, list) for v in rel["match"].values()))

    detach = s.delete(f"{BASE}/gallery/albums/{album_id}/media/{media_ids[0]}", headers=headers, timeout=20)
    check("media detached from album", detach.status_code == 200)
    still = s.get(f"{BASE}/media/{media_ids[0]}", timeout=20)
    check("detached media still exists in library", still.status_code == 200)

    # ------------------------------------------------------------ cleanup
    for media_id in media_ids:
        s.delete(f"{BASE}/media/{media_id}/hard", headers=headers, timeout=20)
    for aid in album_ids:
        s.delete(f"{BASE}/gallery/albums/{aid}", headers=headers, timeout=20)
    after = s.get(f"{BASE}/gallery/public/albums", timeout=20).json()
    check("verification data removed", all(a["id"] != album_id for a in after.get("items", [])))

    print(f"\n=== RESULT: {passed} passed, {failed} failed ===")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
