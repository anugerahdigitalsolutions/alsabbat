"""Seasons module."""
from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import SeasonBase, SeasonUpdate

router = build_crud_router(
    resource="Season",
    collection=Collections.SEASONS,
    create_model=SeasonBase,
    update_model=SeasonUpdate,
    write_permission="season:write",
    public_read=True,
    search_fields=("name",),
    filter_fields=("club_id", "status"),
    default_sort=(("start_date", -1),),
    tags=["seasons"],
)
