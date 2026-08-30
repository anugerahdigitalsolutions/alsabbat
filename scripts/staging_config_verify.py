"""Staging (aaPanel-compatible) configuration verification.

Read-only apart from ONE temporary media upload used to prove that LOCAL disk
storage works end to end. That upload is hard-deleted again before the script
exits, so no test data is left behind and no existing data is ever touched.

Usage:  python scripts/staging_config_verify.py [base_url]
Example: python scripts/staging_config_verify.py https://api-staging.alsabbat.com
"""
from __future__ import annotations

import io
import os
import sys
from pathlib import Path

import requests

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from dotenv import dotenv_values  # noqa: E402

ENV = dotenv_values(Path(__file__).resolve().parents[1] / "backend" / ".env")

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((PASS if ok else FAIL, name, detail))
    print(f"[{PASS if ok else FAIL}] {name}" + (f" -> {detail}" if detail else ""))
    return ok


def main() -> int:
    print("=" * 78)
    print(f"ALSABBAT staging config verification against {BASE}")
    print("=" * 78)

    # ---------------------------------------------------------- 1. env hygiene
    print("\n-- 1. Environment file hygiene --")
    raw = (Path(__file__).resolve().parents[1] / "backend" / ".env").read_text()
    keys = [ln.split("=")[0] for ln in raw.splitlines() if ln.strip() and not ln.startswith("#") and "=" in ln]
    dupes = {k for k in keys if keys.count(k) > 1}
    check("no duplicate keys in backend/.env", not dupes, str(dupes or "none"))
    check(
        "MEDIA_STORAGE_PROVIDER is LOCAL (aaPanel mode)",
        ENV.get("MEDIA_STORAGE_PROVIDER") == "LOCAL",
        str(ENV.get("MEDIA_STORAGE_PROVIDER")),
    )
    check(
        "staging DB is isolated from production name",
        ENV.get("MONGODB_DB_NAME") == "alsabbat_platform_staging",
        str(ENV.get("MONGODB_DB_NAME")),
    )
    check("stale DB_NAME=test_database removed", ENV.get("DB_NAME") is None, str(ENV.get("DB_NAME")))
    check("ENVIRONMENT is staging", ENV.get("ENVIRONMENT") == "staging", str(ENV.get("ENVIRONMENT")))

    # ---------------------------------------------------------- 2. env templates
    print("\n-- 2. Committed env templates --")
    root = Path(__file__).resolve().parents[1]
    for rel in ("backend/.env.example", "frontend/.env.example"):
        p = root / rel
        check(f"{rel} exists", p.exists())
        if p.exists():
            body = p.read_text()
            leaked = [
                s for s in (ENV.get("JWT_SECRET"), ENV.get("EMERGENT_LLM_KEY"))
                if s and len(s) > 12 and s in body
            ]
            check(f"{rel} contains no real secrets", not leaked)

    # ---------------------------------------------------------------- 3. health
    print("\n-- 3. API health --")
    r = requests.get(f"{API}/health", timeout=15)
    body = r.json()
    check("GET /api/health -> 200", r.status_code == 200, str(r.status_code))
    check("database connected", body.get("database") == "connected", str(body.get("database")))
    check("reports environment=staging", body.get("environment") == "staging", str(body.get("environment")))

    # ------------------------------------------------------------------ 4. auth
    print("\n-- 4. Admin authentication --")
    email, pwd = ENV.get("BOOTSTRAP_ADMIN_EMAIL"), ENV.get("BOOTSTRAP_ADMIN_PASSWORD")
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=20)
    ok = check(f"POST /api/auth/login as {email} -> 200", r.status_code == 200, str(r.status_code))
    if not ok:
        print(f"    body: {r.text[:300]}")
        return 1
    token = r.json().get("access_token") or r.json().get("token")
    check("access_token returned", bool(token))
    headers = {"Authorization": f"Bearer {token}"}

    # ----------------------------------------------------- 5. media storage mode
    print("\n-- 5. Media storage status --")
    r = requests.get(f"{API}/media/storage/status", headers=headers, timeout=20)
    if not check("GET /api/media/storage/status -> 200", r.status_code == 200, str(r.status_code)):
        print(f"    body: {r.text[:300]}")
        return 1
    st = r.json()
    check("provider is LOCAL", st.get("provider") == "LOCAL", str(st.get("provider")))
    check("backend reports configured", st.get("configured") is True)
    check("local_dir is reported", bool(st.get("local_dir")), str(st.get("local_dir")))
    check(
        "persistence flag mirrors MEDIA_LOCAL_PERSISTENT",
        st.get("persistent") is (str(ENV.get("MEDIA_LOCAL_PERSISTENT", "")).lower() == "true"),
        f"persistent={st.get('persistent')} env={ENV.get('MEDIA_LOCAL_PERSISTENT')}",
    )
    print(f"    note: {st.get('note')}")

    # -------------------------------------------------- 6. real upload on disk
    print("\n-- 6. LOCAL upload round-trip (proves aaPanel disk mode works) --")
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000a49444154789c6300010000050001"
        "0d0a2db40000000049454e44ae426082"
    )
    r = requests.post(
        f"{API}/media/upload",
        headers=headers,
        files={"file": ("staging-verify.png", io.BytesIO(png), "image/png")},
        timeout=60,
    )
    if not check("POST /api/media/upload -> 201", r.status_code == 201, str(r.status_code)):
        print(f"    body: {r.text[:400]}")
        return 1
    up = r.json()
    url = up.get("url") or (up.get("data") or {}).get("url")
    key = up.get("storage_key") or (up.get("data") or {}).get("storage_key")
    media_id = up.get("id") or (up.get("data") or {}).get("id")
    check("upload returned a URL", bool(url), str(url))
    check("URL served through /api/media/files", bool(url) and "/api/media/files/" in url)

    local_dir = st.get("local_dir") or ENV.get("MEDIA_LOCAL_DIR") or ""
    if key and local_dir:
        on_disk = Path(local_dir) / key
        check("file physically written to server disk", on_disk.exists(), str(on_disk))

    if url:
        path = url.split("/api", 1)[1] if url.startswith("http") else url.split("/api", 1)[1]
        r = requests.get(f"{API}{path}", timeout=30)
        check("uploaded file is downloadable", r.status_code == 200, str(r.status_code))
        # NOTE: bytes intentionally differ from the upload — MediaService runs
        # sanitize_upload() which re-encodes images (strips EXIF/metadata).
        check(
            "served file is a non-empty PNG",
            r.content.startswith(b"\x89PNG") and len(r.content) > 0,
            f"{len(r.content)} bytes, content-type={r.headers.get('Content-Type')}",
        )

    # ------------------------------------------- 6b. clean up the test artifact
    # The verification upload must never be left behind on a real environment.
    if media_id:
        r = requests.delete(f"{API}/media/{media_id}/hard", headers=headers, timeout=30)
        check(
            "verification upload cleaned up (no test data left behind)",
            r.status_code in (200, 204),
            str(r.status_code),
        )
    else:
        check("verification upload cleaned up (no test data left behind)", False,
              "no media id returned — remove the 'staging-verify.png' record manually")

    # ------------------------------------------------- 7. public routes intact
    print("\n-- 7. Existing public API routes still respond --")
    for path in ("/", "/club", "/teams", "/players", "/matches", "/content/posts", "/merchandise/products"):
        try:
            r = requests.get(f"{API}{path}", timeout=20)
            check(f"GET /api{path}", r.status_code in (200, 404), str(r.status_code))
        except Exception as exc:
            check(f"GET /api{path}", False, str(exc))

    print("\n" + "=" * 78)
    failed = [r for r in results if r[0] == FAIL]
    print(f"TOTAL {len(results)} checks | PASS {len(results) - len(failed)} | FAIL {len(failed)}")
    for _, name, detail in failed:
        print(f"  FAILED: {name} -> {detail}")
    print("=" * 78)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
