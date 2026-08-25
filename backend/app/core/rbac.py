"""Role & permission architecture (enforced server-side)."""
from __future__ import annotations

from enum import Enum
from typing import Dict, List


class Role(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    CONTENT_ADMIN = "CONTENT_ADMIN"
    GALLERY_ADMIN = "GALLERY_ADMIN"
    SOCIAL_MEDIA_ADMIN = "SOCIAL_MEDIA_ADMIN"
    STORE_ADMIN = "STORE_ADMIN"
    ORDER_ADMIN = "ORDER_ADMIN"


WILDCARD = "*"

# Resource:action permission strings
P = {
    "club_read": "club:read",
    "club_write": "club:write",
    "team_write": "team:write",
    "player_write": "player:write",
    "staff_write": "staff:write",
    "season_write": "season:write",
    "competition_write": "competition:write",
    "match_write": "match:write",
    # Match Center (Phase 3)
    "lineup_write": "lineup:write",
    "event_write": "event:write",
    "content_read": "content:read",
    "content_write": "content:write",
    "content_publish": "content:publish",
    "gallery_read": "gallery:read",
    "gallery_write": "gallery:write",
    "media_read": "media:read",
    "media_write": "media:write",
    "sponsor_write": "sponsor:write",
    "achievement_write": "achievement:write",
    "user_read": "user:read",
    "user_write": "user:write",
    "analytics_read": "analytics:read",
    "system_read": "system:read",
    # Reserved for later phases (architecture ready, features not built)
    "social_publish": "social:publish",
    "store_manage": "store:manage",
    "order_manage": "order:manage",
}

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    Role.SUPER_ADMIN.value: [WILDCARD],
    Role.CONTENT_ADMIN.value: [
        P["club_read"],
        P["content_read"],
        P["content_write"],
        P["content_publish"],
        P["media_read"],
        P["media_write"],
        P["gallery_read"],
        P["analytics_read"],
    ],
    Role.GALLERY_ADMIN.value: [
        P["club_read"],
        P["gallery_read"],
        P["gallery_write"],
        P["media_read"],
        P["media_write"],
        P["content_read"],
    ],
    Role.SOCIAL_MEDIA_ADMIN.value: [
        P["club_read"],
        P["content_read"],
        P["media_read"],
        P["gallery_read"],
        P["social_publish"],
        P["analytics_read"],
    ],
    Role.STORE_ADMIN.value: [P["club_read"], P["media_read"], P["store_manage"]],
    Role.ORDER_ADMIN.value: [P["club_read"], P["order_manage"]],
}

ROLE_LABELS: Dict[str, str] = {
    Role.SUPER_ADMIN.value: "Super Admin",
    Role.CONTENT_ADMIN.value: "Content Admin",
    Role.GALLERY_ADMIN.value: "Gallery Admin",
    Role.SOCIAL_MEDIA_ADMIN.value: "Social Media Admin",
    Role.STORE_ADMIN.value: "Store Admin",
    Role.ORDER_ADMIN.value: "Order Admin",
}

ROLE_DESCRIPTIONS: Dict[str, str] = {
    Role.SUPER_ADMIN.value: "Full access to every module of the platform.",
    Role.CONTENT_ADMIN.value: "Manages news, posts, categories, tags and authors.",
    Role.GALLERY_ADMIN.value: "Manages gallery albums and media library.",
    Role.SOCIAL_MEDIA_ADMIN.value: "Reserved for social publishing phase.",
    Role.STORE_ADMIN.value: "Reserved for merchandise phase.",
    Role.ORDER_ADMIN.value: "Reserved for commerce/order phase.",
}


def permissions_for_role(role: str) -> List[str]:
    return list(ROLE_PERMISSIONS.get(role, []))


def has_permission(user_permissions: List[str], required: str) -> bool:
    if WILDCARD in user_permissions:
        return True
    if required in user_permissions:
        return True
    resource = required.split(":", 1)[0]
    return f"{resource}:{WILDCARD}" in user_permissions
