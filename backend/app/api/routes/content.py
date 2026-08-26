"""Content module — CMS foundation (Post / Category / Tag / Author)."""
from fastapi import APIRouter

from app.api.crud_factory import Repository, build_crud_router
from app.core.database import Collections
from app.core.errors import NotFoundError
from app.models.domain import (
    AuthorBase,
    AuthorUpdate,
    CategoryBase,
    CategoryUpdate,
    PostBase,
    PostUpdate,
    TagBase,
    TagUpdate,
)

router = APIRouter()
posts_repo = Repository(Collections.POSTS)

posts_router = APIRouter(tags=["content"])


@posts_router.get("/by-slug/{slug}", summary="Get a post by SEO slug")
async def post_by_slug(slug: str):
    doc = await posts_repo.get_by({"slug": slug})
    if not doc:
        raise NotFoundError("Post not found")
    return doc


build_crud_router(
    resource="Post",
    collection=Collections.POSTS,
    create_model=PostBase,
    update_model=PostUpdate,
    write_permission="content:write",
    public_read=True,
    search_fields=("title", "excerpt"),
    filter_fields=(
        "status",
        "post_type",
        "category_id",
        "author_id",
        "match_id",
        "team_id",
        "player_id",
        "competition_id",
    ),
    unique_fields=("slug",),
    tags=["content"],
    router=posts_router,
)

router.include_router(posts_router, prefix="/posts")
router.include_router(
    build_crud_router(
        resource="Category",
        collection=Collections.CATEGORIES,
        create_model=CategoryBase,
        update_model=CategoryUpdate,
        write_permission="content:write",
        public_read=True,
        search_fields=("name",),
        filter_fields=("status",),
        unique_fields=("slug",),
        default_sort=(("name", 1),),
        tags=["content"],
    ),
    prefix="/categories",
)
router.include_router(
    build_crud_router(
        resource="Tag",
        collection=Collections.TAGS,
        create_model=TagBase,
        update_model=TagUpdate,
        write_permission="content:write",
        public_read=True,
        search_fields=("name",),
        filter_fields=("status",),
        unique_fields=("slug",),
        default_sort=(("name", 1),),
        tags=["content"],
    ),
    prefix="/tags",
)
router.include_router(
    build_crud_router(
        resource="Author",
        collection=Collections.AUTHORS,
        create_model=AuthorBase,
        update_model=AuthorUpdate,
        write_permission="content:write",
        public_read=True,
        search_fields=("name",),
        filter_fields=("status",),
        unique_fields=("slug",),
        default_sort=(("name", 1),),
        tags=["content"],
    ),
    prefix="/authors",
)
