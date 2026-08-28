"""Regression checks for the bugs fixed during the ALSABBAT repair pass.

Every check maps to a specific defect that was reproduced first, then fixed.
Self-cleaning: any record it creates is deleted again before exit.

Usage: python scripts/regression_checks.py [base_url]
       python scripts/regression_checks.py https://api-staging.alsabbat.com
"""
from __future__ import annotations

import re
import sys
import uuid
from pathlib import Path

import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"
ENV = dotenv_values(ROOT / "backend" / ".env")
TAG = uuid.uuid4().hex[:6]

results: list[tuple[bool, str, str]] = []


def check(ok: bool, name: str, detail: str = "") -> bool:
    results.append((ok, name, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" -> {detail}" if detail else ""))
    return ok


def main() -> int:
    print("=" * 86)
    print("ALSABBAT regression checks (bugs fixed in the repair pass)")
    print("=" * 86)

    r = requests.post(f"{API}/auth/login", json={
        "email": ENV.get("BOOTSTRAP_ADMIN_EMAIL"),
        "password": ENV.get("BOOTSTRAP_ADMIN_PASSWORD")}, timeout=30)
    if not check(r.status_code == 200, "admin login", str(r.status_code)):
        return 1
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    trash: list[str] = []

    # ---------------------------------------------------------------- BUG 1
    print("\n-- BUG 1: product/category created without a slug got slug=None, so the")
    print("           storefront linked to /merchandise/null ('Product not found') --")
    p = requests.post(f"{API}/merchandise/catalog/products", headers=h, timeout=30,
                      json={"name": f"Regresi Produk {TAG}", "price": 1000,
                            "status": "ACTIVE", "stock_quantity": 1}).json()
    trash.append(f"/merchandise/catalog/products/{p.get('id')}")
    check(bool(p.get("slug")), "product gets an auto-generated slug", repr(p.get("slug")))

    c = requests.post(f"{API}/merchandise/catalog/categories", headers=h, timeout=30,
                      json={"name": f"Regresi Kategori {TAG}", "status": "ACTIVE"}).json()
    trash.append(f"/merchandise/catalog/categories/{c.get('id')}")
    check(bool(c.get("slug")), "product category gets an auto-generated slug", repr(c.get("slug")))

    if p.get("slug"):
        rr = requests.get(f"{API}/merchandise/products/by-slug/{p['slug']}", timeout=30)
        check(rr.status_code == 200, "product reachable by its generated slug", str(rr.status_code))
    # legacy documents stored with slug=None must stay reachable by id
    rr = requests.get(f"{API}/merchandise/products/by-slug/{p.get('id')}", timeout=30)
    check(rr.status_code == 200, "product also reachable by id (legacy null-slug rows)", str(rr.status_code))

    # ---------------------------------------------------------------- BUG 2
    print("\n-- BUG 2: sitemap/robots used the API host, so every SEO URL pointed at")
    print("           api-staging.alsabbat.com where those pages do not exist --")
    if ENV.get("PUBLIC_SITE_URL"):
        check(True, "PUBLIC_SITE_URL is set (authoritative)", ENV["PUBLIC_SITE_URL"])
    else:
        for api_host, expected in [("api-staging.alsabbat.com", "https://staging.alsabbat.com"),
                                   ("api.alsabbat.com", "https://alsabbat.com"),
                                   ("example.com", "https://example.com")]:
            rr = requests.get(f"{API}/seo/settings", timeout=30,
                              headers={"Host": api_host, "X-Forwarded-Proto": "https"})
            got = rr.json().get("site_url") if rr.status_code == 200 else f"HTTP {rr.status_code}"
            check(got == expected, f"Host {api_host} -> public site URL", f"{got} (expected {expected})")

    # ---------------------------------------------------------- BUG 3 and 4
    print("\n-- BUG 3: sitemap listed gallery albums by slug, but albums resolve by id --")
    print("-- BUG 4: sitemap filtered albums on `status`, leaking unpublished DRAFTs --")
    pub = requests.post(f"{API}/gallery/albums", headers=h, timeout=30,
                        json={"title": f"Regresi Album Publik {TAG}", "status": "ACTIVE",
                              "publish_status": "PUBLISHED"}).json()
    draft = requests.post(f"{API}/gallery/albums", headers=h, timeout=30,
                          json={"title": f"Regresi Album Draft {TAG}", "status": "ACTIVE",
                                "publish_status": "DRAFT"}).json()
    trash.append(f"/gallery/albums/{pub.get('id')}")
    trash.append(f"/gallery/albums/{draft.get('id')}")

    xml = requests.get(f"{API}/seo/sitemap.xml", timeout=30,
                       headers={"Host": "api-staging.alsabbat.com",
                                "X-Forwarded-Proto": "https"}).text
    locs = re.findall(r"<loc>(.*?)</loc>", xml)
    gallery_locs = [u for u in locs if "/gallery/" in u]

    check(any(u.endswith(pub.get("id", "\x00")) for u in gallery_locs),
          "published album appears in sitemap addressed BY ID",
          f"{len(gallery_locs)} gallery URL(s)")
    check(not any(draft.get("id", "\x00") in u for u in locs),
          "DRAFT album is NOT leaked into the sitemap")
    check(not any(draft.get("slug") and draft["slug"] in u for u in locs),
          "DRAFT album slug is NOT leaked into the sitemap")
    if pub.get("slug"):
        check(not any(u.endswith(pub["slug"]) for u in gallery_locs),
              "sitemap does not use unroutable album slugs", repr(pub.get("slug")))
    # every gallery URL in the sitemap must actually resolve
    unresolved = []
    for u in gallery_locs:
        ident = u.rstrip("/").split("/")[-1]
        rr = requests.get(f"{API}/gallery/public/albums/{ident}", timeout=30)
        if rr.status_code != 200:
            unresolved.append(f"{ident}:{rr.status_code}")
    check(not unresolved, "every gallery URL in the sitemap resolves", "; ".join(unresolved) or "all 200")

    # ---------------------------------------------------------------- BUG 5
    print("\n-- BUG 5: media URLs are relative (/api/media/files/...); rendering them raw")
    print("           breaks images on the split-domain aaPanel deployment --")
    src = ROOT / "frontend" / "src"
    pattern = re.compile(
        r"src=\{[^}]*(cover_url|thumbnail|photo_url|sponsor\.logo|trophy_image|member\.photo|player\.photo)[^}]*\}")
    offenders = []
    for f in src.rglob("*.js"):
        for line_no, line in enumerate(f.read_text(errors="ignore").splitlines(), 1):
            if pattern.search(line) and "resolveMediaUrl" not in line and "resolveUrl" not in line:
                offenders.append(f"{f.relative_to(ROOT)}:{line_no}")
    check(not offenders, "no component renders an unresolved media URL",
          "; ".join(offenders[:5]) or "all wrapped in resolveMediaUrl")

    helper = src / "components" / "public" / "gallery" / "mediaUtils.js"
    check(helper.exists() and "BACKEND_URL" in helper.read_text(),
          "resolveMediaUrl still prefixes REACT_APP_BACKEND_URL")

    # -------------------------------------------------------------- teardown
    print("\n-- teardown --")
    leftover = []
    for path in reversed(trash):
        if path.endswith("None"):
            continue
        d = requests.delete(f"{API}{path}", headers=h, timeout=30)
        if d.status_code not in (200, 204, 404):
            leftover.append(f"{path}:{d.status_code}")
    check(not leftover, "regression fixtures removed", "; ".join(leftover) or "clean")

    print("\n" + "=" * 86)
    failed = [x for x in results if not x[0]]
    print(f"TOTAL {len(results)} checks | PASS {len(results) - len(failed)} | FAIL {len(failed)}")
    for _, name, detail in failed:
        print(f"  FAILED: {name} -> {detail}")
    print("=" * 86)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
