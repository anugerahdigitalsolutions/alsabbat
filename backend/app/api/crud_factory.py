"""Generic, reusable Mongo repository + CRUD router factory.

Keeps every domain module thin, consistent and maintainable.
"""
from typing import Any, Dict, List, Optional, Sequence, Type

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.errors import ConflictError, NotFoundError
from app.core.rate_limit import write_rate_limit
from app.models.base import new_id, utcnow


def serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc = dict(doc)
    doc.pop("_id", None)
    return jsonable_encoder(doc)


class Repository:
    """Thin async Mongo repository operating on plain dicts."""

    def __init__(self, collection: str):
        self.collection = collection

    @property
    def coll(self):
        return get_db()[self.collection]

    async def list(
        self,
        query: Dict[str, Any],
        limit: int = 50,
        skip: int = 0,
        sort: Optional[Sequence[tuple]] = None,
    ):
        cursor = self.coll.find(query)
        cursor = cursor.sort(list(sort or [("created_at", -1)]))
        cursor = cursor.skip(max(skip, 0)).limit(min(max(limit, 1), 200))
        items = [serialize(doc) async for doc in cursor]
        total = await self.coll.count_documents(query)
        return items, total

    async def get(self, doc_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.coll.find_one({"id": doc_id})
        return serialize(doc) if doc else None

    async def get_by(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc = await self.coll.find_one(query)
        return serialize(doc) if doc else None

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        payload = jsonable_encoder(data)
        payload.setdefault("id", new_id())
        now = jsonable_encoder(utcnow())
        payload.setdefault("created_at", now)
        payload["updated_at"] = now
        await self.coll.insert_one(dict(payload))
        return serialize(payload)

    async def update(self, doc_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        payload = {k: v for k, v in jsonable_encoder(data).items() if v is not None}
        payload["updated_at"] = jsonable_encoder(utcnow())
        result = await self.coll.update_one({"id": doc_id}, {"$set": payload})
        if result.matched_count == 0:
            return None
        return await self.get(doc_id)

    async def delete(self, doc_id: str) -> bool:
        result = await self.coll.delete_one({"id": doc_id})
        return result.deleted_count > 0

    async def count(self, query: Optional[Dict[str, Any]] = None) -> int:
        return await self.coll.count_documents(query or {})


def build_crud_router(
    *,
    resource: str,
    collection: str,
    create_model: Type[BaseModel],
    update_model: Type[BaseModel],
    write_permission: str,
    read_permission: Optional[str] = None,
    public_read: bool = True,
    search_fields: Sequence[str] = (),
    filter_fields: Sequence[str] = (),
    unique_fields: Sequence[str] = (),
    default_sort: Sequence[tuple] = (("created_at", -1),),
    tags: Optional[List[str]] = None,
    extra_defaults: Optional[Dict[str, Any]] = None,
    router: Optional[APIRouter] = None,
) -> APIRouter:
    router = router if router is not None else APIRouter(tags=tags or [resource])
    repo = Repository(collection)
    create_schema = create_model
    update_schema = update_model

    read_deps = (
        []
        if public_read
        else [Depends(require_permission(read_permission or write_permission))]
    )
    write_dep = Depends(require_permission(write_permission))

    async def list_items(
        request: Request,
        q: Optional[str] = Query(None, max_length=120),
        limit: int = Query(50, ge=1, le=200),
        skip: int = Query(0, ge=0),
        sort_by: Optional[str] = Query(None, max_length=60),
        sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    ):
        query: Dict[str, Any] = {}
        for field in filter_fields:
            value = request.query_params.get(field)
            if value:
                query[field] = value
        if q and search_fields:
            query["$or"] = [{field: {"$regex": q, "$options": "i"}} for field in search_fields]
        sort = ((sort_by, -1 if sort_dir == "desc" else 1),) if sort_by else default_sort
        items, total = await repo.list(query, limit=limit, skip=skip, sort=sort)
        return {"items": items, "total": total, "limit": limit, "skip": skip}

    async def get_item(item_id: str):
        doc = await repo.get(item_id)
        if not doc:
            raise NotFoundError(f"{resource} not found")
        return doc

    async def create_item(payload, request: Request, _user=write_dep):
        write_rate_limit(request)
        data = payload.model_dump()
        if extra_defaults:
            for key, value in extra_defaults.items():
                data.setdefault(key, value)
        for field in unique_fields:
            value = data.get(field)
            if value and await repo.get_by({field: value}):
                raise ConflictError(f"{resource} with {field} '{value}' already exists")
        return await repo.create(data)

    async def update_item(item_id: str, payload, request: Request, _user=write_dep):
        write_rate_limit(request)
        data = payload.model_dump(exclude_unset=True)
        for field in unique_fields:
            value = data.get(field)
            if value:
                existing = await repo.get_by({field: value})
                if existing and existing.get("id") != item_id:
                    raise ConflictError(f"{resource} with {field} '{value}' already exists")
        updated = await repo.update(item_id, data)
        if not updated:
            raise NotFoundError(f"{resource} not found")
        return updated

    async def delete_item(item_id: str, request: Request, _user=write_dep):
        write_rate_limit(request)
        if not await repo.delete(item_id):
            raise NotFoundError(f"{resource} not found")
        return {"success": True, "id": item_id}

    # Inject the concrete pydantic schemas as real annotations so FastAPI can
    # build request validation for dynamically generated models.
    create_item.__annotations__["payload"] = create_schema
    update_item.__annotations__["payload"] = update_schema

    router.add_api_route(
        "", list_items, methods=["GET"], dependencies=read_deps, summary=f"List {resource}"
    )
    router.add_api_route(
        "/{item_id}", get_item, methods=["GET"], dependencies=read_deps, summary=f"Get {resource}"
    )
    router.add_api_route(
        "", create_item, methods=["POST"], status_code=201, summary=f"Create {resource}"
    )
    router.add_api_route(
        "/{item_id}", update_item, methods=["PATCH"], summary=f"Update {resource}"
    )
    router.add_api_route(
        "/{item_id}", delete_item, methods=["DELETE"], summary=f"Delete {resource}"
    )
    return router
