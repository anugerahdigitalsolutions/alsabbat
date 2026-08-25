"""Players module."""
from app.api.crud_factory import build_crud_router
from app.core.database import Collections
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
