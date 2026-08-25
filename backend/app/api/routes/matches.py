"""Matches module — primary football domain.

Phase 1 delivered the data architecture and relationship endpoints.
Phase 3 (Match Center V1) adds lineups + events aggregation on top of the
same relationship model — Gallery / Video / News / Social remain separate
referenced resources (no media arrays embedded in Match).
"""
from typing import Any, Dict, List

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
lineups = Repository(Collections.MATCH_LINEUPS)
events = Repository(Collections.MATCH_EVENTS)
players = Repository(Collections.PLAYERS)
teams = Repository(Collections.TEAMS)
competitions = Repository(Collections.COMPETITIONS)
seasons = Repository(Collections.SEASONS)


def _player_summary(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Minimal player projection — avoids duplicating Player data."""
    return {
        "id": doc.get("id"),
        "full_name": doc.get("full_name"),
        "display_name": doc.get("display_name"),
        "jersey_number": doc.get("jersey_number"),
        "position": doc.get("position"),
        "photo": doc.get("photo"),
        "team_id": doc.get("team_id"),
    }


async def _players_map(ids: List[str]) -> Dict[str, Dict[str, Any]]:
    unique = [pid for pid in {i for i in ids if i}]
    if not unique:
        return {}
    docs, _ = await players.list({"id": {"$in": unique}}, limit=200)
    return {doc["id"]: _player_summary(doc) for doc in docs}


@router.get("/{match_id}/relations", summary="Match Center payload (relations + lineups + events)")
async def match_relations(match_id: str):
    match = await matches.get(match_id)
    if not match:
        raise NotFoundError("Match not found")

    news, _ = await posts.list({"match_id": match_id}, limit=50)
    gallery, _ = await albums.list({"match_id": match_id}, limit=50)
    images, _ = await media.list({"match_id": match_id, "file_type": "IMAGE"}, limit=100)
    videos, _ = await media.list({"match_id": match_id, "file_type": "VIDEO"}, limit=100)

    lineup_items, _ = await lineups.list(
        {"match_id": match_id},
        limit=200,
        sort=(("display_order", 1), ("created_at", 1)),
    )
    event_items, _ = await events.list(
        {"match_id": match_id},
        limit=200,
        sort=(("minute", 1), ("display_order", 1), ("created_at", 1)),
    )

    player_ids: List[str] = []
    for item in lineup_items:
        player_ids.append(item.get("player_id"))
    for item in event_items:
        player_ids.append(item.get("player_id"))
        player_ids.append(item.get("related_player_id"))
    players_by_id = await _players_map(player_ids)

    team = await teams.get(match.get("team_id")) if match.get("team_id") else None
    competition = (
        await competitions.get(match["competition_id"]) if match.get("competition_id") else None
    )
    season = await seasons.get(match["season_id"]) if match.get("season_id") else None

    return {
        "match": match,
        "team": team,
        "competition": competition,
        "season": season,
        # Match Center V1
        "lineups": lineup_items,
        "events": event_items,
        "players": players_by_id,
        # Integration points (referenced resources, never embedded arrays)
        "news": news,
        "gallery_albums": gallery,
        "images": images,
        "videos": videos,
        "social_content": [],
        "integration_points": {
            "gallery": "reference:gallery_albums.match_id",
            "media": "reference:media.match_id",
            "news": "reference:posts.match_id",
            "social_content": "reserved:social publishing phase",
        },
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
