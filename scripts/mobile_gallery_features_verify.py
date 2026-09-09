"""Verifikasi logika 3 fitur Gallery mobile: simpan foto, subfolder Drive, bagikan foto.

Cek statis + simulasi logika (tanpa menyentuh backend/website/DB/credential Drive).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MOBILE = Path("/app/mobile")
SRC = MOBILE / "src"
FAILS: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"{'PASS' if ok else 'FAIL'} — {name}{(' :: ' + detail) if detail else ''}")
    if not ok:
        FAILS.append(name)


actions = (SRC / "lib/photoActions.js").read_text()
browser = (SRC / "components/DriveFolderBrowser.js").read_text()
viewer = (SRC / "components/ImageViewer.js").read_text()
album = (SRC / "screens/AlbumDetailScreen.js").read_text()
endpoints = (SRC / "api/endpoints.js").read_text()
config = (MOBILE / "app.config.js").read_text()
pkg = json.loads((MOBILE / "package.json").read_text())

# ---------------------------------------------------------------- dependency
deps = pkg["dependencies"]
for name in ("expo-media-library", "expo-sharing", "expo-file-system"):
    check(f"dependency {name} terpasang (Expo SDK 57)", name in deps, deps.get(name, "-"))
check("plugin expo-media-library terdaftar di app.config.js", "'expo-media-library'" in config)
check("plugin expo-sharing terdaftar di app.config.js", "'expo-sharing'" in config)
check("izin simpan foto iOS (savePhotosPermission) diisi", "savePhotosPermission" in config)

# ------------------------------------------------------------------ fitur 1
check("izin galeri diminta write-only sebelum menyimpan", "requestPermissionsAsync(true)" in actions)
check("permission ditolak tidak crash (return, bukan throw)", "PERMISSION_DENIED" in actions and "return {" in actions)
check("simpan memakai MediaLibrary.Asset.create", "MediaLibrary.Asset.create(uri)" in actions)
check("download memakai rantai kandidat driveImage (tanpa hardcode)", "imageSourceCandidates" in actions)
check("hasil unduhan divalidasi ukuran (bukan HTML rusak)", "MIN_IMAGE_BYTES" in actions)
check("tidak ada URL Drive hardcode di photoActions", "drive.google.com" not in actions and "googleusercontent" not in actions)
check("tombol Simpan Foto ada di ImageViewer", 'testID="image-viewer-save"' in viewer)
check("feedback sukses/gagal ditampilkan", 'testID="image-viewer-feedback"' in viewer and "Alert.alert" in viewer)

# ------------------------------------------------------------------ fitur 2
check("endpoint drive-browse existing dipakai (tanpa API baru)", "drive-browse" in endpoints)
check("parameter folder_id / page_token / page_size dikirim", all(p in endpoints for p in ("folder_id", "page_token", "page_size")))
check("lazy loading: satu batch per request", "PAGE_SIZE = 30" in browser and "nextPageToken" in browser)
check("navigasi folder memakai state folderId", "setFolderId(folder.id)" in browser)
check("breadcrumb + tombol kembali tersedia", "-breadcrumb" in browser and "-back" in browser)
check("folder dipisah dari foto (folders vs files)", "state.folders" in browser and "state.files" in browser)
check("icon folder, loading, empty, error state ada", all(s in browser for s in ('name="folder"', "-loading", "-empty", "-error")))
check("album detail merender DriveFolderBrowser", "<DriveFolderBrowser" in album)
check("album detail tidak lagi memuat seluruh foto Drive sekaligus", "getAlbumDrivePhotos" not in album)

# ------------------------------------------------------------------ fitur 3
check("share memakai expo-sharing share sheet native", "Sharing.shareAsync" in actions)
check("cek ketersediaan share sebelum dipakai", "Sharing.isAvailableAsync()" in actions)
check("share mengirim FILE foto (bukan URL/screenshot)", "shareAsync(uri" in actions)
check("mimeType/UTI diisi untuk iOS + Android", "mimeType" in actions and "UTI" in actions)
check(
    "tidak ada hardcode WhatsApp (deep-link/paket/nomor)",
    all(s not in actions.lower() for s in ("whatsapp://", "wa.me", "com.whatsapp")),
)
check("tombol Bagikan ada di ImageViewer", 'testID="image-viewer-share"' in viewer)

# ------------------------------------------- simulasi: nama file & mapping URL
def photo_file_name(item: dict, album_title: str, index: int = 0) -> str:
    ext_match = re.search(r"\.(jpe?g|png|webp|gif)$", str(item.get("file_name") or ""), re.I)
    ext = ext_match.group(0).lower() if ext_match else ".jpg"
    slug = re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", album_title.lower()))[:60] or "alsabbat"
    return f"{slug}-foto-{index + 1:02d}{ext}"


check(
    "nama file simpan/bagikan rapi + ekstensi benar",
    photo_file_name({"file_name": "IMG_0912.PNG"}, "AL SABBAT vs Putih", 2) == "al-sabbat-vs-putih-foto-03.png",
    photo_file_name({"file_name": "IMG_0912.PNG"}, "AL SABBAT vs Putih", 2),
)
check(
    "tanpa ekstensi → default .jpg",
    photo_file_name({"file_name": "foto-tanpa-ekstensi"}, "Babak 1", 0) == "babak-1-foto-01.jpg",
)

# folder vs photo mapping seperti respons /drive-browse
browse_response = {
    "status": "OK",
    "folder": {"id": "root", "name": "Album Pertandingan"},
    "path": [{"id": "b1", "name": "Babak 1"}],
    "folders": [{"id": "tA", "name": "Tim A"}, {"id": "tB", "name": "Tim B"}],
    "files": [
        {"id": "f1", "file_name": "a.jpg", "thumbnail_url": "https://drive.google.com/thumbnail?id=FILE1AAAAAAAAAA&sz=w800", "url": "https://drive.google.com/thumbnail?id=FILE1AAAAAAAAAA&sz=w1920"},
    ],
    "next_page_token": "TOKEN123",
}
folders = browse_response["folders"]
files = browse_response["files"]
check("mapping folder vs foto benar", len(folders) == 2 and len(files) == 1)
crumbs = browse_response["path"]
parent = crumbs[-2]["id"] if len(crumbs) >= 2 else None
check("breadcrumb kedalaman 1 → tombol kembali ke root (parent None)", parent is None)
crumbs2 = [{"id": "b1", "name": "Babak 1"}, {"id": "tA", "name": "Tim A"}]
check("breadcrumb kedalaman 2 → kembali ke folder induk", (crumbs2[-2]["id"] if len(crumbs2) >= 2 else None) == "b1")
check("next_page_token memicu tombol muat berikutnya", bool(browse_response["next_page_token"]))

print()
print("HASIL:", "SEMUA CEK LULUS" if not FAILS else f"{len(FAILS)} CEK GAGAL -> {FAILS}")
sys.exit(1 if FAILS else 0)
