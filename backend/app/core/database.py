"""MongoDB (Atlas ready) connection management and index bootstrap."""
from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, TEXT

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


class Collections:
    USERS = "users"
    SESSIONS = "sessions"
    CLUBS = "clubs"
    TEAMS = "teams"
    PLAYERS = "players"
    STAFF = "staff"
    SEASONS = "seasons"
    COMPETITIONS = "competitions"
    MATCHES = "matches"
    MATCH_LINEUPS = "match_lineups"
    MATCH_EVENTS = "match_events"
    POSTS = "posts"
    CATEGORIES = "categories"
    TAGS = "tags"
    AUTHORS = "authors"
    MEDIA = "media"
    GALLERY_ALBUMS = "gallery_albums"
    SPONSORS = "sponsors"
    ACHIEVEMENTS = "achievements"
    ANALYTICS_EVENTS = "analytics_events"
    SOCIAL_PUBLICATIONS = "social_publications"
    SOCIAL_CONNECTIONS = "social_connections"
    SOCIAL_OAUTH_STATES = "social_oauth_states"
    PRODUCTS = "products"
    PRODUCT_CATEGORIES = "product_categories"
    PRODUCT_VARIANTS = "product_variants"
    ORDERS = "orders"
    CUSTOMERS = "customers"
    CUSTOMER_SESSIONS = "customer_sessions"
    CUSTOMER_PASSWORD_RESETS = "customer_password_resets"
    CUSTOMER_OTPS = "customer_otps"
    MEMBER_APPLICATIONS = "member_applications"
    RATE_LIMITS = "rate_limits"
    SETTINGS = "site_settings"
    COUNTERS = "counters"
    BANNERS = "banners"
    SITE_CONTENT = "site_content"


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            uuidRepresentation="standard",
            serverSelectionTimeoutMS=8000,
            tz_aware=True,
        )
        logger.info("MongoDB client initialised (db=%s)", settings.DB_NAME)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[settings.DB_NAME]
    return _db


async def ping() -> bool:
    try:
        await get_client().admin.command("ping")
        return True
    except Exception as exc:  # pragma: no cover - infra failure path
        logger.error("MongoDB ping failed: %s", exc)
        return False


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None


