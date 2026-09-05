"""Generate the native Expo asset set for the AL SABBAT mobile app.

Source of truth = the OFFICIAL club artwork already committed in the web
project (`frontend/public/brand`, `frontend/public/onboarding`). The logo is
never redrawn: it is only placed on the official brand colours (navy #012891 /
gold #FCCF2B) and resized for Android icon / adaptive icon / splash slots.

Run:  python3 scripts/prepare-native-assets.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT.parent / "frontend" / "public"
OUT = ROOT / "assets"
OUT.mkdir(parents=True, exist_ok=True)

NAVY = (1, 40, 145, 255)
NAVY_DEEP = (1, 22, 82, 255)
GOLD = (252, 207, 43, 255)

logo = Image.open(WEB / "brand" / "alsabbat-logo.png").convert("RGBA")
mark = Image.open(WEB / "brand" / "alsabbat-logo-mark.png").convert("RGBA")


def trim(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    return image.crop(bbox) if bbox else image


def fit(image: Image.Image, box: int) -> Image.Image:
    src = trim(image)
    ratio = min(box / src.width, box / src.height)
    return src.resize((max(1, int(src.width * ratio)), max(1, int(src.height * ratio))), Image.LANCZOS)


def canvas(size: int, colour) -> Image.Image:
    return Image.new("RGBA", (size, size), colour)


def centered(base: Image.Image, art: Image.Image) -> Image.Image:
    out = base.copy()
    out.alpha_composite(art, ((base.width - art.width) // 2, (base.height - art.height) // 2))
    return out


def vertical_gradient(width: int, height: int, top, bottom) -> Image.Image:
    grad = Image.new("RGBA", (1, height))
    px = grad.load()
    for y in range(height):
        t = y / max(1, height - 1)
        px[0, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(4))
    return grad.resize((width, height), Image.BICUBIC)


# ----------------------------------------------------------- app icon (navy)
icon = centered(canvas(1024, NAVY), fit(logo, 800))
icon.convert("RGB").save(OUT / "icon.png")

# ------------------------------------------------------------ adaptive icon
centered(canvas(1024, (0, 0, 0, 0)), fit(logo, 620)).save(OUT / "android-icon-foreground.png")
canvas(1024, NAVY).convert("RGB").save(OUT / "android-icon-background.png")

mono_art = fit(logo, 620)
mono = Image.new("RGBA", mono_art.size, (255, 255, 255, 0))
mono.putalpha(mono_art.getchannel("A"))
white = Image.new("RGBA", mono_art.size, (255, 255, 255, 255))
white.putalpha(mono_art.getchannel("A"))
centered(canvas(1024, (0, 0, 0, 0)), white).save(OUT / "android-icon-monochrome.png")

# ------------------------------------------------------------------- splash
centered(canvas(1024, (0, 0, 0, 0)), fit(logo, 720)).save(OUT / "splash-icon.png")

# ---------------------------------------------------------------- app logos
fit(logo, 512).save(OUT / "logo.png")
fit(mark, 512).save(OUT / "logo-mark.png")
fit(logo, 96).save(OUT / "favicon.png")

# ------------------------------------------------- onboarding (official set)
SIZE = (1080, 1350)


def cover(image: Image.Image, size) -> Image.Image:
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((int(image.width * ratio), int(image.height * ratio)), Image.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


for index, name in enumerate(["onboarding-1-900.webp", "onboarding-2-900.webp"], start=1):
    photo = cover(Image.open(WEB / "onboarding" / name).convert("RGB"), SIZE)
    photo.save(OUT / f"onboarding-{index}.jpg", quality=88)

# Slides 3 & 4: brand artwork (official crest on club colours) — no stock or
# invented photography, so the club can drop real photos in later.
for index, (top, bottom, art) in enumerate(
    [(NAVY, NAVY_DEEP, mark), (NAVY_DEEP, (0, 0, 0, 255), logo)], start=3
):
    base = vertical_gradient(SIZE[0], SIZE[1], top, bottom)
    glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-260, 420, SIZE[0] + 260, SIZE[1] + 260), fill=(GOLD[0], GOLD[1], GOLD[2], 26))
    base.alpha_composite(glow)
    piece = fit(art, 620)
    base.alpha_composite(piece, ((SIZE[0] - piece.width) // 2, (SIZE[1] - piece.height) // 2 - 90))
    base.convert("RGB").save(OUT / f"onboarding-{index}.jpg", quality=90)

print("assets written:", sorted(p.name for p in OUT.iterdir()))
