"""SEO foundation — defaults, sitemap architecture and robots policy."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse, Response

from app.api.crud_factory import Repository
from app.core.config import settings
from app.core.database import Collections

router = APIRouter(tags=["seo"])
clubs = Repository(Collections.CLUBS)
posts = Repository(Collections.POSTS)
matches = Repository(Collections.MATCHES)
albums = Repository(Collections.GALLERY_ALBUMS)

logger = logging.getLogger(__name__)
_warned_missing_site_url = False


def _public_host(api_host: str) -> str:
    """Derive the PUBLIC website host from the API host.

    Staging and production serve the API on a dedicated sub-domain
    (`api-staging.alsabbat.com`, `api.alsabbat.com`) while the pages the sitemap
    must point at live on the site domain (`staging.alsabbat.com`,
    `alsabbat.com`). Without this the sitemap advertised URLs on the API domain,
    where those routes do not exist, so every indexed link was broken.

        api.alsabbat.com          -> alsabbat.com
        api-staging.alsabbat.com  -> staging.alsabbat.com

    Any other host (single-domain or local development) is returned unchanged.
    """
    label, _, remainder = api_host.partition(".")
    if not remainder:
        return api_host
    if label == "api":
        return remainder
    if label.startswith("api-") and len(label) > 4:
        return f"{label[4:]}.{remainder}"
    return api_host


def _site_url(request: Request) -> str:
    """Public origin. Environment first (PUBLIC_SITE_URL), proxy headers second."""
    if settings.PUBLIC_SITE_URL:
        return settings.PUBLIC_SITE_URL.rstrip("/")

    global _warned_missing_site_url
    if not _warned_missing_site_url:
        _warned_missing_site_url = True
        logger.warning(
            "PUBLIC_SITE_URL is not set — SEO URLs are being derived from the request "
            "host. Set PUBLIC_SITE_URL (e.g. https://staging.alsabbat.com) so the "
            "sitemap and robots.txt always point at the public website."
        )

    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if forwarded_host:
        scheme = request.headers.get("x-forwarded-proto", "https").split(",")[0].strip()
        host = forwarded_host.split(",")[0].strip()
        return f"{scheme}://{_public_host(host)}"
    return str(request.base_url).rstrip("/")


@router.get("/settings", summary="SEO defaults derived from the club configuration")
async def seo_settings(request: Request):
    club = await clubs.get_by({"status": "ACTIVE"})
    seo = (club or {}).get("seo") or {}
    site_url = _site_url(request)
    return {
        "site_url": site_url,
        "title": seo.get("title") or f"{(club or {}).get('name', 'ALSABBAT Football Club')}",
        "description": seo.get("description")
        or "Official digital platform of ALSABBAT Football Club.",
        "keywords": seo.get("keywords") or ["ALSABBAT", "Football Club"],
        "open_graph": {
            "type": "website",
            "site_name": (club or {}).get("short_name", "ALSABBAT"),
            "image": seo.get("og_image") or (club or {}).get("logo"),
            "url": seo.get("canonical_url") or site_url,
        },
        "canonical_url": seo.get("canonical_url") or site_url,
        "robots": "index,follow",
        "sitemap_url": f"{site_url}/api/seo/sitemap.xml",
    }


@router.get("/sitemap.xml", summary="Sitemap architecture (dynamic)")
async def sitemap(request: Request):
    site_url = _site_url(request)
    urls = [f"{site_url}/", f"{site_url}/news", f"{site_url}/matches", f"{site_url}/gallery"]
    published, _ = await posts.list({"status": "PUBLISHED"}, limit=200)
    urls += [f"{site_url}/news/{p.get('slug')}" for p in published if p.get("slug")]
    # Only PUBLISHED albums may be advertised. Filtering on `status` leaked
    # unpublished (DRAFT) albums to crawlers, because `status` is the generic
    # ACTIVE/INACTIVE lifecycle flag while `publish_status` drives publication —
    # this now mirrors the public /gallery/public/albums endpoint exactly.
    album_items, _ = await albums.list({"publish_status": "PUBLISHED"}, limit=200)
    # Album pages resolve by id (route /gallery/:albumId); album slugs are not
    # routable, so emitting them produced 404s for every gallery URL.
    urls += [f"{site_url}/gallery/{a.get('id')}" for a in album_items if a.get("id")]
    match_items, _ = await matches.list({}, limit=200)
    urls += [f"{site_url}/matches/{m.get('id')}" for m in match_items if m.get("id")]

    body = "".join(f"<url><loc>{u}</loc></url>" for u in urls)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{body}</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt", response_class=PlainTextResponse, summary="Robots policy")
async def robots(request: Request):
    site_url = _site_url(request)
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        f"Sitemap: {site_url}/api/seo/sitemap.xml\n"
    )
