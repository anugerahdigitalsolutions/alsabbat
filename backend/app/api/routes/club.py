"""Club module — root domain and centralized club configuration."""
from fastapi import APIRouter

from app.api.crud_factory import Repository, build_crud_router
from app.core.database import Collections
from app.models.domain import ClubBase, ClubUpdate

router = APIRouter(tags=["club"])
repo = Repository(Collections.CLUBS)


@router.get("/active", summary="Active club configuration (public, centralized)")
async def active_club():
    doc = await repo.get_by({"status": "ACTIVE"})
    if not doc:
        docs, _ = await repo.list({}, limit=1)
        doc = docs[0] if docs else None
    return {"club": doc}


build_crud_router(
    resource="Club",
    collection=Collections.CLUBS,
    create_model=ClubBase,
    update_model=ClubUpdate,
    write_permission="club:write",
    public_read=True,
    search_fields=("name", "short_name"),
    filter_fields=("status",),
    tags=["club"],
    router=router,
)
