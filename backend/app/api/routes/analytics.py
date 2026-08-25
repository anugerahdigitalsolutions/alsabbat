"""Analytics foundation — event collection + aggregated summary."""
from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder

from app.api.crud_factory import Repository
from app.api.deps import require_permission
from app.core.database import Collections, get_db
from app.core.rate_limit import public_rate_limit
from app.models.auth import AuthContext
from app.models.base import utcnow
from app.models.domain import AnalyticsEventCreate

router = APIRouter(tags=["analytics"])
repo = Repository(Collections.ANALYTICS_EVENTS)


@router.post("/events", status_code=201, summary="Track a page view or event (public)")
async def track_event(payload: AnalyticsEventCreate, request: Request):
    public_rate_limit(request)
    doc = payload.model_dump()
    doc["user_agent"] = request.headers.get("user-agent", "")[:300]
    doc["session_id"] = request.headers.get("x-session-id", "")[:80] or None
    created = await repo.create(jsonable_encoder(doc))
    return {"success": True, "id": created["id"]}


@router.get("/summary", summary="Aggregated analytics summary (admin)")
async def summary(
    days: int = Query(30, ge=1, le=365),
    _user: AuthContext = Depends(require_permission("analytics:read")),
):
    db = get_db()
    since = jsonable_encoder(utcnow() - timedelta(days=days))
    query = {"created_at": {"$gte": since}}
    total = await db[Collections.ANALYTICS_EVENTS].count_documents(query)

    by_type = await db[Collections.ANALYTICS_EVENTS].aggregate(
        [
            {"$match": query},
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20},
        ]
    ).to_list(20)
    top_paths = await db[Collections.ANALYTICS_EVENTS].aggregate(
        [
            {"$match": {**query, "path": {"$ne": None}}},
            {"$group": {"_id": "$path", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
    ).to_list(10)
    return {
        "window_days": days,
        "total_events": total,
        "by_event_type": [{"event_type": r["_id"], "count": r["count"]} for r in by_type],
        "top_paths": [{"path": r["_id"], "count": r["count"]} for r in top_paths],
    }
