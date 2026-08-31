"""Media module — metadata in MongoDB, binaries in storage/CDN."""
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, Response

from app.api.crud_factory import Repository, build_crud_router
from app.api.deps import require_permission
from app.core.config import settings
from app.core.database import Collections
from app.core.errors import NotFoundError, ValidationFailedError
from app.core.rate_limit import write_rate_limit
from app.models.auth import AuthContext
from app.models.domain import MediaBase, MediaUpdate
from app.models.enums import StorageProvider
from app.models.media_direct import DirectUploadCompleteRequest, DirectUploadSignRequest
from app.services.media_service import detect_media_type, media_service

router = APIRouter(tags=["media"])
repo = Repository(Collections.MEDIA)

MAX_UPLOAD_BYTES = (
    max(
        settings.MEDIA_MAX_IMAGE_MB,
        settings.MEDIA_MAX_VIDEO_MB,
        settings.MEDIA_MAX_DOCUMENT_MB,
    )
    * 1024
    * 1024
)


def _image_dimensions(content: bytes):
    """Best-effort image dimensions (Pillow). Never blocks an upload."""
    try:
        import io

        from PIL import Image

        with Image.open(io.BytesIO(content)) as img:
            return img.width, img.height
    except Exception:  # pragma: no cover - optional enhancement
        return None, None


def _file_headers() -> dict:
    """Header untuk berkas media publik.

    Berkas media dibaca lintas-origin oleh frontend (mis. ImageCropper memakai
    fetch -> blob, dan canvas butuh piksel yang tidak "tainted"), sedangkan
    domain frontend & API berbeda pada staging/produksi. Karena berkas ini
    memang publik dan tidak memakai cookie/kredensial, ACAO `*` dikirim
    langsung dari endpoint agar tidak bergantung pada konfigurasi CORS_ORIGINS
    atau header tambahan di web server.
    """
    return {
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Vary": "Origin",
    }


@router.get("/storage/status", summary="Media storage architecture status")
async def storage_status(_user: AuthContext = Depends(require_permission("media:read"))):
    return media_service.status()


@router.post(
    "/direct-upload/sign",
    summary="Tanda tangan upload langsung browser -> Cloudinary (bypass batas body serverless)",
)
async def sign_direct_upload(
    request: Request,
    payload: DirectUploadSignRequest,
    user: AuthContext = Depends(require_permission("media:write")),
):
    write_rate_limit(request)
    return await media_service.direct_upload_signature(
        payload.file_name, payload.mime_type
    )


@router.post(
    "/direct-upload/complete",
    status_code=201,
    summary="Catat media hasil upload langsung ke Cloudinary",
)
async def complete_direct_upload(
    request: Request,
    payload: DirectUploadCompleteRequest,
    user: AuthContext = Depends(require_permission("media:write")),
):
    write_rate_limit(request)
    if not payload.secure_url.startswith("https://"):
        raise ValidationFailedError("secure_url Cloudinary tidak valid.")
    media_type = detect_media_type(payload.mime_type or "image/jpeg")
    doc = {
        "file_name": payload.file_name,
        "file_type": media_type.value,
        "mime_type": payload.mime_type,
        "file_size": payload.bytes or 0,
        "url": payload.secure_url,
        "storage_provider": StorageProvider.CLOUDINARY.value,
        "storage_key": payload.storage_key
        or f"{payload.resource_type or 'image'}:{payload.public_id}",
        "thumbnail_url": payload.secure_url if media_type.value == "IMAGE" else None,
        "width": payload.width,
        "height": payload.height,
        "duration": payload.duration,
        "alt_text": payload.alt_text,
        "caption": payload.caption,
        "album_id": payload.album_id or None,
        "match_id": payload.match_id or None,
        "team_id": payload.team_id or None,
        "player_id": payload.player_id or None,
        "post_id": payload.post_id or None,
        "status": "ACTIVE",
        "uploaded_by": user.user_id,
    }
    return await repo.create(jsonable_encoder(doc))


