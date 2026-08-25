"""Teams module."""
from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import TeamBase, TeamUpdate

router = build_crud_router(
    resource="Team",
    collection=Collections.TEAMS,
    create_model=TeamBase,
    update_model=TeamUpdate,
    write_permission="team:write",
    public_read=True,
    search_fields=("name", "short_name"),
    filter_fields=("club_id", "category", "status"),
    default_sort=(("created_at", 1),),
    tags=["teams"],
)