async def ensure_indexes() -> None:
    """Create indexes used for filtering / searching / sorting / lookups."""
    db = get_db()
    try:
        await db[Collections.USERS].create_index([("email", ASCENDING)], unique=True)
        await db[Collections.USERS].create_index([("id", ASCENDING)], unique=True)
        await db[Collections.SESSIONS].create_index([("jti", ASCENDING)], unique=True)
        await db[Collections.SESSIONS].create_index([("user_id", ASCENDING)])

        for coll in (
            Collections.CLUBS,
            Collections.TEAMS,
            Collections.PLAYERS,
            Collections.STAFF,
            Collections.SEASONS,
            Collections.COMPETITIONS,
            Collections.MATCHES,
            Collections.MATCH_LINEUPS,
            Collections.MATCH_EVENTS,
            Collections.POSTS,
            Collections.CATEGORIES,
            Collections.TAGS,
            Collections.AUTHORS,
            Collections.MEDIA,
            Collections.GALLERY_ALBUMS,
            Collections.SPONSORS,
            Collections.ACHIEVEMENTS,
        ):
            await db[coll].create_index([("id", ASCENDING)], unique=True)
            await db[coll].create_index([("status", ASCENDING)])
            await db[coll].create_index([("created_at", DESCENDING)])

        await db[Collections.TEAMS].create_index([("club_id", ASCENDING), ("category", ASCENDING)])
        await db[Collections.PLAYERS].create_index([("team_id", ASCENDING), ("position", ASCENDING)])
        await db[Collections.PLAYERS].create_index([("jersey_number", ASCENDING)])
        await db[Collections.PLAYERS].create_index([("full_name", TEXT), ("display_name", TEXT)])
        await db[Collections.STAFF].create_index([("team_id", ASCENDING), ("role", ASCENDING)])
        await db[Collections.SEASONS].create_index([("club_id", ASCENDING), ("start_date", DESCENDING)])
        await db[Collections.COMPETITIONS].create_index([("season_id", ASCENDING), ("type", ASCENDING)])

        # Merchandise & commerce (Phase 9)
        await db[Collections.PRODUCTS].create_index([("slug", ASCENDING)], unique=True, sparse=True)
        await db[Collections.PRODUCTS].create_index([("status", ASCENDING), ("category_id", ASCENDING)])
        await db[Collections.PRODUCT_CATEGORIES].create_index([("slug", ASCENDING)], unique=True, sparse=True)
        await db[Collections.PRODUCT_VARIANTS].create_index([("product_id", ASCENDING), ("status", ASCENDING)])
        await db[Collections.ORDERS].create_index([("order_number", ASCENDING)], unique=True)
        await db[Collections.ORDERS].create_index([("customer.email", ASCENDING)])
        await db[Collections.ORDERS].create_index([("customer_id", ASCENDING), ("created_at", DESCENDING)])

        # Baraya ALSABBAT customer accounts (Phase 13)
        await db[Collections.CUSTOMERS].create_index([("email", ASCENDING)], unique=True)
        await db[Collections.CUSTOMERS].create_index([("id", ASCENDING)], unique=True)
        await db[Collections.CUSTOMERS].create_index([("status", ASCENDING), ("created_at", DESCENDING)])
        await db[Collections.CUSTOMERS].create_index([("member_number", ASCENDING)], unique=True, sparse=True)
        await db[Collections.CUSTOMERS].create_index([("member_code", ASCENDING)], unique=True, sparse=True)
        await db[Collections.CUSTOMER_SESSIONS].create_index([("jti", ASCENDING)], unique=True)
        await db[Collections.CUSTOMER_SESSIONS].create_index([("customer_id", ASCENDING)])
        await db[Collections.CUSTOMER_PASSWORD_RESETS].create_index([("token_hash", ASCENDING)], unique=True)
        await db[Collections.CUSTOMER_PASSWORD_RESETS].create_index([("customer_id", ASCENDING)])
        await db[Collections.CUSTOMER_PASSWORD_RESETS].create_index([("expires_at", ASCENDING)])
        # Fase 3 — OTP & pengajuan pemain/staf
        await db[Collections.CUSTOMER_OTPS].create_index(
            [("email", ASCENDING), ("purpose", ASCENDING)]
        )
        await db[Collections.CUSTOMER_OTPS].create_index([("expires_at", ASCENDING)])
        await db[Collections.CUSTOMERS].create_index([("role", ASCENDING)])
        await db[Collections.MEMBER_APPLICATIONS].create_index([("id", ASCENDING)], unique=True)
        await db[Collections.MEMBER_APPLICATIONS].create_index(
            [("customer_id", ASCENDING), ("status", ASCENDING)]
        )
        await db[Collections.MEMBER_APPLICATIONS].create_index(
            [("status", ASCENDING), ("created_at", DESCENDING)]
        )
        await db[Collections.ORDERS].create_index(
            [("order_status", ASCENDING), ("payment_status", ASCENDING), ("created_at", DESCENDING)]
        )

        # Rate limiting counters (Phase 10) — self-expiring documents
        await db[Collections.RATE_LIMITS].create_index("expires_at", expireAfterSeconds=0)

        # Social publishing (Phase 8)
        await db[Collections.SOCIAL_PUBLICATIONS].create_index([("id", ASCENDING)], unique=True)
        await db[Collections.SOCIAL_PUBLICATIONS].create_index(
            [("post_id", ASCENDING), ("platform", ASCENDING)]
        )
        await db[Collections.SOCIAL_PUBLICATIONS].create_index(
            [("status", ASCENDING), ("created_at", DESCENDING)]
        )

        # Social account connections (Fase 1 — OAuth connect/disconnect)
        await db[Collections.SOCIAL_CONNECTIONS].create_index([("platform", ASCENDING)], unique=True)
        await db[Collections.SOCIAL_OAUTH_STATES].create_index([("state", ASCENDING)], unique=True)
        await db[Collections.SOCIAL_OAUTH_STATES].create_index("created_at", expireAfterSeconds=900)


        # Match lookups
        await db[Collections.MATCHES].create_index([("date", DESCENDING)])
        await db[Collections.MATCHES].create_index(
            [("season_id", ASCENDING), ("competition_id", ASCENDING), ("date", DESCENDING)]
        )
        await db[Collections.MATCHES].create_index([("team_id", ASCENDING), ("status", ASCENDING)])

        # Match Center (Phase 3) — lineups & events lookups
        await db[Collections.MATCH_LINEUPS].create_index(
            [("match_id", ASCENDING), ("player_id", ASCENDING)], unique=True
        )
        await db[Collections.MATCH_LINEUPS].create_index(
            [("match_id", ASCENDING), ("role", ASCENDING), ("display_order", ASCENDING)]
        )
        await db[Collections.MATCH_LINEUPS].create_index([("team_id", ASCENDING)])
        await db[Collections.MATCH_LINEUPS].create_index([("player_id", ASCENDING)])
        await db[Collections.MATCH_EVENTS].create_index(
            [("match_id", ASCENDING), ("minute", ASCENDING), ("display_order", ASCENDING)]
        )
        await db[Collections.MATCH_EVENTS].create_index([("player_id", ASCENDING)])
        await db[Collections.MATCH_EVENTS].create_index([("type", ASCENDING)])

        # Content lookups
        await db[Collections.POSTS].create_index([("slug", ASCENDING)], unique=True)
        await db[Collections.POSTS].create_index([("status", ASCENDING), ("published_at", DESCENDING)])
        await db[Collections.POSTS].create_index([("category_id", ASCENDING)])
        await db[Collections.POSTS].create_index([("tag_ids", ASCENDING)])
        await db[Collections.POSTS].create_index([("match_id", ASCENDING)])
        await db[Collections.CATEGORIES].create_index([("slug", ASCENDING)], unique=True)
        await db[Collections.TAGS].create_index([("slug", ASCENDING)], unique=True)
        await db[Collections.AUTHORS].create_index([("slug", ASCENDING)], unique=True)

        # Media / gallery lookups
        await db[Collections.MEDIA].create_index([("file_type", ASCENDING), ("created_at", DESCENDING)])
        await db[Collections.MEDIA].create_index([("album_id", ASCENDING)])
        await db[Collections.MEDIA].create_index([("match_id", ASCENDING)])
        await db[Collections.MEDIA].create_index([("team_id", ASCENDING)])
        await db[Collections.MEDIA].create_index([("player_id", ASCENDING)])
        await db[Collections.MEDIA].create_index([("post_id", ASCENDING)])
        await db[Collections.GALLERY_ALBUMS].create_index([("slug", ASCENDING)], unique=True)
        await db[Collections.GALLERY_ALBUMS].create_index([("match_id", ASCENDING)])
        await db[Collections.GALLERY_ALBUMS].create_index(
            [("publish_status", ASCENDING), ("published_at", DESCENDING)]
        )
        await db[Collections.MEDIA].create_index(
            [("album_id", ASCENDING), ("display_order", ASCENDING)]
        )

        await db[Collections.SPONSORS].create_index([("display_order", ASCENDING)])
        # Homepage content management (Phase 15)
        await db[Collections.BANNERS].create_index([("id", ASCENDING)], unique=True)
        await db[Collections.BANNERS].create_index([("status", ASCENDING), ("display_order", ASCENDING)])
        await db[Collections.SITE_CONTENT].create_index([("key", ASCENDING)], unique=True)
        await db[Collections.SITE_CONTENT].create_index([("group", ASCENDING)])
        await db[Collections.ACHIEVEMENTS].create_index([("year", DESCENDING)])
        await db[Collections.ACHIEVEMENTS].create_index([("display_order", ASCENDING)])
        await db[Collections.ANALYTICS_EVENTS].create_index([("created_at", DESCENDING)])
        await db[Collections.ANALYTICS_EVENTS].create_index([("event_type", ASCENDING)])
        await db[Collections.ANALYTICS_EVENTS].create_index(
            [("entity_type", ASCENDING), ("entity_id", ASCENDING)]
        )
        logger.info("MongoDB indexes ensured")
    except Exception as exc:  # pragma: no cover
        logger.warning("Index creation skipped/failed: %s", exc)
