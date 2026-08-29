"""Verifikasi sanitizer media (unit, tanpa jaringan & tanpa database).

python scripts/media_sanitizer_verify.py
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../backend")

from PIL import Image  # noqa: E402

from app.core.errors import ValidationFailedError  # noqa: E402
from app.services.media_service import sanitize_upload  # noqa: E402

results = []


def check(name, cond, detail=""):
    results.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail else ""))


def png_transparent(w=400, h=400, text=None):
    img = Image.new("RGBA", (w, h), (252, 207, 43, 0))
    for x in range(0, w, 3):
        for y in range(0, h, 3):
            img.putpixel((x, y), ((x * 7) % 255, (y * 13) % 255, (x + y) % 255, 180))
    buf = io.BytesIO()
    if text:
        from PIL import PngImagePlugin

        meta = PngImagePlugin.PngInfo()
        meta.add_text("Comment", text)
        img.save(buf, format="PNG", pnginfo=meta)
    else:
        img.save(buf, format="PNG")
    return buf.getvalue()


def jpeg(w=600, h=400):
    img = Image.new("RGB", (w, h))
    for x in range(w):
        for y in range(0, h, 2):
            img.putpixel((x, y), ((x * 3) % 255, (y * 5) % 255, (x * y) % 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return buf.getvalue()


# 1. PNG transparan valid
name, content, mime = sanitize_upload("logo transparan.png", png_transparent(), "image/png")
check("PNG transparan valid diterima", mime == "image/png" and len(content) > 100, (name, mime, len(content)))
with Image.open(io.BytesIO(content)) as im:
    check("PNG transparan: alpha dipertahankan", im.mode in ("RGBA", "LA", "P"), im.mode)

# 2. JPEG valid
name, content, mime = sanitize_upload("foto.jpg", jpeg(), "image/jpeg")
check("JPEG valid diterima", mime == "image/jpeg" and name.endswith(".jpg"), (name, mime))

# 3. PNG valid yang memuat teks "<html>" di metadata → diterima & dibersihkan
raw = png_transparent(text="<html><script>alert(1)</script></html>")
check("PNG uji memang memuat payload", b"<html" in raw)
name, content, mime = sanitize_upload("payload.png", raw, "image/png")
check("PNG valid dengan payload metadata TETAP diterima", mime == "image/png")
check("payload HTML hilang setelah re-encode", b"<html" not in content and b"<script" not in content)

# 4. PNG dengan byte 'MZ' di dalam data (bukan offset 0) tetap diterima
mz = png_transparent(text="MZ" * 40)
name, content, mime = sanitize_upload("mz.png", mz, "image/png")
check("PNG dengan 'MZ' di dalam berkas diterima (bukan executable)", mime == "image/png")

# 5. HTML berkedok .jpg → ditolak
try:
    sanitize_upload("evil.jpg", b"<html><body><script>alert(1)</script></body></html>", "image/jpeg")
    check("HTML berkedok JPG ditolak", False)
except ValidationFailedError as e:
    check("HTML berkedok JPG ditolak", True, str(e))

# 6. SVG (skrip) → ditolak
try:
    sanitize_upload("evil.svg", b"<svg xmlns='http://www.w3.org/2000/svg'><script>x</script></svg>", "image/svg+xml")
    check("SVG ditolak", False)
except ValidationFailedError as e:
    check("SVG ditolak", True, str(e))

# 7. Executable → ditolak
try:
    sanitize_upload("app.png", b"MZ\x90\x00" + b"\x00" * 500, "image/png")
    check("Executable (MZ di offset 0) ditolak", False)
except ValidationFailedError as e:
    check("Executable (MZ di offset 0) ditolak", True, str(e))

# 8. ELF → ditolak
try:
    sanitize_upload("bin.jpg", b"\x7fELF" + b"\x00" * 500, "image/jpeg")
    check("ELF ditolak", False)
except ValidationFailedError as e:
    check("ELF ditolak", True, str(e))

# 9. Gambar rusak → ditolak
try:
    sanitize_upload("rusak.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 200, "image/png")
    check("PNG rusak ditolak", False)
except ValidationFailedError as e:
    check("PNG rusak ditolak", True, str(e))

# 10. Non-gambar (PDF) tetap dicek cuplikan berbahaya
try:
    sanitize_upload("doc.pdf", b"%PDF-1.4\n<?php system($_GET['c']); ?>", "application/pdf")
    check("PHP di dalam PDF ditolak", False)
except ValidationFailedError as e:
    check("PHP di dalam PDF ditolak", True, str(e))

ok = sum(1 for r in results if r)
print(f"\n{ok}/{len(results)} PASS")
sys.exit(0 if ok == len(results) else 1)
