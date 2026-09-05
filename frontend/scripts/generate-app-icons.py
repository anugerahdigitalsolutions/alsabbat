#!/usr/bin/env python3
"""Generate BARAYA AL SABBAT PWA icons from the official crest geometry.

Reproduces `public/favicon.svg` (navy rounded square + gold shield + gold "A")
as PNG icons required by the web manifest / iOS home screen. Run manually:

    python3 scripts/generate-app-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

NAVY = (1, 40, 145, 255)
GOLD = (252, 207, 43, 255)
BLACK_SOFT = (1, 22, 82, 255)  # darkened navy (ImageDraw does not alpha-composite)

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 4  # supersampling factor for smooth edges


def scale(points, k):
    return [(x * k, y * k) for x, y in points]


def draw_icon(size, maskable=False):
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # background: rounded square (full-bleed square when maskable)
    radius = 0 if maskable else int(s * 0.1875)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=NAVY)

    # crest is inset further on maskable icons to respect the safe zone
    inset = 0.74 if maskable else 1.0
    k = (s / 64.0) * inset
    off = (s - 64 * k) / 2

    def pts(points):
        return [(x * k + off, y * k + off) for x, y in points]

    # shield silhouette (soft dark fill)
    shield = [
        (32, 8), (50, 15), (50, 29), (48, 38), (43, 45),
        (38, 50), (32, 56), (26, 50), (21, 45), (16, 38),
        (14, 29), (14, 15),
    ]
    d.polygon(pts(shield), fill=BLACK_SOFT)

    # shield outline (gold stroke)
    outline = [
        (32, 11), (47, 16.9), (47, 29.3), (45, 37), (40, 44),
        (32, 52.5), (24, 44), (19, 37), (17, 29.3), (17, 16.9),
    ]
    d.line(pts(outline) + [pts(outline)[0]], fill=GOLD, width=max(2, int(2.5 * k)), joint="curve")

    # gold "A" monogram
    d.polygon(pts([(32, 20), (40.5, 42), (35.3, 42), (28.7, 42), (23.5, 42)]), fill=GOLD)
    # counter of the "A"
    d.polygon(pts([(32, 28.4), (34.6, 35.6), (29.4, 35.6)]), fill=NAVY)
    d.rectangle(pts([(28.6, 36.4), (35.4, 38.6)]), fill=GOLD)

    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-192.png", 192, True),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
    ]
    for name, size, maskable in targets:
        draw_icon(size, maskable).save(OUT / name, "PNG", optimize=True)
        print(f"wrote {OUT / name}")


if __name__ == "__main__":
    main()
