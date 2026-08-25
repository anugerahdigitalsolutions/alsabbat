"""Competitions module."""
from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import CompetitionBase, CompetitionUpdate

router = build_crud_router(
    resource="Competition",
    collection=Collections.COMPETITIONS,
    create_model=CompetitionBase,
    update_model=CompetitionUpdate,
    write_permission="competition:write",
    public_read=True,
    search_fields=("name", "organizer"),
    filter_fields=("season_id", "type", "status"),
    tags=["competitions"],
)
