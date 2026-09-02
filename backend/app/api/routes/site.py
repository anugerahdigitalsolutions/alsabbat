"""Homepage content: hero banners + editable site copy (Phase 15)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request

from app.api.crud_factory import Repository, build_crud_router
from app.api.deps import require_permission
from app.core.database import Collections
from app.core.rate_limit import write_rate_limit
from app.models.base import utcnow
from app.models.site import (
    BannerBase,
    BannerUpdate,
    SiteContentBase,
    SiteContentBulkRequest,
    SiteContentUpdate,
)

WIB = timezone(timedelta(hours=7))

banners_repo = Repository(Collections.BANNERS)
media_repo = Repository(Collections.MEDIA)
site_content_repo = Repository(Collections.SITE_CONTENT)

banners_router = APIRouter(tags=["banners"])
site_content_router = APIRouter(tags=["site-content"])


async def _resolve_images(banners: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    media_ids = [b["image_media_id"] for b in banners if b.get("image_media_id")]
    media_map: Dict[str, str] = {}
    if media_ids:
        cursor = media_repo.coll.find({"id": {"$in": media_ids}}, {"_id": 0, "id": 1, "url": 1})
        async for doc in cursor:
            if doc.get("url"):
                media_map[doc["id"]] = doc["url"]
    return [
        {**banner, "image_resolved": media_map.get(banner.get("image_media_id")) or banner.get("image_url")}
        for banner in banners
    ]


def _is_live(banner: Dict[str, Any], today: str) -> bool:
    starts_at = banner.get("starts_at")
    ends_at = banner.get("ends_at")
    if starts_at and str(starts_at)[:10] > today:
        return False
    if ends_at and str(ends_at)[:10] < today:
        return False
    return True


@banners_router.get("/public", summary="Public published hero banners")
async def public_banners():
    items, _ = await banners_repo.list({"status": "ACTIVE"}, limit=20, sort=[("display_order", 1)])
    today = datetime.now(WIB).date().isoformat()
    live = [banner for banner in items if _is_live(banner, today)]
    resolved = await _resolve_images(live)
    return {"items": resolved, "total": len(resolved)}


@banners_router.get("/preview", summary="Admin preview (includes unpublished banners)")
async def preview_banners(_user=Depends(require_permission("content:write"))):
    items, total = await banners_repo.list({}, limit=50, sort=[("display_order", 1)])
    resolved = await _resolve_images(items)
    return {"items": resolved, "total": total}


build_crud_router(
    resource="Banner",
    collection=Collections.BANNERS,
    create_model=BannerBase,
    update_model=BannerUpdate,
    write_permission="content:write",
    public_read=True,
    search_fields=("eyebrow", "headline_line_1", "headline_line_2", "headline_line_3"),
    filter_fields=("status",),
    default_sort=(("display_order", 1),),
    router=banners_router,
)


@site_content_router.get("/public", summary="Public site content map")
async def public_site_content():
    # Dibaca langsung dari collection: helper repository membatasi 200 dokumen,
    # sehingga kunci seperti `site.background` bisa terpotong (dan background
    # website diam-diam kembali ke default) begitu konten situs bertambah.
    cursor = site_content_repo.coll.find({}, {"_id": 0, "key": 1, "value": 1})
    values = {doc["key"]: doc.get("value") async for doc in cursor if doc.get("value")}
    return {"items": values, "total": len(values)}


@site_content_router.put("/bulk", summary="Upsert site content entries")
async def upsert_site_content(
    payload: SiteContentBulkRequest,
    request: Request,
    _user=Depends(require_permission("content:write")),
):
    write_rate_limit(request)
    now = utcnow().isoformat()
    saved = 0
    removed = 0
    for entry in payload.items:
        value = (entry.value or "").strip()
        if not value:
            result = await site_content_repo.coll.delete_one({"key": entry.key})
            removed += result.deleted_count
            continue
        await site_content_repo.coll.update_one(
            {"key": entry.key},
            {
                "$set": {
                    "value": value,
                    "label": entry.label,
                    "group": entry.group,
                    "updated_at": now,
                },
                "$setOnInsert": {"key": entry.key, "created_at": now},
            },
            upsert=True,
        )
        saved += 1
    return {"success": True, "saved": saved, "removed": removed}


build_crud_router(
    resource="SiteContent",
    collection=Collections.SITE_CONTENT,
    create_model=SiteContentBase,
    update_model=SiteContentUpdate,
    write_permission="content:write",
    public_read=True,
    search_fields=("key", "label", "value"),
    filter_fields=("group",),
    unique_fields=("key",),
    default_sort=(("key", 1),),
    router=site_content_router,
)
