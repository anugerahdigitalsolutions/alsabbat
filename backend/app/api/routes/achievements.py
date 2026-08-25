"""Achievements module (added in Phase 2).

Minimal, backward-compatible addition: the public website must not hard-code
trophies, so club achievements are stored and served like every other domain.
"""
from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import AchievementBase, AchievementUpdate

router = build_crud_router(
    resource="Achievement",
    collection=Collections.ACHIEVEMENTS,
    create_model=AchievementBase,
    update_model=AchievementUpdate,
    write_permission="achievement:write",
    public_read=True,
    search_fields=("title", "competition_name", "description"),
    filter_fields=("status", "team_id", "season_id", "level"),
    default_sort=(("year", -1),),
    tags=["achievements"],
)
