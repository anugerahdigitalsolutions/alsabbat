"""Matches module — primary football domain.

Phase 1 delivered the data architecture and relationship endpoints.
Phase 3 (Match Center V1) adds match events aggregation on top of the
same relationship model — Gallery / Video / News / Social remain separate
referenced resources (no media arrays embedded in Match).
"""
from typing import Any, Dict, List

import re

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


def _club_scores(match: Dict[str, Any]) -> tuple[int, int] | None:
    """(club goals, opponent goals) using the existing home/away convention."""
    home, away = match.get("home_score"), match.get("away_score")
    if home is None or away is None:
        return None
    is_home = match.get("venue_type") != "AWAY"
    return (int(home), int(away)) if is_home else (int(away), int(home))


async def _head_to_head(match: Dict[str, Any]) -> Dict[str, Any]:
    """Derived from existing Match data only — no separate H2H collection."""
    opponent = ((match.get("opponent") or {}).get("name") or "").strip()
    empty = {
        "opponent": opponent or None,
        "available": False,
        "matches_played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_scored": 0,
        "goals_conceded": 0,
        "recent": [],
    }
    if not opponent:
        return empty
    history, _ = await matches.list(
        {
            "status": "FINISHED",
            "opponent.name": {"$regex": f"^{re.escape(opponent)}$", "$options": "i"},
        },
        limit=100,
        sort=(("date", -1),),
    )
    played = [m for m in history if _club_scores(m) is not None]
    if not played:
        return empty

    wins = draws = losses = scored = conceded = 0
    recent: List[Dict[str, Any]] = []
    for item in played:
        club_goals, opponent_goals = _club_scores(item)
        scored += club_goals
        conceded += opponent_goals
        if club_goals > opponent_goals:
            wins += 1
            outcome = "WIN"
        elif club_goals == opponent_goals:
            draws += 1
            outcome = "DRAW"
        else:
            losses += 1
            outcome = "LOSS"
        if len(recent) < 5:
            recent.append(
                {
                    "id": item.get("id"),
                    "date": item.get("date"),
                    "venue_type": item.get("venue_type"),
                    "club_goals": club_goals,
                    "opponent_goals": opponent_goals,
                    "outcome": outcome,
                    "is_current": item.get("id") == match.get("id"),
                }
            )
    return {
        "opponent": opponent,
        "available": True,
        "matches_played": len(played),
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "goals_scored": scored,
        "goals_conceded": conceded,
        "recent": recent,
    }


@router.get("/{match_id}/head-to-head", summary="Head-to-head record vs the same opponent")
async def head_to_head(match_id: str):
    match = await matches.get(match_id)
    if not match:
        raise NotFoundError("Match not found")
    return await _head_to_head(match)


@router.get("/{match_id}/relations", summary="Match Center payload (relations + events)")
async def match_relations(match_id: str):
    match = await matches.get(match_id)
    if not match:
        raise NotFoundError("Match not found")

    news, _ = await posts.list({"match_id": match_id}, limit=50)
    match_report = next(
        (
            p
            for p in news
            if p.get("post_type") == "MATCH_REPORT" and p.get("status") == "PUBLISHED"
        ),
        None,
    )
    gallery, _ = await albums.list({"match_id": match_id}, limit=50)
    images, _ = await media.list({"match_id": match_id, "file_type": "IMAGE"}, limit=100)
    videos, _ = await media.list({"match_id": match_id, "file_type": "VIDEO"}, limit=100)

    # Phase 4 — Match Gallery: media that belongs to PUBLISHED albums of this match.
    published_albums = [a for a in gallery if a.get("publish_status") == "PUBLISHED"]
    match_media: List[Dict[str, Any]] = []
    for album in published_albums:
        items, _ = await media.list(
            {"album_id": album["id"], "status": "ACTIVE"},
            limit=60,
            sort=(("display_order", 1), ("created_at", 1)),
        )
        for item in items:
            match_media.append({**item, "album_id": album["id"], "album_title": album.get("title")})

    event_items, _ = await events.list(
        {"match_id": match_id},
        limit=200,
        sort=(("minute", 1), ("display_order", 1), ("created_at", 1)),
    )

    player_ids: List[str] = []
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
        "events": event_items,
        "players": players_by_id,
        # Integration points (referenced resources, never embedded arrays)
        "news": news,
        "match_report": match_report,
        "head_to_head": await _head_to_head(match),
        "gallery_albums": gallery,
        "published_gallery_albums": published_albums,
        "match_media": match_media,
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
