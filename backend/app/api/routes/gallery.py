"""Gallery module — Album -> Media items architecture."""
from fastapi import APIRouter, Query

from app.api.crud_factory import Repository, build_crud_router
from app.core.database import Collections
from app.core.errors import NotFoundError
from app.models.domain import GalleryAlbumBase, GalleryAlbumUpdate

router = APIRouter(tags=["gallery"])
albums = Repository(Collections.GALLERY_ALBUMS)
media = Repository(Collections.MEDIA)

albums_router = APIRouter(tags=["gallery"])


@albums_router.get("/{album_id}/media", summary="Media items inside an album")
async def album_media(
    album_id: str,
    limit: int = Query(60, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    album = await albums.get(album_id)
    if not album:
        raise NotFoundError("Gallery album not found")
    items, total = await media.list({"album_id": album_id}, limit=limit, skip=skip)
    return {"album": album, "items": items, "total": total, "limit": limit, "skip": skip}


build_crud_router(
    resource="GalleryAlbum",
    collection=Collections.GALLERY_ALBUMS,
    create_model=GalleryAlbumBase,
    update_model=GalleryAlbumUpdate,
    write_permission="gallery:write",
    public_read=True,
    search_fields=("title", "description"),
    filter_fields=("status", "match_id", "team_id"),
    unique_fields=("slug",),
    tags=["gallery"],
    router=albums_router,
)

router.include_router(albums_router, prefix="/albums")
