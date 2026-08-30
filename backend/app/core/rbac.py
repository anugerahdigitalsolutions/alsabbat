"""Role & permission architecture (enforced server-side)."""
from __future__ import annotations

from enum import Enum
from typing import Dict, List


class Role(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    # Role fungsional (dipakai saat membuat/mengubah akun admin)
    CLUB_ADMIN = "CLUB_ADMIN"
    PLAYER_STAFF_ADMIN = "PLAYER_STAFF_ADMIN"
    MATCH_ADMIN = "MATCH_ADMIN"
    MEDIA_CONTENT_ADMIN = "MEDIA_CONTENT_ADMIN"
    STORE_MANAGER = "STORE_MANAGER"
    FINANCE_ADMIN = "FINANCE_ADMIN"
    IT_ADMIN = "IT_ADMIN"
    # Role lama — dipertahankan agar akun existing tetap berfungsi (disembunyikan dari dropdown)
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
    # Social publishing (Phase 8)
    "social_read": "social:read",
    "social_publish": "social:publish",
    "merchandise_read": "merchandise:read",
    "merchandise_write": "merchandise:write",
    "order_read": "order:read",
    "order_write": "order:write",
    "store_manage": "store:manage",
    "order_manage": "order:manage",
    # Baraya ALSABBAT (customer) & pengajuan Pemain/Staff — dipisah dari user:* (akun admin)
    "member_read": "member:read",
    "member_write": "member:write",
}

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    Role.SUPER_ADMIN.value: [WILDCARD],
    # ---------------------------------------------------- role fungsional baru
    Role.CLUB_ADMIN.value: [
        P["club_read"],
        P["club_write"],
        P["team_write"],
        P["achievement_write"],
        P["media_read"],
        P["analytics_read"],
    ],
    Role.PLAYER_STAFF_ADMIN.value: [
        P["club_read"],
        P["player_write"],
        P["staff_write"],
        P["media_read"],
        P["media_write"],
        P["member_read"],
        P["member_write"],
    ],
    Role.MATCH_ADMIN.value: [
        P["club_read"],
        P["season_write"],
        P["competition_write"],
        P["match_write"],
        P["event_write"],
        P["media_read"],
        P["media_write"],
    ],
    Role.MEDIA_CONTENT_ADMIN.value: [
        P["club_read"],
        # dibutuhkan halaman "Aplikasi Mobile" (tautan App Store/Play Store disimpan pada profil klub)
        P["club_write"],
        P["content_read"],
        P["content_write"],
        P["content_publish"],
        P["gallery_read"],
        P["gallery_write"],
        P["media_read"],
        P["media_write"],
        P["sponsor_write"],
        P["social_read"],
    ],
    Role.STORE_MANAGER.value: [
        P["club_read"],
        P["media_read"],
        P["media_write"],
        P["merchandise_read"],
        P["merchandise_write"],
        P["store_manage"],
        P["order_read"],
    ],
    Role.FINANCE_ADMIN.value: [
        P["club_read"],
        P["merchandise_read"],
        P["order_read"],
        P["order_write"],
        P["order_manage"],
    ],
    Role.IT_ADMIN.value: [
        P["club_read"],
        P["system_read"],
        P["analytics_read"],
        P["media_read"],
    ],
    # ---------------------------------------------------- role lama (backward compatible)
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
        P["social_read"],
        P["social_publish"],
        P["analytics_read"],
    ],
    Role.STORE_ADMIN.value: [
        P["club_read"],
        P["media_read"],
        P["media_write"],
        P["merchandise_read"],
        P["merchandise_write"],
        P["order_read"],
        P["store_manage"],
    ],
    Role.ORDER_ADMIN.value: [
        P["club_read"],
        P["merchandise_read"],
        P["order_read"],
        P["order_write"],
        P["order_manage"],
    ],
}

ROLE_LABELS: Dict[str, str] = {
    Role.SUPER_ADMIN.value: "Super Admin",
    Role.CLUB_ADMIN.value: "Admin Klub",
    Role.PLAYER_STAFF_ADMIN.value: "Admin Pemain & Staff",
    Role.MATCH_ADMIN.value: "Admin Pertandingan",
    Role.MEDIA_CONTENT_ADMIN.value: "Admin Media & Konten",
    Role.STORE_MANAGER.value: "Admin Store",
    Role.FINANCE_ADMIN.value: "Admin Keuangan",
    Role.IT_ADMIN.value: "Admin IT / Developer",
    Role.CONTENT_ADMIN.value: "Content Admin",
    Role.GALLERY_ADMIN.value: "Gallery Admin",
    Role.SOCIAL_MEDIA_ADMIN.value: "Social Media Admin",
    Role.STORE_ADMIN.value: "Store Admin",
    Role.ORDER_ADMIN.value: "Order Admin",
}

ROLE_DESCRIPTIONS: Dict[str, str] = {
    Role.SUPER_ADMIN.value: "Full access to every module of the platform.",
    Role.CLUB_ADMIN.value: "Informasi klub, tim, dan prestasi klub.",
    Role.PLAYER_STAFF_ADMIN.value: "Pemain, staff, bagian/jabatan, dan pengajuan Baraya.",
    Role.MATCH_ADMIN.value: "Musim, kompetisi, pertandingan, hasil, dan match events.",
    Role.MEDIA_CONTENT_ADMIN.value: "Banner, berita, galeri, media, konten homepage, dan Aplikasi Mobile.",
    Role.STORE_MANAGER.value: "Produk, kategori, varian, dan katalog merchandise.",
    Role.FINANCE_ADMIN.value: "Pesanan/transaksi merchandise (tanpa akses teknis).",
    Role.IT_ADMIN.value: "System status, analytics, dan fungsi teknis (tanpa akses keuangan).",
    Role.CONTENT_ADMIN.value: "Manages news, posts, categories, tags and authors.",
    Role.GALLERY_ADMIN.value: "Manages gallery albums and media library.",
    Role.SOCIAL_MEDIA_ADMIN.value: "Reserved for social publishing phase.",
    Role.STORE_ADMIN.value: "Reserved for merchandise phase.",
    Role.ORDER_ADMIN.value: "Reserved for commerce/order phase.",
}

# Role yang boleh dipilih saat membuat/mengubah akun admin. Role lama tetap valid
# di backend (akun existing tidak berubah) tetapi disembunyikan dari dropdown.
SELECTABLE_ROLES: List[str] = [
    Role.SUPER_ADMIN.value,
    Role.CLUB_ADMIN.value,
    Role.PLAYER_STAFF_ADMIN.value,
    Role.MATCH_ADMIN.value,
    Role.MEDIA_CONTENT_ADMIN.value,
    Role.STORE_MANAGER.value,
    Role.FINANCE_ADMIN.value,
    Role.IT_ADMIN.value,
]


def permissions_for_role(role: str) -> List[str]:
    return list(ROLE_PERMISSIONS.get(role, []))


def has_permission(user_permissions: List[str], required: str) -> bool:
    if WILDCARD in user_permissions:
        return True
    if required in user_permissions:
        return True
    resource = required.split(":", 1)[0]
    return f"{resource}:{WILDCARD}" in user_permissions
