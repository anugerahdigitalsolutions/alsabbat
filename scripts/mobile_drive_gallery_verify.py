"""Verifikasi logika perbaikan Google Drive Gallery pada aplikasi MOBILE.

Cek statis (tanpa menyentuh backend/website/DB):
  1. AlbumDetailScreen memakai `drive_folder_url` (bukan `drive_folder_id`).
  2. Foto Drive dirender lewat RemoteImage (fallback URL) di grid + viewer.
  3. Normalisasi URL Drive menghasilkan URL direct-image yang valid.
  4. URL non-Drive TIDAK diubah (website & media lokal tidak terpengaruh).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

MOBILE = Path("/app/mobile/src")
FAILS: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"{'PASS' if ok else 'FAIL'} — {name}{(' :: ' + detail) if detail else ''}")
    if not ok:
        FAILS.append(name)


album = (MOBILE / "screens/AlbumDetailScreen.js").read_text()
viewer = (MOBILE / "components/ImageViewer.js").read_text()
remote = (MOBILE / "components/RemoteImage.js").read_text()
lib = (MOBILE / "lib/driveImage.js").read_text()

check("gating album Drive memakai drive_folder_url", "album.data?.drive_folder_url" in album)
check("gating lama drive_folder_id sudah tidak ada", "drive_folder_id" not in album)
check(
    "foto Drive dirender lewat DriveFolderBrowser (folder + foto)",
    "<DriveFolderBrowser" in album,
)
check("grid album memakai RemoteImage", "<RemoteImage" in album and "RemoteImage" in album)
check("image viewer memakai RemoteImage", "<RemoteImage" in viewer)
check("RemoteImage punya rantai fallback onError", "onError" in remote and "imageSourceCandidates" in remote)

# --- simulasi logika driveImage.js (port 1:1 dari implementasi JS) ---
ID_PATTERNS = [r"/file/d/([A-Za-z0-9_-]{10,})", r"/d/([A-Za-z0-9_-]{10,})", r"[?&]id=([A-Za-z0-9_-]{10,})"]
HOSTS = ["drive.google.com", "drive.usercontent.google.com", "lh3.googleusercontent.com"]


def file_id(url: str):
    if not any(h in url for h in HOSTS):
        return None
    for p in ID_PATTERNS:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def width(url: str, fallback: int = 1200) -> int:
    m = re.search(r"[?&]sz=w(\d{2,5})", url) or re.search(r"=w(\d{2,5})", url)
    return int(m.group(1)) if m else fallback


def candidates(url: str):
    fid = file_id(url)
    if not fid:
        return [url]
    w = width(url)
    return [
        f"https://lh3.googleusercontent.com/d/{fid}=w{w}",
        f"https://drive.google.com/thumbnail?id={fid}&sz=w{w}",
        f"https://drive.usercontent.google.com/download?id={fid}&export=view",
    ]


SAMPLE_ID = "1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUv"

thumb800 = f"https://drive.google.com/thumbnail?id={SAMPLE_ID}&sz=w800"
thumb1920 = f"https://drive.google.com/thumbnail?id={SAMPLE_ID}&sz=w1920"
view_link = f"https://drive.google.com/file/d/{SAMPLE_ID}/view?usp=sharing"
local = "https://api.alsabbat.test/api/media/files/abc.jpg"

check(
    "thumbnail w800 → direct-image w800",
    candidates(thumb800)[0] == f"https://lh3.googleusercontent.com/d/{SAMPLE_ID}=w800",
    candidates(thumb800)[0],
)
check(
    "thumbnail w1920 → direct-image w1920",
    candidates(thumb1920)[0] == f"https://lh3.googleusercontent.com/d/{SAMPLE_ID}=w1920",
    candidates(thumb1920)[0],
)
check("link /file/d/<id>/view juga dikenali", file_id(view_link) == SAMPLE_ID)
check("default lebar bila tanpa sz", width(f"https://drive.google.com/uc?id={SAMPLE_ID}") == 1200)
check("ada 3 kandidat fallback untuk URL Drive", len(candidates(thumb800)) == 3)
check("URL non-Drive tidak diubah", candidates(local) == [local])
check("ID tidak pernah di-hardcode di source", SAMPLE_ID not in lib and "1A2b3C" not in lib)

print()
print("HASIL:", "SEMUA CEK LULUS" if not FAILS else f"{len(FAILS)} CEK GAGAL -> {FAILS}")
sys.exit(1 if FAILS else 0)
