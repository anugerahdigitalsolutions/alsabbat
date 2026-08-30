"""Verifikasi header CORS pada berkas media (alur Media Library -> ImageCropper).

Menyimulasikan kondisi staging aaPanel: CORS_ORIGINS TIDAK memuat origin frontend.
Sebelum perbaikan, response berkas lokal tidak memiliki Access-Control-Allow-Origin
sehingga fetch() di ImageCropper gagal (net::ERR_FAILED).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import settings  # noqa: E402

ORIGIN = "https://staging.alsabbat.com"
results = []


def check(label, actual, expected):
    ok = actual == expected
    results.append(ok)
    print(f"{'OK  ' if ok else 'FAIL'} {label}: {actual!r} (harap {expected!r})")


def main():
    # Kondisi paling ketat: origin frontend tidak terdaftar di CORS_ORIGINS.
    settings.CORS_ORIGINS = ["https://alsabbat.com"]

    media_dir = Path(settings.MEDIA_LOCAL_DIR)
    media_dir.mkdir(parents=True, exist_ok=True)
    sample = media_dir / "cors_check_sample.png"
    sample.write_bytes(
        bytes.fromhex(
            "89504e470d0a1a0a0000000d494844520000000100000001080600000"
            "01f15c4890000000a49444154789c6300010000050001"
            "0d0a2db40000000049454e44ae426082"
        )
    )

    from app.main import create_app

    client = TestClient(create_app())
    try:
        res = client.get(f"/api/media/files/{sample.name}", headers={"Origin": ORIGIN})
        check("status berkas lokal", res.status_code, 200)
        check("Access-Control-Allow-Origin", res.headers.get("access-control-allow-origin"), "*")
        check(
            "Cross-Origin-Resource-Policy",
            res.headers.get("cross-origin-resource-policy"),
            "cross-origin",
        )
        check("Cache-Control tetap", res.headers.get("cache-control"), "public, max-age=86400")

        # Origin yang terdaftar tetap dilayani (middleware CORS existing tidak terganggu).
        res2 = client.get(
            f"/api/media/files/{sample.name}", headers={"Origin": "https://alsabbat.com"}
        )
        check("origin terdaftar tetap punya ACAO", bool(res2.headers.get("access-control-allow-origin")), True)

        # Path traversal tetap ditolak.
        res3 = client.get("/api/media/files/../../etc/passwd")
        check("path traversal tetap ditolak", res3.status_code in (400, 404), True)
    finally:
        sample.unlink(missing_ok=True)

    print(f"\nHASIL: {sum(results)} lolos, {len(results) - sum(results)} gagal")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
