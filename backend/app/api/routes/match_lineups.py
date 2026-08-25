"""Match lineups module (Match Center V1).

Data model: ONE document per player per match.
Relationship keys: match_id + team_id + player_id (no Player duplication).
The frontend groups documents into Starting XI / Substitutes using `role`.
"""
from fastapi import APIRouter

from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import MatchLineupBase, MatchLineupUpdate

router = APIRouter(tags=["match-lineups"])

build_crud_router(
    resource="Match lineup",
    collection=Collections.MATCH_LINEUPS,
    create_model=MatchLineupBase,
    update_model=MatchLineupUpdate,
    write_permission="lineup:write",
    public_read=True,
    search_fields=("position_label", "note"),
    filter_fields=("match_id", "team_id", "player_id", "role", "status"),
    default_sort=(("display_order", 1), ("created_at", 1)),
    tags=["match-lineups"],
    router=router,
)
