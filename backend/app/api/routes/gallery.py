"""Gallery module — Album -> Media items architecture.

Phase 1 delivered the Album/Media relationship.
Phase 4 (Match Gallery & Media Management) adds, **additively**:
  * publication workflow (DRAFT / PUBLISHED) with public-only read endpoints
  * album media assignment / detach / ordering (existing Media documents are
    reused — no duplicated uploads, no binaries in MongoDB)
  * enriched public payloads (cover resolution, photo/video counts, match info)
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import Field

from app.api.crud_factory import Repository, build_crud_router
from app.api.deps import require_permission
from app.core.database import Collections
from app.core.errors import NotFoundError, ValidationFailedError
from app.core.rate_limit import write_rate_limit
from app.models.auth import AuthContext
from app.models.base import AppBaseModel, utcnow
from app.models.domain import GalleryAlbumBase, GalleryAlbumUpdate

router = APIRouter(tags=["gallery"])
albums = Repository(Collections.GALLERY_ALBUMS)
media = Repository(Collections.MEDIA)
matches = Repository(Collections.MATCHES)

albums_router = APIRouter(tags=["gallery"])
public_router = APIRouter(tags=["gallery-public"])

MEDIA_SORT = (("display_order", 1), ("created_at", 1))
gallery_write = Depends(require_permission("gallery:write"))


class AlbumMediaSelection(AppBaseModel):
    """Existing media ids selected from the Media Library."""

    media_ids: List[str] = Field(default_factory=list, max_length=200)


# --------------------------------------------------------------- helpers
async def _album_media_items(album_id: str, limit: int = 200) -> List[Dict[str, Any]]:
    items, _ = await media.list({"album_id": album_id}, limit=limit, sort=MEDIA_SORT)
    return [item for item in items if item.get("status", "ACTIVE") == "ACTIVE"]


async def _enrich_album(album: Dict[str, Any], with_media: bool = False) -> Dict[str, Any]:
    items = await _album_media_items(album["id"])
    photos = [i for i in items if i.get("file_type") == "IMAGE"]
    videos = [i for i in items if i.get("file_type") == "VIDEO"]

    cover_url = album.get("cover_url")
    if album.get("cover_media_id"):
        cover = await media.get(album["cover_media_id"])
        if cover:
            cover_url = cover.get("thumbnail_url") or cover.get("url") or cover_url
    if not cover_url and photos:
        cover_url = photos[0].get("thumbnail_url") or photos[0].get("url")

    match = None
    if album.get("match_id"):
        match_doc = await matches.get(album["match_id"])
        if match_doc:
            match = {
                "id": match_doc["id"],
                "opponent": match_doc.get("opponent"),
                "date": match_doc.get("date"),
                "venue": match_doc.get("venue"),
                "venue_type": match_doc.get("venue_type"),
                "status": match_doc.get("status"),
                "home_score": match_doc.get("home_score"),
                "away_score": match_doc.get("away_score"),
            }

    enriched = {
        **album,
        "cover_url_resolved": cover_url,
        "media_total": len(items),
        "photo_count": len(photos),
        "video_count": len(videos),
        "match": match,
    }
    if with_media:
        enriched["media"] = items
    return enriched


def _published_query(extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    query: Dict[str, Any] = {"publish_status": "PUBLISHED"}
    if extra:
        query.update(extra)
    return query


# ------------------------------------------------------- public endpoints
@public_router.get("/albums", summary="Published gallery albums (public)")
async def public_albums(
    match_id: Optional[str] = Query(None),
    limit: int = Query(24, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    query = _published_query({"match_id": match_id} if match_id else None)
    items, total = await albums.list(
        query, limit=limit, skip=skip, sort=(("published_at", -1), ("created_at", -1))
    )
    enriched = [await _enrich_album(album) for album in items]
    return {"items": enriched, "total": total, "limit": limit, "skip": skip}


@public_router.get("/albums/{album_id}", summary="Published album detail with ordered media (public)")
async def public_album_detail(album_id: str):
    album = await albums.get_by(_published_query({"id": album_id}))
    if not album:
        raise NotFoundError("Gallery album not found")
    return await _enrich_album(album, with_media=True)


# -------------------------------------------------- admin album <-> media
@albums_router.get("/{album_id}/media", summary="Media items inside an album (ordered)")
async def album_media(
    album_id: str,
    limit: int = Query(60, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    album = await albums.get(album_id)
    if not album:
        raise NotFoundError("Gallery album not found")
    items, total = await media.list(
        {"album_id": album_id}, limit=limit, skip=skip, sort=MEDIA_SORT
    )
    return {"album": album, "items": items, "total": total, "limit": limit, "skip": skip}


@albums_router.post("/{album_id}/media", summary="Attach existing media to an album")
async def attach_media(
    album_id: str,
    payload: AlbumMediaSelection,
    request: Request,
    _user: AuthContext = gallery_write,
):
    write_rate_limit(request)
    album = await albums.get(album_id)
    if not album:
        raise NotFoundError("Gallery album not found")
    if not payload.media_ids:
        raise ValidationFailedError("Select at least one media item")

    existing = await _album_media_items(album_id)
    next_order = max([item.get("display_order") or 0 for item in existing], default=-1) + 1

    attached = 0
    for media_id in payload.media_ids:
        doc = await media.get(media_id)
        if not doc:
            continue
        await media.update(media_id, {"album_id": album_id, "display_order": next_order})
        next_order += 1
        attached += 1

    total = await media.count({"album_id": album_id})
    await albums.update(album_id, {"media_count": total})
    return {"success": True, "attached": attached, "media_count": total}


@albums_router.patch("/{album_id}/media/order", summary="Reorder media inside an album")
async def reorder_media(
    album_id: str,
    payload: AlbumMediaSelection,
    request: Request,
    _user: AuthContext = gallery_write,
):
    write_rate_limit(request)
    album = await albums.get(album_id)
    if not album:
        raise NotFoundError("Gallery album not found")
    for index, media_id in enumerate(payload.media_ids):
        doc = await media.get(media_id)
        if not doc or doc.get("album_id") != album_id:
            continue
        await media.update(media_id, {"display_order": index})
    return {"success": True, "ordered": len(payload.media_ids)}


@albums_router.delete("/{album_id}/media/{media_id}", summary="Detach media from an album")
async def detach_media(
    album_id: str,
    media_id: str,
    request: Request,
    _user: AuthContext = gallery_write,
):
    write_rate_limit(request)
    doc = await media.get(media_id)
    if not doc or doc.get("album_id") != album_id:
        raise NotFoundError("Media is not part of this album")
    # Detach only — the file itself stays in the Media Library / storage.
    await media.coll.update_one({"id": media_id}, {"$set": {"album_id": None, "display_order": 0}})
    total = await media.count({"album_id": album_id})
    await albums.update(album_id, {"media_count": total})
    album = await albums.get(album_id)
    if album and album.get("cover_media_id") == media_id:
        await albums.coll.update_one({"id": album_id}, {"$set": {"cover_media_id": None}})
    return {"success": True, "id": media_id, "media_count": total}


@albums_router.post("/{album_id}/publish", summary="Publish or unpublish an album")
async def publish_album(
    album_id: str,
    request: Request,
    publish: bool = Query(True),
    _user: AuthContext = gallery_write,
):
    write_rate_limit(request)
    album = await albums.get(album_id)
    if not album:
        raise NotFoundError("Gallery album not found")
    if publish:
        await albums.update(
            album_id, {"publish_status": "PUBLISHED", "published_at": utcnow().isoformat()}
        )
    else:
        await albums.coll.update_one(
            {"id": album_id}, {"$set": {"publish_status": "DRAFT", "published_at": None}}
        )
    return await albums.get(album_id)


build_crud_router(
    resource="GalleryAlbum",
    collection=Collections.GALLERY_ALBUMS,
    create_model=GalleryAlbumBase,
    update_model=GalleryAlbumUpdate,
    write_permission="gallery:write",
    public_read=True,
    search_fields=("title", "description"),
    filter_fields=("status", "match_id", "team_id", "publish_status"),
    unique_fields=("slug",),
    tags=["gallery"],
    router=albums_router,
)

router.include_router(public_router, prefix="/public")
router.include_router(albums_router, prefix="/albums")
