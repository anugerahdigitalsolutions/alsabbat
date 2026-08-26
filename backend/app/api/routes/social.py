"""Social Publishing API (Phase 8) — additive module.

Content/Post          Media Library
       \\                 /
        SocialPublication  ->  platform adapter (official API only)

One publication document per platform, so a failure on one platform never hides
the result of another. Permissions are enforced server-side.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse

from app.api.crud_factory import Repository
from app.api.deps import require_permission
from app.core.config import settings
from app.core.database import Collections, get_db
from app.core.errors import NotFoundError, ValidationFailedError
from app.core.logging_config import get_logger
from app.core.rate_limit import write_rate_limit
from app.models.auth import AuthContext
from app.models.base import new_id, utcnow
from app.models.social import (
    SocialPublicationCreate,
    SocialPublicationStatus,
    SocialPublicationUpdate,
)
from app.services.social import oauth as social_oauth
from app.services.social.registry import get_publisher, platform_configs

logger = get_logger(__name__)

router = APIRouter(tags=["social"])
publications = Repository(Collections.SOCIAL_PUBLICATIONS)
media_repo = Repository(Collections.MEDIA)
posts_repo = Repository(Collections.POSTS)

social_read = Depends(require_permission("social:read"))
social_publish = Depends(require_permission("social:publish"))
MAX_ATTEMPTS = 5


async def _media_items(media_ids: List[str]) -> List[Dict[str, Any]]:
    items = []
    for media_id in media_ids:
        item = await media_repo.get(media_id)
        if not item:
            raise ValidationFailedError(f"Media {media_id} tidak ditemukan di Media Library.")
        items.append(item)
    return items


async def _enrich(doc: Dict[str, Any]) -> Dict[str, Any]:
    post = await posts_repo.get(doc["post_id"]) if doc.get("post_id") else None
    return {
        **doc,
        "post": {"id": post["id"], "title": post.get("title"), "slug": post.get("slug")}
        if post
        else None,
        "media": await _media_items(doc.get("media_ids") or []) if doc.get("media_ids") else [],
    }


# ------------------------------------------------------------- platforms
@router.get("/platforms", summary="Platform connection/configuration state (secret-free)")
async def list_platforms(user: AuthContext = social_read) -> Dict[str, Any]:
    configs = platform_configs()
    return {
        "items": [
            {
                "platform": cfg.platform,
                "label": cfg.label,
                "connected": cfg.connected,
                "status": cfg.status,
                "requirements": cfg.requirements,
                "missing_env": cfg.missing_env,
                "limitations": cfg.limitations,
                "official_api": cfg.official_api,
            }
            for cfg in configs
        ],
        "total": len(configs),
    }


# -------------------------------------------- account connections (OAuth)
def _admin_return(platform: str, result: str) -> RedirectResponse:
    """Kembali ke Admin → Media Sosial. Tidak pernah membawa token di URL."""
    base = (settings.PUBLIC_SITE_URL or "").rstrip("/")
    return RedirectResponse(
        url=f"{base}/admin/social?social_oauth={result}&platform={platform.lower()}",
        status_code=302,
    )


@router.get("/connections", summary="Status koneksi akun sosial (tanpa token)")
async def list_connections(user: AuthContext = social_read) -> Dict[str, Any]:
    coll = get_db()[Collections.SOCIAL_CONNECTIONS]
    docs = {doc["platform"]: doc async for doc in coll.find({})}
    items = [social_oauth.connection_state(p, docs.get(p)) for p in social_oauth.PLATFORMS]
    return {"items": items, "total": len(items)}


@router.post("/connections/{platform}/authorize", summary="Mulai OAuth resmi platform")
async def start_authorization(
    platform: str, request: Request, user: AuthContext = social_publish
) -> Dict[str, Any]:
    platform = platform.upper()
    if platform not in social_oauth.PLATFORMS:
        raise NotFoundError("Platform tidak dikenal")
    if not social_oauth.is_configured(platform):
        raise ValidationFailedError(
            f"{platform.title()} belum dikonfigurasi. Env yang belum tersedia: "
            + ", ".join(social_oauth.missing_env(platform))
        )
    write_rate_limit(request)
    state = await social_oauth.create_state(platform, user.user_id)
    return {"authorization_url": social_oauth.authorize_url(platform, state)}


@router.get("/oauth/{platform}/callback", summary="Callback OAuth platform (server-side)")
async def oauth_callback(
    platform: str,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
) -> RedirectResponse:
    platform = platform.upper()
    if platform not in social_oauth.PLATFORMS:
        raise NotFoundError("Platform tidak dikenal")
    state_doc = await social_oauth.consume_state(platform, state)
    if not state_doc:
        logger.warning("social oauth callback rejected: invalid state", extra={"platform": platform})
        return _admin_return(platform, "invalid_state")
    if error or not code:
        return _admin_return(platform, "denied")

    coll = get_db()[Collections.SOCIAL_CONNECTIONS]
    try:
        tokens = await social_oauth.exchange_code(platform, code)
        access_token = tokens.get("access_token")
        if not access_token:
            raise ValueError("token kosong")
        identity = await social_oauth.fetch_identity(platform, access_token)
        await coll.update_one(
            {"platform": platform},
            {
                "$set": {
                    "platform": platform,
                    "account_id": identity.get("account_id"),
                    "account_name": identity.get("account_name"),
                    "status": "CONNECTED",
                    "error_message": None,
                    "scope": social_oauth.provider(platform)["scope"],
                    "access_token_enc": social_oauth.encrypt_token(access_token),
                    "refresh_token_enc": social_oauth.encrypt_token(tokens.get("refresh_token")),
                    "expires_at": tokens.get("expires_at"),
                    "connected_by": state_doc.get("admin_id"),
                    "connected_at": utcnow().isoformat(),
                    "updated_at": utcnow().isoformat(),
                },
                "$setOnInsert": {"id": new_id()},
            },
            upsert=True,
        )
    except Exception:  # noqa: BLE001 — detail platform tidak boleh bocor ke UI/log token
        logger.exception("social oauth exchange failed", extra={"platform": platform})
        await coll.update_one(
            {"platform": platform},
            {
                "$set": {
                    "platform": platform,
                    "status": "ERROR",
                    "error_message": "Pertukaran token gagal. Coba hubungkan ulang.",
                    "updated_at": utcnow().isoformat(),
                },
                "$setOnInsert": {"id": new_id()},
            },
            upsert=True,
        )
        return _admin_return(platform, "error")

    return _admin_return(platform, "connected")


@router.delete("/connections/{platform}", summary="Putuskan koneksi akun sosial")
async def disconnect_connection(
    platform: str, request: Request, user: AuthContext = social_publish
) -> Dict[str, Any]:
    platform = platform.upper()
    if platform not in social_oauth.PLATFORMS:
        raise NotFoundError("Platform tidak dikenal")
    write_rate_limit(request)
    coll = get_db()[Collections.SOCIAL_CONNECTIONS]
    doc = await coll.find_one({"platform": platform})
    if not doc:
        return {"platform": platform, "status": "NOT_CONNECTED", "revoked": False}
    revoked = await social_oauth.revoke(
        platform, social_oauth.decrypt_token(doc.get("access_token_enc")), doc.get("account_id")
    )
    await coll.delete_one({"platform": platform})
    logger.info("social connection disconnected", extra={"platform": platform, "revoked": revoked})
    return {"platform": platform, "status": "NOT_CONNECTED", "revoked": revoked}


# ---------------------------------------------------------- publications
@router.get("/publications", summary="List social publications")
async def list_publications(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    post_id: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    user: AuthContext = social_read,
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    if post_id:
        query["post_id"] = post_id
    items, total = await publications.list(query, limit=limit, skip=skip)
    return {
        "items": [await _enrich(item) for item in items],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.get("/publications/{publication_id}", summary="Get one social publication")
async def get_publication(publication_id: str, user: AuthContext = social_read) -> Dict[str, Any]:
    doc = await publications.get(publication_id)
    if not doc:
        raise NotFoundError("SocialPublication not found")
    return await _enrich(doc)


@router.post("/publications", status_code=201, summary="Create draft publications per platform")
async def create_publications(
    payload: SocialPublicationCreate,
    request: Request,
    user: AuthContext = social_publish,
) -> Dict[str, Any]:
    write_rate_limit(request)
    media = await _media_items(payload.media_ids)
    if payload.post_id and not await posts_repo.get(payload.post_id):
        raise ValidationFailedError("Post tidak ditemukan pada CMS.")

    created: List[Dict[str, Any]] = []
    for platform in payload.platforms:
        base = payload.model_dump(exclude={"platforms"})
        publisher = get_publisher(platform.value)
        # Pre-flight validation happens before anything is stored as QUEUED.
        publisher.validate({**base, "platform": platform.value}, media)
        doc = await publications.create(
            {
                **base,
                "platform": platform.value,
                "status": SocialPublicationStatus.DRAFT.value,
                "attempt_count": 0,
                "created_by": user.user_id,
            }
        )
        created.append(doc)
        logger.info(
            "social.publication.created user=%s platform=%s publication=%s",
            user.email,
            platform.value,
            doc["id"],
        )
    return {"items": created, "total": len(created)}


@router.patch("/publications/{publication_id}", summary="Update a draft publication")
async def update_publication(
    publication_id: str,
    payload: SocialPublicationUpdate,
    request: Request,
    user: AuthContext = social_publish,
) -> Dict[str, Any]:
    write_rate_limit(request)
    doc = await publications.get(publication_id)
    if not doc:
        raise NotFoundError("SocialPublication not found")
    if doc.get("status") == SocialPublicationStatus.PUBLISHED.value:
        raise ValidationFailedError("Publikasi yang sudah PUBLISHED tidak dapat diubah.")
    updated = await publications.update(publication_id, payload.model_dump(exclude_unset=True))
    return await _enrich(updated or doc)


@router.delete("/publications/{publication_id}", summary="Delete a publication")
async def delete_publication(
    publication_id: str, request: Request, user: AuthContext = social_publish
) -> Dict[str, Any]:
    write_rate_limit(request)
    if not await publications.delete(publication_id):
        raise NotFoundError("SocialPublication not found")
    return {"deleted": True, "id": publication_id}


@router.post("/publications/{publication_id}/cancel", summary="Cancel a publication")
async def cancel_publication(
    publication_id: str, request: Request, user: AuthContext = social_publish
) -> Dict[str, Any]:
    write_rate_limit(request)
    doc = await publications.get(publication_id)
    if not doc:
        raise NotFoundError("SocialPublication not found")
    if doc.get("status") == SocialPublicationStatus.PUBLISHED.value:
        raise ValidationFailedError("Publikasi sudah terbit dan tidak dapat dibatalkan.")
    updated = await publications.update(
        publication_id, {"status": SocialPublicationStatus.CANCELLED.value}
    )
    return await _enrich(updated or doc)


async def _run_publish(doc: Dict[str, Any], user: AuthContext) -> Dict[str, Any]:
    publication_id = doc["id"]
    # Idempotency: never publish twice.
    if doc.get("status") == SocialPublicationStatus.PUBLISHED.value or doc.get("external_post_id"):
        raise ValidationFailedError(
            "Publikasi ini sudah diterbitkan (idempotency). Buat publikasi baru bila diperlukan."
        )
    if doc.get("status") == SocialPublicationStatus.PUBLISHING.value:
        raise ValidationFailedError("Publikasi sedang berjalan, tunggu hingga selesai.")
    if int(doc.get("attempt_count") or 0) >= MAX_ATTEMPTS:
        raise ValidationFailedError(
            f"Batas percobaan ({MAX_ATTEMPTS}) tercapai. Perbaiki konfigurasi lalu buat publikasi baru."
        )

    publisher = get_publisher(doc["platform"])
    media = await _media_items(doc.get("media_ids") or [])
    publisher.validate(doc, media)

    await publications.update(
        publication_id,
        {
            "status": SocialPublicationStatus.PUBLISHING.value,
            "attempt_count": int(doc.get("attempt_count") or 0) + 1,
        },
    )

    result = await publisher.publish(doc, media)
    if result.success:
        update = {
            "status": SocialPublicationStatus.PUBLISHED.value,
            "external_post_id": result.external_post_id,
            "external_url": result.external_url,
            "published_at": utcnow().isoformat(),
            "error_code": None,
            "error_message": None,
        }
    else:
        update = {
            "status": SocialPublicationStatus.FAILED.value,
            "error_code": result.error_code,
            "error_message": result.error_message,
        }
    await publications.coll.update_one({"id": publication_id}, {"$set": update})
    logger.info(
        "social.publication.%s user=%s platform=%s publication=%s code=%s",
        "published" if result.success else "failed",
        user.email,
        doc["platform"],
        publication_id,
        result.error_code or "-",
    )
    final = await publications.get(publication_id)
    return {**(await _enrich(final or doc)), "result_details": result.details}


@router.post("/publications/{publication_id}/publish", summary="Publish through the official API")
async def publish_publication(
    publication_id: str, request: Request, user: AuthContext = social_publish
) -> Dict[str, Any]:
    write_rate_limit(request)
    doc = await publications.get(publication_id)
    if not doc:
        raise NotFoundError("SocialPublication not found")
    return await _run_publish(doc, user)


@router.post("/publications/{publication_id}/retry", summary="Retry a FAILED publication")
async def retry_publication(
    publication_id: str, request: Request, user: AuthContext = social_publish
) -> Dict[str, Any]:
    write_rate_limit(request)
    doc = await publications.get(publication_id)
    if not doc:
        raise NotFoundError("SocialPublication not found")
    if doc.get("status") != SocialPublicationStatus.FAILED.value:
        raise ValidationFailedError("Retry hanya tersedia untuk publikasi berstatus FAILED.")
    return await _run_publish(doc, user)


@router.get("/summary", summary="Social dashboard summary")
async def social_summary(user: AuthContext = social_read) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    for cfg in platform_configs():
        latest, _ = await publications.list({"platform": cfg.platform}, limit=1)
        last = latest[0] if latest else None
        items.append(
            {
                "platform": cfg.platform,
                "label": cfg.label,
                "connection": cfg.status,
                "published_total": await publications.count(
                    {"platform": cfg.platform, "status": SocialPublicationStatus.PUBLISHED.value}
                ),
                "failed_total": await publications.count(
                    {"platform": cfg.platform, "status": SocialPublicationStatus.FAILED.value}
                ),
                "last_publication": {
                    "id": last["id"],
                    "status": last.get("status"),
                    "published_at": last.get("published_at"),
                    "external_url": last.get("external_url"),
                }
                if last
                else None,
            }
        )
    return {"items": items, "total": len(items)}
