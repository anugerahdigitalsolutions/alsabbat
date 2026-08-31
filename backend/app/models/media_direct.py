"""Payload direct/signed upload Cloudinary (browser -> Cloudinary -> API).

Dipakai agar berkas besar tidak melewati fungsi serverless Vercel yang punya
batas ukuran body request.
"""
from typing import Optional

from pydantic import Field

from app.models.base import AppBaseModel


class DirectUploadSignRequest(AppBaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    mime_type: str = Field(..., min_length=3, max_length=127)


class DirectUploadCompleteRequest(AppBaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    mime_type: Optional[str] = Field(default=None, max_length=127)
    public_id: str = Field(..., min_length=1, max_length=255)
    secure_url: str = Field(..., min_length=8, max_length=1024)
    resource_type: Optional[str] = Field(default="image", max_length=16)
    storage_key: Optional[str] = Field(default=None, max_length=300)
    bytes: Optional[int] = Field(default=None, ge=0)
    width: Optional[int] = Field(default=None, ge=0)
    height: Optional[int] = Field(default=None, ge=0)
    duration: Optional[float] = Field(default=None, ge=0)
    alt_text: Optional[str] = Field(default=None, max_length=255)
    caption: Optional[str] = Field(default=None, max_length=500)
    album_id: Optional[str] = Field(default=None, max_length=64)
    match_id: Optional[str] = Field(default=None, max_length=64)
    team_id: Optional[str] = Field(default=None, max_length=64)
    player_id: Optional[str] = Field(default=None, max_length=64)
    post_id: Optional[str] = Field(default=None, max_length=64)