@router.post("/upload", status_code=201, summary="Upload a media file through the Media Service")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    alt_text: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    album_id: Optional[str] = Form(None),
    match_id: Optional[str] = Form(None),
    team_id: Optional[str] = Form(None),
    player_id: Optional[str] = Form(None),
    post_id: Optional[str] = Form(None),
    user: AuthContext = Depends(require_permission("media:write")),
):
    write_rate_limit(request)
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValidationFailedError("File is larger than the maximum allowed upload size")
    stored, media_type = await media_service.store(
        file.filename or "upload", content, file.content_type or "application/octet-stream"
    )
    width, height = _image_dimensions(content) if media_type.value == "IMAGE" else (None, None)
    doc = {
        "file_name": file.filename or "upload",
        "file_type": media_type.value,
        "mime_type": file.content_type,
        "file_size": stored.size,
        "url": stored.url,
        "storage_provider": stored.provider.value,
        "storage_key": stored.storage_key,
        "thumbnail_url": stored.url if media_type.value == "IMAGE" else None,
        "width": width,
        "height": height,
        "duration": None,
        "alt_text": alt_text,
        "caption": caption,
        "album_id": album_id or None,
        "match_id": match_id or None,
        "team_id": team_id or None,
        "player_id": player_id or None,
        "post_id": post_id or None,
        "status": "ACTIVE",
        "uploaded_by": user.user_id,
    }
    return await repo.create(jsonable_encoder(doc))


@router.get("/files/{file_path:path}", summary="Serve stored media (object storage or local disk)")
async def serve_file(file_path: str):
    if ".." in file_path:
        raise NotFoundError("Media file not found")
    backend = getattr(media_service, "backend", None)
    if getattr(backend, "provider", None) == StorageProvider.CLOUDINARY:
        # Cloudinary menyajikan media langsung lewat URL HTTPS-nya sendiri.
        # Endpoint ini TIDAK boleh menyentuh filesystem server.
        raise NotFoundError(
            "Media disimpan di Cloudinary dan diakses langsung melalui URL HTTPS-nya "
            "(bukan melalui endpoint ini)."
        )
    if hasattr(backend, "fetch"):
        try:
            content, content_type = backend.fetch(file_path)
        except Exception as exc:
            raise NotFoundError("Media file not found") from exc
        return Response(
            content=content,
            media_type=content_type,
            headers=_file_headers(),
        )
    base = Path(settings.MEDIA_LOCAL_DIR).resolve()
    target = (base / file_path).resolve()
    if not str(target).startswith(str(base)) or not target.is_file():
        raise NotFoundError("Media file not found")
    headers = _file_headers()
    if target.suffix.lower() in {".svg", ".svgz", ".html", ".htm"}:
        # Never render user-uploaded markup inline (stored XSS prevention).
        headers["Content-Disposition"] = f'attachment; filename="{target.name}"'
    return FileResponse(str(target), headers=headers)


@router.delete("/{media_id}/hard", summary="Delete media metadata and stored file")
async def hard_delete(
    media_id: str,
    request: Request,
    _user: AuthContext = Depends(require_permission("media:write")),
):
    write_rate_limit(request)
    doc = await repo.get(media_id)
    if not doc:
        raise NotFoundError("Media not found")
    if doc.get("storage_provider") in {"LOCAL", "S3", "CLOUDINARY"}:
        await media_service.remove(doc.get("storage_key"))
    await repo.delete(media_id)
    return {"success": True, "id": media_id}


build_crud_router(
    resource="Media",
    collection=Collections.MEDIA,
    create_model=MediaBase,
    update_model=MediaUpdate,
    write_permission="media:write",
    read_permission="media:read",
    public_read=True,
    search_fields=("file_name", "alt_text", "caption"),
    filter_fields=(
        "file_type",
        "status",
        "album_id",
        "match_id",
        "team_id",
        "player_id",
        "post_id",
    ),
    tags=["media"],
    router=router,
)
