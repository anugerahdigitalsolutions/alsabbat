"""Static check batch perubahan mobile (7 poin) — tanpa mengubah backend/website.

1 banner bawah · 2 shortcut notifikasi dihapus · 3 spacing waktu match
4 wording toko · 5 total media Drive · 6 latar kartu member · 7 push notification
"""
from __future__ import annotations

import sys
from pathlib import Path

MOBILE = Path("/app/mobile")
SRC = MOBILE / "src"
BACKEND = Path("/app/backend")
FAILS: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"{'PASS' if ok else 'FAIL'} — {name}{(' :: ' + detail) if detail else ''}")
    if not ok:
        FAILS.append(name)


banner = (SRC / "components/BannerCarousel.js").read_text()
home = (SRC / "screens/HomeScreen.js").read_text()
match_card = (SRC / "components/MatchCard.js").read_text()
album = (SRC / "screens/AlbumDetailScreen.js").read_text()
member = (SRC / "screens/MemberCardScreen.js").read_text()
push_hook = (SRC / "hooks/usePushNotifications.js").read_text()
config = (MOBILE / "app.config.js").read_text()
push_service = (BACKEND / "app/services/push.py").read_text()
broadcast = (BACKEND / "app/services/broadcast.py").read_text()

# ---------------------------------------------------------------- 1 banner
check("teks banner dipindah ke bawah (absolute bottom)", "position: 'absolute'" in banner and "bottom: 0, padding: 14" in banner)
check("gradient hanya menutup bagian bawah (bukan kotak hitam solid)", "scrim" in banner and "height: '58%'" in banner and "'transparent'" in banner)
check("headline dikecilkan agar blok teks ± 35–40% tinggi banner", 'variant="h2"' in banner and "lineHeight: 22" in banner)
check("baris terakhir headline tetap aksen kuning", "lineIndex === lines.length - 1 ? 'accent'" in banner)
check("carousel/paging/dots tetap", all(s in banner for s in ("pagingEnabled", "onMomentumScrollEnd", "styles.dots")))
check("CTA banner tetap ada", "item.cta_label && item.cta_url" in banner)
check("sumber gambar banner tidak diganti", "item.image_resolved || item.image_url" in banner)

# --------------------------------------------------- 2 shortcut notifikasi
check("shortcut 'Notifikasi' dihapus dari grid Home", "key: 'notif'" not in home)
check("tombol lonceng header Home tetap (akses notifikasi)", "home-notifications" in home and "'Notifications'" in home)
check("layar & logic notifikasi tetap ada", (SRC / "screens/NotificationsScreen.js").exists())
check("grid tersisa 8 item (2 baris × 4)", home.count("key: '") >= 8 and "key: 'membership'" in home)

# ------------------------------------------------------- 3 spacing waktu
check("blok waktu digeser ke bawah (paddingTop 40)", "paddingTop: 40" in match_card)
check("tinggi kartu dijaga (paddingBottom & venue dirapatkan)", "paddingBottom: 12" in match_card and "marginTop: 8 }" in match_card)
check("typography/warna waktu tidak diubah", 'variant="score"' in match_card and "middleMeta" in match_card)
check("countdown & venue tetap", "showCountdown" in match_card and "match.venue" in match_card)

# ---------------------------------------------------------- 4 wording toko
for path in ("screens/CartScreen.js", "screens/CheckoutScreen.js", "screens/OrdersScreen.js"):
    body = (SRC / path).read_text()
    check(f"{path}: label 'Kunjungi Toko'", 'label="Kunjungi Toko"' in body and "Buka Toko" not in body)
check("HomeScreen: aksi 'Kunjungi toko'", 'actionLabel="Kunjungi toko"' in home and "Buka toko" not in home)
check("navigasi toko tidak berubah", home.count("navigate('Store')") >= 1)

# ------------------------------------------------------- 5 total media Drive
check("badge media memakai total dari API Drive", "driveCount.data?.total" in album)
check("total tidak hardcode & hanya dipakai untuk badge", "getAlbumDrivePhotos" in album and "media.length + (driveCount.data?.total || 0)" in album)
check("grid/browse/viewer Drive tidak diubah", "<DriveFolderBrowser" in album and "<ImageViewer" in album)

# ------------------------------------------------------ 6 latar kartu member
check("latar kartu memakai site content yang sama dengan web", "member.card.background_url" in member)
check("overlay gradient sama seperti web", "rgba(1,40,145,0.90)" in member and "locations={[0, 0.46, 1]}" in member)
check("fallback pola garis + kilau emas", "pitchLines" in member and "rgba(252,207,43,0.28)" in member)
check("latar menjadi bagian kartu (absolute di dalam kartu)", "cardInner" in member and "overflow: 'hidden'" in member)
check("QR & data member tidak diubah", "member-card-qr" in member and "qrValue(data.member_code)" in member)

# -------------------------------------------------------- 7 push notification
check("channel Android dibuat saat app start", "ensureAndroidChannel();" in push_hook and "useEffect(() => {\n    ensureAndroidChannel();" in push_hook)
check("channel id 'default' sesuai payload backend", "ANDROID_CHANNEL_ID = 'default'" in push_hook and "channelId" in push_service)
check("importance channel memungkinkan notifikasi tampil", "AndroidImportance.MAX" in push_hook)
check("registrasi diulang saat app kembali aktif", "AppState.addEventListener" in push_hook)
check("token gagal tidak membuat crash (try/catch + return null)", "token failed" in push_hook)
check("logging diagnostik hanya di development", "__DEV__" in push_hook)
check("token tidak pernah dicetak utuh", "maskToken" in push_hook)
check("notifikasi foreground tetap ditampilkan", "shouldShowBanner: true" in push_hook)
check("kredensial FCM Android lewat env (tidak dipalsukan)", "GOOGLE_SERVICES_JSON" in config and "googleServicesFile" in config)
check("backend mencatat alasan penolakan push provider", "push.rejected" in push_service and "push.bulk_rejected" in push_service)
check("broadcast mencatat jumlah device & alasan", "devices=%s accepted=%s reason=%s" in broadcast)
check("broadcast tetap memicu push (bukan hanya record)", "push_service.send_to_customers" in broadcast)

print()
print("HASIL:", "SEMUA CEK LULUS" if not FAILS else f"{len(FAILS)} CEK GAGAL -> {FAILS}")
sys.exit(1 if FAILS else 0)
