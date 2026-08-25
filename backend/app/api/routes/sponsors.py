"""Sponsors module."""
from app.api.crud_factory import build_crud_router
from app.core.database import Collections
from app.models.domain import SponsorBase, SponsorUpdate

router = build_crud_router(
    resource="Sponsor",
    collection=Collections.SPONSORS,
    create_model=SponsorBase,
    update_model=SponsorUpdate,
    write_permission="sponsor:write",
    public_read=True,
    search_fields=("name", "tier"),
    filter_fields=("status", "tier"),
    default_sort=(("display_order", 1),),
    tags=["sponsors"],
)
