"""SEO foundation — defaults, sitemap architecture and robots policy."""
from __future__ import annotations

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


def _site_url(request: Request) -> str:
    if settings.PUBLIC_SITE_URL:
        return settings.PUBLIC_SITE_URL.rstrip("/")
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
    album_items, _ = await albums.list({"status": "ACTIVE"}, limit=200)
    urls += [f"{site_url}/gallery/{a.get('slug')}" for a in album_items if a.get("slug")]
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
