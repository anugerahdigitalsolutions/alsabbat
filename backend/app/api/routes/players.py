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
YELLOW_TYPES = {"YELLOW_CARD", "SECOND_YELLOW_CARD"}


async def _resolve_season(season_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Season yang dipakai: pilihan admin -> season ACTIVE -> season terbaru."""
    if season_id:
        return await seasons.get(season_id)
    items, _ = await seasons.list({"status": "ACTIVE"}, limit=1, sort=(("start_date", -1),))
    if items:
        return items[0]
    items, _ = await seasons.list({}, limit=1, sort=(("start_date", -1),))
    return items[0] if items else None


def _season_brief(season: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not season:
        return None
    return {"id": season.get("id"), "name": season.get("name"), "status": season.get("status")}


@router.get(
    "/stats/leaderboard",
    summary="Papan statistik pemain per musim (dihitung otomatis dari Match Events)",
)
async def player_stats_leaderboard(
    season_id: Optional[str] = Query(default=None),
    limit: int = Query(default=60, ge=1, le=200),
) -> Dict[str, Any]:
    """Gol/assist/kartu dari MatchEvent, penampilan dari MatchLineup, dipisah per Season.

    Tidak ada input manual dan tidak ada angka yang dikarang: bila belum ada match
    event pada musim tersebut, daftar dikembalikan kosong dengan events_available=False.
    """
    season_items, _ = await seasons.list({}, limit=100, sort=(("start_date", -1),))
    season_list = [_season_brief(s) for s in season_items]
    season = await _resolve_season(season_id)

    match_ids: List[str] = []
    lineup_items: List[Dict[str, Any]] = []
    event_items: List[Dict[str, Any]] = []
    if season:
        match_items, _ = await matches.list({"season_id": season["id"]}, limit=500)
        match_ids = [m["id"] for m in match_items if m.get("id")]
    if match_ids:
        lineup_items, _ = await lineups.list({"match_id": {"$in": match_ids}}, limit=2000)
        event_items, _ = await events.list({"match_id": {"$in": match_ids}}, limit=2000)

    buckets: Dict[str, Dict[str, int]] = {}

    def bucket(player_id: str) -> Dict[str, int]:
        return buckets.setdefault(
            player_id,
            {"goals": 0, "assists": 0, "appearances": 0, "yellow_cards": 0, "red_cards": 0},
        )

    for item in lineup_items:
        pid = item.get("player_id")
        if pid and item.get("role") in {"STARTING", "SUBSTITUTE"}:
            bucket(pid)["appearances"] += 1

    for event in event_items:
        if event.get("status") not in (None, "ACTIVE"):
            continue
        event_type = event.get("type")
        pid = event.get("player_id")
        if pid:
            target = bucket(pid)
            if event_type in GOAL_TYPES:
                target["goals"] += 1
            elif event_type == "ASSIST":
                target["assists"] += 1
            elif event_type in YELLOW_TYPES:
                target["yellow_cards"] += 1
            elif event_type == "RED_CARD":
                target["red_cards"] += 1
        related = event.get("related_player_id")
        if related and event_type in GOAL_TYPES:
            bucket(related)["assists"] += 1

    # Baseline historis (nilai awal sebelum sistem ini) ikut dihitung agar pemain
    # dengan sejarah gol/assist tetap muncul walau belum ada Match Events.
    baseline_items, _ = await players.list(
        {"$or": [{"historical_goals": {"$gt": 0}}, {"historical_assists": {"$gt": 0}}]}, limit=500
    )
    player_ids = list(set(buckets.keys()) | {p["id"] for p in baseline_items})
    player_items, _ = (
        await players.list({"id": {"$in": player_ids}}, limit=500) if player_ids else ([], 0)
    )

    items: List[Dict[str, Any]] = []
    for player in player_items:
        stats = buckets.get(player["id"], {})
        historical_goals = int(player.get("historical_goals") or 0)
        historical_assists = int(player.get("historical_assists") or 0)
        items.append(
            {
                "id": player["id"],
                "player_id": player["id"],
                "full_name": player.get("full_name"),
                "display_name": player.get("display_name"),
                "photo": player.get("photo"),
                "jersey_number": player.get("jersey_number"),
                "position": player.get("position"),
                "goals": stats.get("goals", 0) + historical_goals,
                "assists": stats.get("assists", 0) + historical_assists,
                "appearances": stats.get("appearances", 0),
                "yellow_cards": stats.get("yellow_cards", 0),
                "red_cards": stats.get("red_cards", 0),
                "historical_goals": historical_goals,
                "historical_assists": historical_assists,
            }
        )

    items.sort(
        key=lambda i: (-i["goals"], -i["assists"], -i["appearances"], i.get("full_name") or "")
    )
    return {
        "season": _season_brief(season),
        "seasons": season_list,
        "items": items[:limit],
        "events_available": bool(event_items),
        "matches": len(match_ids),
    }


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

    historical = {
        "goals": int(player.get("historical_goals") or 0),
        "assists": int(player.get("historical_assists") or 0),
    }
    # Penampilan historis dibaca dari `match_lineups` (data lama, read-only);
    # gol/assist/kartu dari Match Events yang masih aktif diinput admin.
    lineup_items, _ = await lineups.list({"player_id": player_id}, limit=500)
    player_events, _ = await events.list({"player_id": player_id}, limit=1000)
    # Assist juga tercatat sebagai `related_player_id` pada event gol
    # (konvensi yang sama dipakai papan statistik / Top Scorer).
    assist_events, _ = await events.list({"related_player_id": player_id}, limit=1000)
    if not lineup_items and not player_events and not assist_events:
        return {"player_id": player_id, "available": False, "seasons": [], "historical": historical}

    match_ids = sorted(
        {item["match_id"] for item in lineup_items if item.get("match_id")}
        | {event["match_id"] for event in player_events if event.get("match_id")}
        | {event["match_id"] for event in assist_events if event.get("match_id")}
    )
    match_items, _ = await matches.list({"id": {"$in": match_ids}}, limit=500)
    matches_by_id = {m["id"]: m for m in match_items}

    season_ids = sorted({m.get("season_id") for m in match_items if m.get("season_id")})
    season_items, _ = (
        await seasons.list({"id": {"$in": list(season_ids)}}, limit=100) if season_ids else ([], 0)
    )
    seasons_by_id = {s["id"]: s for s in season_items}

    # Any recorded event for these matches proves the event log is being maintained.
    all_events, _ = await events.list({"match_id": {"$in": match_ids}}, limit=1000)
    matches_with_events = {e["match_id"] for e in all_events if e.get("match_id")}

    buckets: Dict[str, Dict[str, Any]] = {}

    def bucket_for(match: Dict[str, Any]) -> Dict[str, Any]:
        key = match.get("season_id") or "__unassigned__"
        return buckets.setdefault(
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

    for item in lineup_items:
        match = matches_by_id.get(item.get("match_id"))
        if not match:
            continue
        bucket = bucket_for(match)
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
        bucket = bucket_for(match)
        bucket["events_available"] = True
        bucket["match_ids"].add(event.get("match_id"))
        event_type = event.get("type")
        if event_type in GOAL_TYPES:
            bucket["goals"] += 1
        elif event_type == "ASSIST":
            bucket["assists"] += 1
        elif event_type in {"YELLOW_CARD", "SECOND_YELLOW_CARD"}:
            bucket["yellow_cards"] += 1
        elif event_type == "RED_CARD":
            bucket["red_cards"] += 1

    for event in assist_events:
        match = matches_by_id.get(event.get("match_id"))
        if not match or event.get("type") not in GOAL_TYPES:
            continue
        bucket = bucket_for(match)
        bucket["events_available"] = True
        bucket["match_ids"].add(event.get("match_id"))
        bucket["assists"] += 1

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
    return {
        "player_id": player_id,
        "available": bool(result),
        "seasons": result,
        "historical": historical,
    }
