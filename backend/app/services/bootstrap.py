"""Idempotent bootstrap: super admin user + default club configuration."""
from __future__ import annotations

from app.core.config import settings
from app.core.database import Collections, get_db
from app.core.logging_config import get_logger
from app.core.rbac import Role
from app.core.security import hash_password
from app.models.base import new_id, utcnow
from fastapi.encoders import jsonable_encoder

logger = get_logger(__name__)

DEFAULT_CLUB = {
    "name": "ALSABBAT Football Club",
    "short_name": "ALSABBAT",
    "logo": None,
    "primary_color": "#FCCF2B",
    "secondary_color": "#012891",
    "tertiary_color": "#222222",
    "light_color": "#FEFEFE",
    "description": (
        "ALSABBAT Football Club — official digital platform. "
        "Built for multiple teams, seasons, competitions and matches."
    ),
    "founded_date": None,
    "location": None,
    "stadium": None,
    "contact": {"email": None, "phone": None, "whatsapp": None, "address": None},
    "official_website": None,
    "social_media": {
        "instagram": None,
        "facebook": None,
        "twitter": None,
        "tiktok": None,
        "youtube": None,
        "website": None,
    },
    "seo": {
        "title": "ALSABBAT Football Club — Official Website",
        "description": "Official digital platform of ALSABBAT Football Club.",
        "keywords": ["ALSABBAT", "Football Club", "Sepak Bola"],
        "og_image": None,
        "canonical_url": None,
    },
    "status": "ACTIVE",
}


async def seed_super_admin() -> None:
    """Create the bootstrap super admin only if it does not exist yet."""
    if not settings.BOOTSTRAP_ADMIN_PASSWORD:
        logger.warning(
            "BOOTSTRAP_ADMIN_PASSWORD is not set — skipping super admin seeding."
        )
        return
    db = get_db()
    email = settings.BOOTSTRAP_ADMIN_EMAIL.lower().strip()
    existing = await db[Collections.USERS].find_one({"email": email})
    if existing:
        return
    now = jsonable_encoder(utcnow())
    await db[Collections.USERS].insert_one(
        {
            "id": new_id(),
            "email": email,
            "name": settings.BOOTSTRAP_ADMIN_NAME,
            "role": Role.SUPER_ADMIN.value,
            "is_active": True,
            "avatar_url": None,
            "password_hash": hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
        }
    )
    logger.info("Bootstrap super admin created: %s", email)


async def seed_default_club() -> None:
    """Ensure a single centralized Club configuration document exists."""
    db = get_db()
    if await db[Collections.CLUBS].count_documents({}) > 0:
        return
    now = jsonable_encoder(utcnow())
    doc = dict(DEFAULT_CLUB)
    doc.update({"id": new_id(), "created_at": now, "updated_at": now})
    await db[Collections.CLUBS].insert_one(doc)
    logger.info("Default ALSABBAT club configuration created")


async def run_bootstrap() -> None:
    await seed_super_admin()
    await seed_default_club()
