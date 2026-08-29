"""Verifikasi P1 — Galeri Google Drive (navigasi folder + pageToken).

Menguji `app.services.drive.browse_folder` dengan Drive API v3 yang di-STUB
(struktur folder sintetis), tanpa memanggil Google dan tanpa menyentuh database.

Jalankan: cd /app/backend && python ../scripts/p1_drive_browse_verify.py
"""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../backend")

from app.core.config import settings  # noqa: E402
from app.services import drive  # noqa: E402

FOLDER = "application/vnd.google-apps.folder"

ROOT = "ROOTFOLDER123"
F1 = "SUBFOLDER1AAA"
F2 = "SUBFOLDER2BBB"
S1 = "SUBSUBFOLDER1"
OUTSIDE = "OUTSIDEFOLDER"
DIRECT_IMG = "DIRECTIMAGE01"

META = {
    ROOT: {"id": ROOT, "name": "Album Drive", "mimeType": FOLDER, "parents": []},
    F1: {"id": F1, "name": "Pertandingan 1", "mimeType": FOLDER, "parents": [ROOT]},
    F2: {"id": F2, "name": "Latihan", "mimeType": FOLDER, "parents": [ROOT]},
    S1: {"id": S1, "name": "Babak Kedua", "mimeType": FOLDER, "parents": [F1]},
    OUTSIDE: {"id": OUTSIDE, "name": "Folder Orang Lain", "mimeType": FOLDER, "parents": []},
    DIRECT_IMG: {"id": DIRECT_IMG, "name": "foto-tunggal.jpg", "mimeType": "image/jpeg", "parents": []},
}

CHILDREN = {
    ROOT: [META[F1], META[F2]],
    F1: [META[S1]] + [
        {"id": f"IMG{F1}{i:03d}", "name": f"foto-{i:03d}.jpg", "mimeType": "image/jpeg"}
        for i in range(120)
    ],
    F2: [],
    S1: [
        {"id": f"IMG{S1}{i:03d}", "name": f"babak2-{i:03d}.jpg", "mimeType": "image/jpeg"}
        for i in range(3)
    ],
}

calls = {"list": 0, "get": 0}


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, *a, **kw):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url, params=None):
        params = params or {}
        if url.startswith(drive.DRIVE_FILES_URL + "/"):
            calls["get"] += 1
            file_id = url.rsplit("/", 1)[-1]
            meta = META.get(file_id)
            return FakeResponse(200, meta) if meta else FakeResponse(404, {})

        calls["list"] += 1
        q = params.get("q") or ""
        parent = q.split("'")[1] if "'" in q else ""
        items = CHILDREN.get(parent, [])
        page_size = int(params.get("pageSize") or 50)
        offset = int(params.get("pageToken") or 0)
        page = items[offset : offset + page_size]
        next_offset = offset + page_size
        body = {"files": page}
        if next_offset < len(items):
            body["nextPageToken"] = str(next_offset)
        return FakeResponse(200, body)


results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail else ""))


def reset():
    drive._browse_cache.clear()
    drive._meta_cache.clear()
    calls["list"] = 0
    calls["get"] = 0


