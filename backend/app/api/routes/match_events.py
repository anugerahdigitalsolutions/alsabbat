"""Match events module (Match Center V1) — match timeline.

One document per event (goal, assist, card, substitution, ...).
Relationship keys: match_id (+ optional team_id / player_id / related_player_id).
"""
from fastapi import APIRouter

from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import MatchEventBase, MatchEventUpdate

router = APIRouter(tags=["match-events"])

build_crud_router(
    resource="Match event",
    collection=Collections.MATCH_EVENTS,
    create_model=MatchEventBase,
    update_model=MatchEventUpdate,
    write_permission="event:write",
    public_read=True,
    search_fields=("description", "player_name"),
    filter_fields=("match_id", "team_id", "player_id", "type", "side", "status"),
    default_sort=(("minute", 1), ("display_order", 1), ("created_at", 1)),
    tags=["match-events"],
    router=router,
)
