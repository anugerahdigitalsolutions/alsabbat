"""Matches module — primary football domain.

Phase 1 provides the data architecture and relationship endpoints only.
The full Match Center (lineup, live, timeline) belongs to a later phase.
"""
from fastapi import APIRouter

from app.api.crud_factory import Repository, build_crud_router
from app.core.database import Collections
from app.core.errors import NotFoundError
from app.models.domain import MatchBase, MatchUpdate

router = APIRouter(tags=["matches"])
matches = Repository(Collections.MATCHES)
posts = Repository(Collections.POSTS)
media = Repository(Collections.MEDIA)
albums = Repository(Collections.GALLERY_ALBUMS)


@router.get("/{match_id}/relations", summary="Related content prepared for a match")
async def match_relations(match_id: str):
    match = await matches.get(match_id)
    if not match:
        raise NotFoundError("Match not found")
    news, _ = await posts.list({"match_id": match_id}, limit=50)
    gallery, _ = await albums.list({"match_id": match_id}, limit=50)
    images, _ = await media.list({"match_id": match_id, "file_type": "IMAGE"}, limit=100)
    videos, _ = await media.list({"match_id": match_id, "file_type": "VIDEO"}, limit=100)
    return {
        "match": match,
        "news": news,
        "gallery_albums": gallery,
        "images": images,
        "videos": videos,
        "lineup": None,
        "social_content": [],
        "note": "Lineup / live timeline / social content are reserved for a later phase.",
    }


build_crud_router(
    resource="Match",
    collection=Collections.MATCHES,
    create_model=MatchBase,
    update_model=MatchUpdate,
    write_permission="match:write",
    public_read=True,
    search_fields=("opponent.name", "venue"),
    filter_fields=("team_id", "season_id", "competition_id", "status", "venue_type"),
    default_sort=(("date", -1),),
    tags=["matches"],
    router=router,
)
