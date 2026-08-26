"""Players module."""
from typing import Any, Dict, List, Optional

from fastapi import Query

from app.api.crud_factory import Repository, build_crud_router
from app.core.database import Collections
from app.core.errors import NotFoundError
from app.models.domain import PlayerBase, PlayerUpdate

router = build_crud_router(
    resource="Player",
    collection=Collections.PLAYERS,
    create_model=PlayerBase,
    update_model=PlayerUpdate,
    write_permission="player:write",
    public_read=True,
    search_fields=("full_name", "display_name", "nationality"),
    filter_fields=("team_id", "position", "status"),
    default_sort=(("jersey_number", 1),),
    tags=["players"],
)

players = Repository(Collections.PLAYERS)
lineups = Repository(Collections.MATCH_LINEUPS)
events = Repository(Collections.MATCH_EVENTS)
matches = Repository(Collections.MATCHES)
seasons = Repository(Collections.SEASONS)

GOAL_TYPES = {"GOAL", "PENALTY_SCORED"}


@router.get("/{player_id}/statistics", summary="Player season statistics (derived, never invented)")
async def player_statistics(
    player_id: str, season_id: Optional[str] = Query(default=None)
) -> Dict[str, Any]:
    """Aggregated from MatchLineup + MatchEvent + Match — no manual input, no fake zeros.

    A season only reports goals/assists/cards when match events actually exist for
    that season; otherwise the counters are reported as unavailable (`null`).
    """
    player = await players.get(player_id)
    if not player:
        raise NotFoundError("Player not found")

    lineup_items, _ = await lineups.list({"player_id": player_id}, limit=500)
    if not lineup_items:
        return {"player_id": player_id, "available": False, "seasons": []}

    match_ids = [item["match_id"] for item in lineup_items if item.get("match_id")]
    match_items, _ = await matches.list({"id": {"$in": match_ids}}, limit=500)
    matches_by_id = {m["id"]: m for m in match_items}

    season_ids = sorted({m.get("season_id") for m in match_items if m.get("season_id")})
    season_items, _ = (
        await seasons.list({"id": {"$in": list(season_ids)}}, limit=100) if season_ids else ([], 0)
    )
    seasons_by_id = {s["id"]: s for s in season_items}

    player_events, _ = await events.list(
        {"player_id": player_id, "match_id": {"$in": match_ids}}, limit=1000
    )
    # Any recorded event for these matches proves the event log is being maintained.
    all_events, _ = await events.list({"match_id": {"$in": match_ids}}, limit=1000)
    matches_with_events = {e["match_id"] for e in all_events if e.get("match_id")}

    buckets: Dict[str, Dict[str, Any]] = {}
    for item in lineup_items:
        match = matches_by_id.get(item.get("match_id"))
        if not match:
            continue
        key = match.get("season_id") or "__unassigned__"
        bucket = buckets.setdefault(
            key,
            {
                "season_id": match.get("season_id"),
                "season_name": (seasons_by_id.get(key) or {}).get("name"),
                "appearances": 0,
                "starts": 0,
                "substitute_appearances": 0,
                "goals": 0,
                "assists": 0,
                "yellow_cards": 0,
                "red_cards": 0,
                "events_available": False,
                "match_ids": set(),
            },
        )
        role = item.get("role")
        if role == "STARTING":
            bucket["starts"] += 1
            bucket["appearances"] += 1
        elif role == "SUBSTITUTE":
            bucket["substitute_appearances"] += 1
            bucket["appearances"] += 1
        bucket["match_ids"].add(item.get("match_id"))
        if item.get("match_id") in matches_with_events:
            bucket["events_available"] = True

    for event in player_events:
        match = matches_by_id.get(event.get("match_id"))
        if not match:
            continue
        bucket = buckets.get(match.get("season_id") or "__unassigned__")
        if not bucket:
            continue
        event_type = event.get("type")
        if event_type in GOAL_TYPES:
            bucket["goals"] += 1
        elif event_type == "ASSIST":
            bucket["assists"] += 1
        elif event_type in {"YELLOW_CARD", "SECOND_YELLOW_CARD"}:
            bucket["yellow_cards"] += 1
        elif event_type == "RED_CARD":
            bucket["red_cards"] += 1

    result: List[Dict[str, Any]] = []
    for bucket in buckets.values():
        events_available = bucket.pop("events_available")
        bucket.pop("match_ids", None)
        if not events_available:
            # Honest empty state instead of misleading zeros.
            for field in ("goals", "assists", "yellow_cards", "red_cards"):
                bucket[field] = None
        bucket["events_available"] = events_available
        result.append(bucket)

    result.sort(key=lambda b: (b.get("season_name") or "", b.get("season_id") or ""), reverse=True)
    if season_id:
        result = [b for b in result if b.get("season_id") == season_id]
    return {"player_id": player_id, "available": bool(result), "seasons": result}
