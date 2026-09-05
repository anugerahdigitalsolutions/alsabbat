#!/usr/bin/env python3
"""Prepare the official AL SABBAT visual assets for the mobile web app / PWA.

Inputs (source artwork provided by the club) are read from SRC_DIR and written,
web-optimised, into frontend/public/. Re-run after replacing the sources:

    python3 scripts/prepare-brand-assets.py

Outputs
  public/brand/alsabbat-logo.png              square logo, white background
  public/brand/alsabbat-logo-mark.png         same logo with the white removed
  public/icons/icon-{192,512}.png             PWA icons  (any)
  public/icons/icon-maskable-{192,512}.png    PWA icons  (maskable, safe zone)
  public/icons/apple-touch-icon.png           iOS home screen
  public/icons/favicon-{16,32}.png            browser favicon
  public/onboarding/onboarding-N-{480,900}.webp
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path("/tmp/src")
BRAND = ROOT / "public" / "brand"
ICONS = ROOT / "public" / "icons"
ONBOARD = ROOT / "public" / "onboarding"

WHITE_CUT = 236   # >= this on every channel -> fully transparent
WHITE_SOFT = 208  # between SOFT and CUT -> feathered alpha


def load_logo():
    return Image.open(SRC_DIR / "logo.png").convert("RGBA")


def trim_white(img, tol=245):
    """Crop the uniform white margin so the crest fills the canvas."""
    rgb = img.convert("RGB")
    mask = rgb.point(lambda v: 255 if v < tol else 0).convert("L")
    box = mask.getbbox()
    return img.crop(box) if box else img


def square(img, background, pad_ratio):
    """Centre `img` on a square canvas, preserving aspect ratio (no stretch)."""
    side = max(img.size)
    canvas_side = int(side / (1 - 2 * pad_ratio))
    canvas = Image.new("RGBA", (canvas_side, canvas_side), background)
    inner = canvas_side - 2 * int(canvas_side * pad_ratio)
    scaled = img.copy()
    scaled.thumbnail((inner, inner), Image.LANCZOS)
    canvas.paste(
        scaled,
        ((canvas_side - scaled.width) // 2, (canvas_side - scaled.height) // 2),
        scaled,
    )
    return canvas


def remove_white(img):
    """Make the white paper background transparent, feathering the edges."""
    img = img.convert("RGBA")
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            low = min(r, g, b)
            if low >= WHITE_CUT:
                pixels[x, y] = (r, g, b, 0)
            elif low >= WHITE_SOFT:
                ratio = (low - WHITE_SOFT) / (WHITE_CUT - WHITE_SOFT)
                pixels[x, y] = (r, g, b, int(a * (1 - ratio)))
    return img


def save_png(img, path, size=None):
    out = img if size is None else img.resize((size, size), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, "PNG", optimize=True)
    print(f"  {path.relative_to(ROOT)}  {out.size[0]}x{out.size[1]}  "
          f"{path.stat().st_size // 1024} kB")


def build_logo():
    print("logo:")
    trimmed = trim_white(load_logo())

    # White-background square (used for the app icons: legible on any wallpaper)
    on_white = square(trimmed, (255, 255, 255, 255), 0.06)
    save_png(on_white, BRAND / "alsabbat-logo.png", 1024)

    # Transparent mark (used on the dark splash screen)
    mark = square(remove_white(trimmed), (0, 0, 0, 0), 0.02)
    save_png(mark, BRAND / "alsabbat-logo-mark.png", 1024)

    for size in (192, 512):
        save_png(on_white, ICONS / f"icon-{size}.png", size)

    # Maskable icons need the artwork inside the ~80% safe zone.
    maskable = square(trimmed, (255, 255, 255, 255), 0.17)
    for size in (192, 512):
        save_png(maskable, ICONS / f"icon-maskable-{size}.png", size)

    save_png(on_white, ICONS / "apple-touch-icon.png", 180)
    for size in (16, 32):
        save_png(on_white, ICONS / f"favicon-{size}.png", size)


def build_onboarding():
    print("onboarding:")
    ONBOARD.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(["ob1.webp", "ob2.webp"], start=1):
        source = Image.open(SRC_DIR / name).convert("RGB")
        for width in (480, 900):
            height = round(source.height * width / source.width)
            out = source.resize((width, height), Image.LANCZOS)
            path = ONBOARD / f"onboarding-{index}-{width}.webp"
            out.save(path, "WEBP", quality=80, method=6)
            print(f"  {path.relative_to(ROOT)}  {width}x{height}  "
                  f"{path.stat().st_size // 1024} kB")


if __name__ == "__main__":
    build_logo()
    build_onboarding()
