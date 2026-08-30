"""Staff module."""
from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import StaffBase, StaffUpdate

router = build_crud_router(
    resource="Staff",
    collection=Collections.STAFF,
    create_model=StaffBase,
    update_model=StaffUpdate,
    write_permission="staff:write",
    public_read=True,
    search_fields=("name", "role_label", "position_title", "department"),
    filter_fields=("team_id", "role", "status", "department", "player_id", "customer_id"),
    default_sort=(("created_at", 1),),
    tags=["staff"],
)
