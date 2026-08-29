"""Sponsors module."""
from fastapi import APIRouter

from app.api.crud_factory import Repository, build_crud_router
from app.core.database import Collections
from app.core.errors import NotFoundError
from app.models.domain import SponsorBase, SponsorUpdate

sponsors = Repository(Collections.SPONSORS)

router = build_crud_router(
    resource="Sponsor",
    collection=Collections.SPONSORS,
    create_model=SponsorBase,
    update_model=SponsorUpdate,
    write_permission="sponsor:write",
    public_read=True,
    search_fields=("name", "tier"),
    filter_fields=("status", "tier", "is_featured"),
    unique_fields=("slug",),
    default_sort=(("display_order", 1),),
    tags=["sponsors"],
)

lookup_router = APIRouter(tags=["sponsors"])


@lookup_router.get("/by-slug/{value}", summary="Profil sponsor via slug (fallback ke id lama)")
async def sponsor_by_slug(value: str):
    """Backward compatible: `value` boleh slug baru ATAU id sponsor lama."""
    doc = await sponsors.get_by({"slug": value})
    if not doc:
        doc = await sponsors.get(value)
    if not doc:
        raise NotFoundError("Sponsor not found")
    return doc


router.include_router(lookup_router)