async def main():
    settings.GOOGLE_DRIVE_API_KEY = "TEST_KEY_STUB"
    drive.httpx.AsyncClient = FakeClient
    root_url = f"https://drive.google.com/drive/folders/{ROOT}"

    # 1. Root berisi folder saja
    reset()
    r = await drive.browse_folder(root_url)
    check("root: status OK", r["status"] == "OK", r["status"])
    check("root: 2 folder terbaca", [f["name"] for f in r["folders"]] == ["Pertandingan 1", "Latihan"], r["folders"])
    check("root: belum ada foto", r["files"] == [])
    check("root: breadcrumb kosong", r["path"] == [])
    check("root: nama folder = nama album", r["folder"]["name"] == "Album Drive")

    # 2. Masuk subfolder → batch pertama = page_size, ada pageToken
    reset()
    p1 = await drive.browse_folder(root_url, folder_id=F1, page_size=50)
    check("F1: subfolder tampil", [f["id"] for f in p1["folders"]] == [S1], p1["folders"])
    check("F1: batch1 = 49 foto + 1 folder (page_size 50)", len(p1["files"]) == 49, len(p1["files"]))
    check("F1: ada next_page_token", bool(p1["next_page_token"]), p1["next_page_token"])
    check("F1: breadcrumb 1 level", [c["name"] for c in p1["path"]] == ["Pertandingan 1"], p1["path"])
    check("F1: hanya 1 request list untuk batch1", calls["list"] == 1, calls)

    # 3. Batch berikutnya via pageToken
    reset()
    p2 = await drive.browse_folder(root_url, folder_id=F1, page_token=p1["next_page_token"], page_size=50)
    check("F1: batch2 memuat 50 foto", len(p2["files"]) == 50, len(p2["files"]))
    first_ids = {f["id"] for f in p1["files"]}
    check("F1: batch2 tidak mengulang batch1", not first_ids & {f["id"] for f in p2["files"]})
    check("F1: batch2 masih punya token", bool(p2["next_page_token"]))
    p3 = await drive.browse_folder(root_url, folder_id=F1, page_token=p2["next_page_token"], page_size=50)
    check("F1: batch3 = sisa 21 foto & token habis", len(p3["files"]) == 21 and not p3["next_page_token"], (len(p3["files"]), p3["next_page_token"]))
    total = len(p1["files"]) + len(p2["files"]) + len(p3["files"])
    check("F1: total 120 foto lewat 3 batch", total == 120, total)

    # 4. page_size mengikuti jumlah kolom (10 baris)
    reset()
    small = await drive.browse_folder(root_url, folder_id=F1, page_size=20)
    check("page_size 20 (2 kolom × 10 baris) dipatuhi", len(small["folders"]) + len(small["files"]) == 20, len(small["files"]))

    # 5. Subfolder tingkat 2 + breadcrumb rekursif
    reset()
    sub = await drive.browse_folder(root_url, folder_id=S1)
    check("S1: 3 foto", len(sub["files"]) == 3, len(sub["files"]))
    check("S1: breadcrumb 2 level", [c["name"] for c in sub["path"]] == ["Pertandingan 1", "Babak Kedua"], sub["path"])
    check("S1: token habis", sub["next_page_token"] is None)

    # 6. Folder kosong
    reset()
    empty = await drive.browse_folder(root_url, folder_id=F2)
    check("F2 kosong: status EMPTY + pesan jujur", empty["status"] == "EMPTY" and empty["message"], empty["status"])

    # 7. Keamanan: folder di luar album ditolak
    reset()
    outside = await drive.browse_folder(root_url, folder_id=OUTSIDE)
    check("folder luar album ditolak", outside["status"] == "FORBIDDEN_SCOPE", outside["status"])
    check("folder luar album tidak membocorkan isi", outside["files"] == [] and outside["folders"] == [])

    # 8. Link langsung ke satu foto
    reset()
    direct = await drive.browse_folder(f"https://drive.google.com/file/d/{DIRECT_IMG}/view?id={DIRECT_IMG}")
    check("link foto langsung: 1 foto", direct["status"] == "OK" and len(direct["files"]) == 1, direct["status"])
    check("link foto langsung: is_file true", direct["is_file"] is True)
    check("link foto langsung: url thumbnail & full res beda", direct["files"][0]["thumbnail_url"] != direct["files"][0]["url"])

    # 9. Cache: request kedua tidak memanggil Drive lagi
    reset()
    await drive.browse_folder(root_url)
    first_calls = calls["list"]
    await drive.browse_folder(root_url)
    check("cache 5 menit: request kedua tanpa call Drive", calls["list"] == first_calls, calls)

    # 10. Link tidak valid & key kosong
    reset()
    bad = await drive.browse_folder("https://example.com/bukan-drive")
    check("link non-Drive → INVALID_LINK", bad["status"] == "INVALID_LINK", bad["status"])
    settings.GOOGLE_DRIVE_API_KEY = ""
    reset()
    nokey = await drive.browse_folder(root_url)
    check("tanpa API key → NOT_CONFIGURED (tidak mengklaim berhasil)", nokey["status"] == "NOT_CONFIGURED", nokey["status"])
    settings.GOOGLE_DRIVE_API_KEY = "TEST_KEY_STUB"

    # 11. Fungsi lama tetap ada (backward compatible)
    check("list_folder_images masih tersedia", callable(drive.list_folder_images))

    ok = sum(1 for _, c in results if c)
    print(f"\n{ok}/{len(results)} PASS")
    return 0 if ok == len(results) else 1


sys.exit(asyncio.run(main()))
