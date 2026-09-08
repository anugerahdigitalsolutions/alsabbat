"""Generate the native Expo asset set for the AL SABBAT mobile app.

SUMBER TUNGGAL (semua di `mobile/assets/source/`, artwork resmi klub):
  - `alsabbat-logo.png`  : logo resmi AL SABBAT Football Club, background
                           TRANSPARAN (alpha asli). Tidak pernah didesain ulang,
                           tidak diubah bentuk/warna/proporsinya — hanya di-trim
                           (buang area transparan) lalu di-resize.
  - `onboarding-1..3.png`: 3 foto resmi klub untuk onboarding (rasio 9:16),
                           dipakai apa adanya tanpa cropping objek utama.

Output (dipakai `app.config.js` dan komponen mobile):
  icon.png                      -> app icon (latar gradasi HITAM -> BIRU klub)
  android-icon-foreground.png   -> adaptive icon foreground (logo transparan)
  android-icon-background.png   -> adaptive icon background (gradasi sama)
  android-icon-monochrome.png   -> adaptive icon monochrome (siluet logo)
  splash-icon.png               -> splash (logo transparan)
  logo.png                      -> logo in-app (transparan: splash, header, profil)
  favicon.png                   -> favicon kecil (transparan)
  onboarding-1..3.jpg           -> gambar onboarding

Jalankan:  python3 scripts/prepare-native-assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
SRC = OUT / "source"
OUT.mkdir(parents=True, exist_ok=True)

NAVY = (1, 40, 145, 255)
# Latar app icon: hitam pekat (dominan) -> biru resmi klub (aksen).
ICON_BLACK = (2, 5, 14)
ICON_GRADIENT_POWER = 1.65

logo = Image.open(SRC / "alsabbat-logo.png").convert("RGBA")

if logo.getchannel("A").getextrema()[0] == 255:
    raise SystemExit(
        "Logo sumber tidak transparan (alpha penuh). Ganti "
        "assets/source/alsabbat-logo.png dengan PNG resmi berlatar transparan."
    )


def trim(image: Image.Image) -> Image.Image:
    """Buang area transparan di sekeliling logo (bentuk logo tidak berubah)."""
    bbox = image.getchannel("A").getbbox()
    return image.crop(bbox) if bbox else image


def fit(image: Image.Image, box: int) -> Image.Image:
    src = trim(image)
    ratio = min(box / src.width, box / src.height)
    return src.resize((max(1, int(src.width * ratio)), max(1, int(src.height * ratio))), Image.LANCZOS)


def canvas(size: int, colour) -> Image.Image:
    return Image.new("RGBA", (size, size), colour)


def icon_gradient(size: int) -> Image.Image:
    """Latar app icon: gradasi diagonal HITAM -> BIRU AL SABBAT.

    Hanya LATAR yang dibuat di sini (logo tetap artwork resmi existing, tidak
    di-redraw). Hitam dominan mulai dari sudut kiri-atas, biru klub (#012891)
    sebagai aksen di sudut kanan-bawah. Dihitung per-piksel dengan easing
    sehingga transisinya halus (bukan dua warna terpotong) dan tetap terbaca
    saat icon ditampilkan kecil. Tanpa pattern/tekstur/glow tambahan.
    """
    axis = np.linspace(0.0, 1.0, size, dtype=np.float32)
    position = (axis[None, :] + axis[:, None]) / 2.0
    weight = np.power(position, ICON_GRADIENT_POWER)[..., None]
    start = np.array(ICON_BLACK, dtype=np.float32)
    end = np.array(NAVY[:3], dtype=np.float32)
    pixels = np.round(start + (end - start) * weight).astype(np.uint8)
    return Image.fromarray(pixels, mode="RGB").convert("RGBA")


def centered(base: Image.Image, art: Image.Image) -> Image.Image:
    out = base.copy()
    out.alpha_composite(art, ((base.width - art.width) // 2, (base.height - art.height) // 2))
    return out


# ------------------------------------------------ app icon (black -> blue)
# iOS/Android app icon tidak boleh transparan. Latar memakai gradasi hitam ->
# biru resmi klub (#012891); ukuran & posisi logo TIDAK berubah (fit 820, center).
centered(icon_gradient(1024), fit(logo, 820)).convert("RGB").save(OUT / "icon.png")

# ---------------------------------------------------------- adaptive icon
# Foreground transparan + background gradasi yang sama dengan app icon:
# launcher Android memotong sesuai bentuk device tanpa kotak putih.
centered(canvas(1024, (0, 0, 0, 0)), fit(logo, 640)).save(OUT / "android-icon-foreground.png")
icon_gradient(1024).convert("RGB").save(OUT / "android-icon-background.png")

mono_art = fit(logo, 640)
white = Image.new("RGBA", mono_art.size, (255, 255, 255, 255))
white.putalpha(mono_art.getchannel("A"))
centered(canvas(1024, (0, 0, 0, 0)), white).save(OUT / "android-icon-monochrome.png")

# ----------------------------------------------------------------- splash
centered(canvas(1024, (0, 0, 0, 0)), fit(logo, 780)).save(OUT / "splash-icon.png")

# -------------------------------------------------------------- in-app logo
fit(logo, 768).save(OUT / "logo.png")
fit(logo, 96).save(OUT / "favicon.png")

# ------------------------------------------------------------- onboarding
for index in (1, 2, 3):
    photo = Image.open(SRC / f"onboarding-{index}.png").convert("RGB")
    photo.save(OUT / f"onboarding-{index}.jpg", quality=90, optimize=True)

for path in sorted(OUT.iterdir()):
    if path.is_file():
        with Image.open(path) as image:
            print(f"{path.name:32} {image.size} {image.mode}")
