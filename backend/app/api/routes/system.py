"""System module — health check, status, platform metadata."""
from __future__ import annotations

import platform
import time

from fastapi import APIRouter, Depends

from app.api.crud_factory import Repository
from app.api.deps import require_permission
from app.core.config import settings
from app.core.database import Collections, ping
from app.core.rbac import ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS
from app.models.auth import AuthContext
from app.models.enums import (
    AnalyticsEventType,
    CompetitionType,
    EntityStatus,
    GalleryStatus,
    MatchEventSide,
    MatchEventType,
    MatchStatus,
    MatchVenueType,
    MediaType,
    PlayerPosition,
    PlayerStatus,
    PostStatus,
    PostType,
    SeasonStatus,
    StaffRole,
    StorageProvider,
    TeamCategory,
)
from app.services.media_service import media_service
from app.models.staff_structure import meta_departments

router = APIRouter(tags=["system"])
STARTED_AT = time.time()


@router.get("/health", summary="Health check (used by Railway / uptime monitors)")
async def health():
    db_ok = await ping()
    return {
        "status": "ok" if db_ok else "degraded",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "unavailable",
        "uptime_seconds": round(time.time() - STARTED_AT, 2),
    }


@router.get("/meta", summary="Public platform metadata (enums used by the UI)")
async def meta():
    def opts(enum_cls):
        return [e.value for e in enum_cls]

    return {
        "entity_status": opts(EntityStatus),
        "team_categories": opts(TeamCategory),
        "player_positions": opts(PlayerPosition),
        "player_status": opts(PlayerStatus),
        "staff_roles": opts(StaffRole),
        # Master Bagian & Jabatan Staff (dependent dropdown di UI).
        "staff_departments": meta_departments(),
        "season_status": opts(SeasonStatus),
        "competition_types": opts(CompetitionType),
        "match_status": opts(MatchStatus),
        "match_venue_types": opts(MatchVenueType),
        "match_event_types": opts(MatchEventType),
        "match_event_sides": opts(MatchEventSide),
        "post_status": opts(PostStatus),
        "post_types": opts(PostType),
        "media_types": opts(MediaType),
        "gallery_status": opts(GalleryStatus),
        "storage_providers": opts(StorageProvider),
        "analytics_event_types": opts(AnalyticsEventType),
        "roles": [
            {
                "value": role,
                "label": ROLE_LABELS.get(role, role),
                "description": ROLE_DESCRIPTIONS.get(role, ""),
                "permissions": perms,
            }
            for role, perms in ROLE_PERMISSIONS.items()
        ],
    }


@router.get("/status", summary="System status & data counts (admin)")
async def status(_user: AuthContext = Depends(require_permission("system:read"))):
    db_ok = await ping()
    counts = {}
    for label, coll in (
        ("clubs", Collections.CLUBS),
        ("teams", Collections.TEAMS),
        ("players", Collections.PLAYERS),
        ("staff", Collections.STAFF),
        ("seasons", Collections.SEASONS),
        ("competitions", Collections.COMPETITIONS),
        ("matches", Collections.MATCHES),
        ("match_events", Collections.MATCH_EVENTS),
        ("posts", Collections.POSTS),
        ("categories", Collections.CATEGORIES),
        ("tags", Collections.TAGS),
        ("authors", Collections.AUTHORS),
        ("gallery_albums", Collections.GALLERY_ALBUMS),
        ("media", Collections.MEDIA),
        ("sponsors", Collections.SPONSORS),
        ("achievements", Collections.ACHIEVEMENTS),
        ("users", Collections.USERS),
        ("analytics_events", Collections.ANALYTICS_EVENTS),
    ):
        counts[label] = await Repository(coll).count()
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "python": platform.python_version(),
        "uptime_seconds": round(time.time() - STARTED_AT, 2),
        "database": {
            "connected": db_ok,
            "name": settings.DB_NAME,
            "driver": "motor/pymongo",
            "atlas_ready": True,
        },
        "media_storage": media_service.status(),
        "integrations": {
            "instagram": bool(settings.INSTAGRAM_APP_ID),
            "tiktok": bool(settings.TIKTOK_CLIENT_KEY),
            "youtube": bool(settings.YOUTUBE_CLIENT_ID or settings.YOUTUBE_API_KEY),
            "note": "Social & YouTube integrations are architecture-ready but disabled in Phase 1.",
        },
        "security": {
            "rate_limiting": settings.RATE_LIMIT_ENABLED,
            "jwt_algorithm": settings.JWT_ALGORITHM,
            "cors_origins": settings.CORS_ORIGINS,
        },
        "counts": counts,
    }
