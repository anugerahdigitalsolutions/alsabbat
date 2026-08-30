"""ALSABBAT football club domain models.

Relationship map (all references are string UUIDs):

    Club
     |-- Team (club_id)          -> Player (team_id), Staff (team_id)
     |-- Season (club_id)
     |-- Competition (season_id)
     |-- Match (team_id, competition_id, season_id)
     |-- Post (category_id, author_id, tag_ids, match_id, team_id, player_id)
     |-- GalleryAlbum (match_id)
     |-- Media (album_id, match_id, team_id, player_id, post_id)
     |-- Sponsor
"""
from __future__ import annotations

import datetime as _dt
from typing import List, Optional

from pydantic import Field, field_validator, model_validator

from app.models.base import (
    AppBaseModel,
    ContactInformation,
    DBModel,
    SeoMeta,
    SocialLinks,
    make_update_model,
    slugify,
)
from app.models.enums import (
    CompetitionType,
    EntityStatus,
    GalleryStatus,
    LineupRole,
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
from app.models.staff_structure import normalise_staff_structure

HEX_COLOR = r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"


# ----------------------------------------------------------------- Club
class ClubBase(AppBaseModel):
    name: str = Field(min_length=2, max_length=160)
    short_name: str = Field(min_length=1, max_length=40)
    logo: Optional[str] = None
    primary_color: str = Field(default="#FCCF2B", pattern=HEX_COLOR)
    secondary_color: str = Field(default="#012891", pattern=HEX_COLOR)
    tertiary_color: str = Field(default="#000000", pattern=HEX_COLOR)
    light_color: str = Field(default="#FEFEFE", pattern=HEX_COLOR)
    description: Optional[str] = Field(default=None, max_length=4000)
    story: Optional[str] = Field(default=None, max_length=8000)
    hero_image: Optional[str] = None
    founded_date: Optional[_dt.date] = None
    location: Optional[str] = Field(default=None, max_length=200)
    stadium: Optional[str] = Field(default=None, max_length=200)
    contact: ContactInformation = Field(default_factory=ContactInformation)
    official_website: Optional[str] = None
    social_media: SocialLinks = Field(default_factory=SocialLinks)
    seo: SeoMeta = Field(default_factory=SeoMeta)
    # Fase 4 — tautan aplikasi mobile (additive; kosong => ikon tidak ditampilkan)
    app_playstore_url: Optional[str] = Field(default=None, max_length=500)
    app_playstore_enabled: bool = False
    app_appstore_url: Optional[str] = Field(default=None, max_length=500)
    app_appstore_enabled: bool = False
    status: EntityStatus = EntityStatus.ACTIVE

    @field_validator("app_playstore_url", "app_appstore_url", mode="before")
    @classmethod
    def _store_url(cls, value):
        # "" dipakai untuk MENGHAPUS tautan (None diabaikan oleh layer update PATCH).
        if value in (None, ""):
            return ""
        url = str(value).strip()
        lowered = url.lower()
        if not lowered.startswith("https://"):
            raise ValueError("Tautan toko aplikasi harus memakai https://")
        if any(
            scheme in lowered
            for scheme in ("javascript:", "data:", "vbscript:", "file:", "<script")
        ):
            raise ValueError("Tautan toko aplikasi tidak valid.")
        if " " in url or "\n" in url or "\t" in url:
            raise ValueError("Tautan toko aplikasi tidak boleh memuat spasi.")
        return url


ClubUpdate = make_update_model(
    "ClubUpdate",
    ClubBase,
    validators={
        "_store_url": field_validator("app_playstore_url", "app_appstore_url", mode="before")(
            ClubBase._store_url.__func__
        )
    },
)


class Club(ClubBase, DBModel):
    pass


# ----------------------------------------------------------------- Team
class TeamBase(AppBaseModel):
    club_id: str
    name: str = Field(min_length=2, max_length=160)
    short_name: Optional[str] = Field(default=None, max_length=40)
    logo: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    category: TeamCategory = TeamCategory.FIRST_TEAM
    status: EntityStatus = EntityStatus.ACTIVE


TeamUpdate = make_update_model("TeamUpdate", TeamBase)


class Team(TeamBase, DBModel):
    pass


MAX_GALLERY_IMAGES = 3


def normalise_gallery(value):
    """Maksimal 3 referensi media dengan POSISI SLOT yang dipertahankan.

    Slot 1/2/3 harus independen sampai ke database: slot kosong disimpan sebagai
    string kosong agar foto di slot 3 tidak bergeser ke slot 1 setelah save.
    Sebelumnya semua nilai kosong dibuang sehingga urutan slot ikut mengecil.

    Backward-compatible: data lama yang rapat (mis. ["a","b"]) tetap valid dan
    tidak berubah, karena kosong di ekor tetap dipangkas. Konsumen frontend sudah
    aman terhadap lubang (`personPhotos.js` memfilter falsy, `TeamsPage` memakai
    fallback `|| photo`).
    """
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, (list, tuple)):
        return []

    slots = []
    seen = set()
    for item in value[:MAX_GALLERY_IMAGES]:
        if not isinstance(item, str):
            slots.append("")
            continue
        item = item.strip()
        # Duplikat tidak boleh menggandakan media: slot kedua dikosongkan,
        # tetapi posisi slot lain tetap utuh.
        if not item or len(item) > 800 or item in seen:
            slots.append("")
            continue
        seen.add(item)
        slots.append(item)

    # Pangkas hanya slot kosong di ekor supaya data lama tetap identik.
    while slots and not slots[-1]:
        slots.pop()
    return slots[:MAX_GALLERY_IMAGES]


# --------------------------------------------------------------- Player
class PlayerBase(AppBaseModel):
    team_id: str
    full_name: str = Field(min_length=2, max_length=160)
    display_name: Optional[str] = Field(default=None, max_length=80)
    photo: Optional[str] = None
    jersey_number: Optional[int] = Field(default=None, ge=0, le=99)
    position: PlayerPosition = PlayerPosition.MIDFIELDER
    date_of_birth: Optional[_dt.date] = None
    nationality: Optional[str] = Field(default=None, max_length=80)
    height_cm: Optional[int] = Field(default=None, ge=100, le=250)
    weight_kg: Optional[int] = Field(default=None, ge=30, le=180)
    bio: Optional[str] = Field(default=None, max_length=4000)
    status: PlayerStatus = PlayerStatus.ACTIVE
    # Statistik pemain (dikelola manual di Admin, additive pada struktur existing)
    goals: int = Field(default=0, ge=0, le=9999)
    assists: int = Field(default=0, ge=0, le=9999)
    appearances: int = Field(default=0, ge=0, le=9999)
    yellow_cards: int = Field(default=0, ge=0, le=9999)
    red_cards: int = Field(default=0, ge=0, le=9999)
    social_media: SocialLinks = Field(default_factory=SocialLinks)
    gallery_images: List[str] = Field(default_factory=list, max_length=3)

    @field_validator("gallery_images", mode="before")
    @classmethod
    def _player_gallery(cls, value):
        return normalise_gallery(value)


GALLERY_VALIDATORS = {
    "_gallery_images": field_validator("gallery_images", mode="before")(
        classmethod(lambda cls, value: normalise_gallery(value))
    )
}

PlayerUpdate = make_update_model("PlayerUpdate", PlayerBase, GALLERY_VALIDATORS)


class Player(PlayerBase, DBModel):
    pass


# ---------------------------------------------------------------- Staff
class StaffBase(AppBaseModel):
    team_id: str
    name: str = Field(min_length=2, max_length=160)
    photo: Optional[str] = None
    # `role` hanya untuk kompatibilitas data lama; entry baru diturunkan dari
    # Jabatan (lihat normalise_staff_structure), default OTHER bila tidak diisi.
    role: StaffRole = StaffRole.OTHER
    role_label: Optional[str] = Field(default=None, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=4000)
    social_media: SocialLinks = Field(default_factory=SocialLinks)
    status: EntityStatus = EntityStatus.ACTIVE
    gallery_images: List[str] = Field(default_factory=list, max_length=3)
    # Staff multi-entry (additive, semua opsional → data Staff lama tetap valid):
    # satu akun/pemain dapat memiliki banyak Staff Entry dengan Bagian, Jabatan,
    # Foto dan status masing-masing. `player_id`/`customer_id` hanya referensi —
    # profil Pemain & akun tidak pernah diubah/diduplikasi dari sini.
    player_id: Optional[str] = Field(default=None, max_length=64)
    customer_id: Optional[str] = Field(default=None, max_length=64)
    department: Optional[str] = Field(default=None, max_length=120)
    position_title: Optional[str] = Field(default=None, max_length=120)

    @field_validator("gallery_images", mode="before")
    @classmethod
    def _staff_gallery(cls, value):
        return normalise_gallery(value)

    @model_validator(mode="before")
    @classmethod
    def _staff_structure(cls, data):
        return normalise_staff_structure(data)


STAFF_VALIDATORS = {
    **GALLERY_VALIDATORS,
    "_staff_structure": model_validator(mode="before")(
        classmethod(lambda cls, data: normalise_staff_structure(data))
    ),
}

StaffUpdate = make_update_model("StaffUpdate", StaffBase, STAFF_VALIDATORS)


class Staff(StaffBase, DBModel):
    pass


# --------------------------------------------------------------- Season
class SeasonBase(AppBaseModel):
    club_id: str
    name: str = Field(min_length=2, max_length=80)
    start_date: Optional[_dt.date] = None
    end_date: Optional[_dt.date] = None
    description: Optional[str] = Field(default=None, max_length=1000)
    status: SeasonStatus = SeasonStatus.UPCOMING


SeasonUpdate = make_update_model("SeasonUpdate", SeasonBase)


class Season(SeasonBase, DBModel):
    pass


# ---------------------------------------------------------- Competition
class CompetitionBase(AppBaseModel):
    season_id: str
    name: str = Field(min_length=2, max_length=160)
    logo: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    type: CompetitionType = CompetitionType.LEAGUE
    organizer: Optional[str] = Field(default=None, max_length=160)
    status: EntityStatus = EntityStatus.ACTIVE


CompetitionUpdate = make_update_model("CompetitionUpdate", CompetitionBase)


class Competition(CompetitionBase, DBModel):
    pass


# ---------------------------------------------------------------- Match
class Opponent(AppBaseModel):
    name: str = Field(min_length=1, max_length=160)
    logo: Optional[str] = None
    short_name: Optional[str] = Field(default=None, max_length=40)


class MatchBase(AppBaseModel):
    team_id: str
    season_id: Optional[str] = None
    competition_id: Optional[str] = None
    opponent: Opponent
    date: _dt.date
    time: Optional[str] = Field(default=None, max_length=10)
    venue: Optional[str] = Field(default=None, max_length=200)
    venue_type: MatchVenueType = MatchVenueType.HOME
    status: MatchStatus = MatchStatus.SCHEDULED
    home_score: Optional[int] = Field(default=None, ge=0, le=99)
    away_score: Optional[int] = Field(default=None, ge=0, le=99)
    match_cover: Optional[str] = None
    # Kartu Pertandingan per-match (additive, backward-compatible):
    # background & crop khusus untuk kartu Feed (4:5) dan Story (9:16).
    # Kosong = pakai pengaturan global site_content seperti sebelumnya.
    card_feed_background: Optional[str] = None
    card_feed_focus_x: Optional[int] = Field(default=None, ge=0, le=100)
    card_feed_focus_y: Optional[int] = Field(default=None, ge=0, le=100)
    card_feed_zoom: Optional[int] = Field(default=None, ge=100, le=250)
    card_story_background: Optional[str] = None
    card_story_focus_x: Optional[int] = Field(default=None, ge=0, le=100)
    card_story_focus_y: Optional[int] = Field(default=None, ge=0, le=100)
    card_story_zoom: Optional[int] = Field(default=None, ge=100, le=250)
    description: Optional[str] = Field(default=None, max_length=4000)
    # Prepared relationship placeholders for the Match Center phase
    lineup_ready: bool = False
    result_summary: Optional[str] = Field(default=None, max_length=1000)
    # Match Center V1 — optional tactical formation (e.g. "4-3-3").
    # Kept as plain text: the pitch/formation visualisation is a later phase.
    formation: Optional[str] = Field(default=None, max_length=20)
    opponent_formation: Optional[str] = Field(default=None, max_length=20)
    attendance: Optional[int] = Field(default=None, ge=0, le=500000)
    referee: Optional[str] = Field(default=None, max_length=160)


MatchUpdate = make_update_model("MatchUpdate", MatchBase)


class Match(MatchBase, DBModel):
    pass


# --------------------------------------------------- Match Center (V1)
class MatchLineupBase(AppBaseModel):
    """One document per player per match (no Player data duplication).

    Relationship keys: match_id + team_id + player_id.
    The frontend groups documents into Starting XI / Substitutes via `role`.
    `pitch_slot` is reserved so a formation visual can be added later
    without a data migration.
    """

    match_id: str
    team_id: str
    player_id: str
    role: LineupRole = LineupRole.STARTING
    position: Optional[PlayerPosition] = None
    position_label: Optional[str] = Field(default=None, max_length=20)
    pitch_slot: Optional[str] = Field(default=None, max_length=20)
    shirt_number: Optional[int] = Field(default=None, ge=0, le=99)
    is_captain: bool = False
    minutes_played: Optional[int] = Field(default=None, ge=0, le=200)
    display_order: int = Field(default=0, ge=0, le=999)
    note: Optional[str] = Field(default=None, max_length=500)
    status: EntityStatus = EntityStatus.ACTIVE


MatchLineupUpdate = make_update_model("MatchLineupUpdate", MatchLineupBase)


class MatchLineup(MatchLineupBase, DBModel):
    pass


class MatchEventBase(AppBaseModel):
    """A single timeline event of a match (goal, card, substitution, ...)."""

    match_id: str
    team_id: Optional[str] = None
    side: MatchEventSide = MatchEventSide.CLUB
    type: MatchEventType = MatchEventType.GOAL
    minute: Optional[int] = Field(default=None, ge=0, le=200)
    minute_extra: Optional[int] = Field(default=None, ge=0, le=30)
    player_id: Optional[str] = None
    related_player_id: Optional[str] = None
    player_name: Optional[str] = Field(default=None, max_length=160)
    related_player_name: Optional[str] = Field(default=None, max_length=160)
    description: Optional[str] = Field(default=None, max_length=500)
    display_order: int = Field(default=0, ge=0, le=999)
    status: EntityStatus = EntityStatus.ACTIVE


MatchEventUpdate = make_update_model("MatchEventUpdate", MatchEventBase)


class MatchEvent(MatchEventBase, DBModel):
    pass


# -------------------------------------------------------------- Content
class CategoryBase(AppBaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: Optional[str] = Field(default=None, max_length=140)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: EntityStatus = EntityStatus.ACTIVE

    @field_validator("slug", mode="before")
    @classmethod
    def _slug(cls, v, info):
        return slugify(v) if v else v

    @model_validator(mode="after")
    def _ensure_slug(self):
        if not getattr(self, "slug", None):
            source = getattr(self, "name", None) or getattr(self, "title", None) or ""
            object.__setattr__(self, "slug", slugify(source))
        return self


CategoryUpdate = make_update_model("CategoryUpdate", CategoryBase)


class Category(CategoryBase, DBModel):
    pass


class TagBase(AppBaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: Optional[str] = Field(default=None, max_length=100)
    status: EntityStatus = EntityStatus.ACTIVE

    @field_validator("slug", mode="before")
    @classmethod
    def _slug(cls, v, info):
        return slugify(v) if v else v

    @model_validator(mode="after")
    def _ensure_slug(self):
        if not getattr(self, "slug", None):
            source = getattr(self, "name", None) or getattr(self, "title", None) or ""
            object.__setattr__(self, "slug", slugify(source))
        return self


TagUpdate = make_update_model("TagUpdate", TagBase)


class Tag(TagBase, DBModel):
    pass


class AuthorBase(AppBaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: Optional[str] = Field(default=None, max_length=180)
    photo: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=2000)
    user_id: Optional[str] = None
    social_media: SocialLinks = Field(default_factory=SocialLinks)
    status: EntityStatus = EntityStatus.ACTIVE

    @field_validator("slug", mode="before")
    @classmethod
    def _slug(cls, v, info):
        return slugify(v) if v else v

    @model_validator(mode="after")
    def _ensure_slug(self):
        if not getattr(self, "slug", None):
            source = getattr(self, "name", None) or getattr(self, "title", None) or ""
            object.__setattr__(self, "slug", slugify(source))
        return self


AuthorUpdate = make_update_model("AuthorUpdate", AuthorBase)


class Author(AuthorBase, DBModel):
    pass


class PostBase(AppBaseModel):
    title: str = Field(min_length=3, max_length=240)
    slug: Optional[str] = Field(default=None, max_length=260)
    thumbnail: Optional[str] = None
    excerpt: Optional[str] = Field(default=None, max_length=500)
    content: Optional[str] = None
    category_id: Optional[str] = None
    tag_ids: List[str] = Field(default_factory=list)
    author_id: Optional[str] = None
    status: PostStatus = PostStatus.DRAFT
    post_type: PostType = PostType.ARTICLE
    published_at: Optional[_dt.datetime] = None
    seo: SeoMeta = Field(default_factory=SeoMeta)
    # Optional relations to football domain
    match_id: Optional[str] = None
    team_id: Optional[str] = None
    player_id: Optional[str] = None
    competition_id: Optional[str] = None

    @field_validator("slug", mode="before")
    @classmethod
    def _slug(cls, v, info):
        return slugify(v) if v else v

    @model_validator(mode="after")
    def _ensure_slug(self):
        if not getattr(self, "slug", None):
            source = getattr(self, "name", None) or getattr(self, "title", None) or ""
            object.__setattr__(self, "slug", slugify(source))
        return self


PostUpdate = make_update_model("PostUpdate", PostBase)


class Post(PostBase, DBModel):
    pass


# ---------------------------------------------------------------- Media
class MediaBase(AppBaseModel):
    file_name: str = Field(min_length=1, max_length=260)
    file_type: MediaType = MediaType.IMAGE
    mime_type: str = Field(min_length=3, max_length=120)
    file_size: int = Field(default=0, ge=0)
    url: str = Field(min_length=1)
    storage_provider: StorageProvider = StorageProvider.EXTERNAL
    storage_key: Optional[str] = None
    thumbnail_url: Optional[str] = None
    width: Optional[int] = Field(default=None, ge=0)
    height: Optional[int] = Field(default=None, ge=0)
    duration: Optional[float] = Field(default=None, ge=0)
    alt_text: Optional[str] = Field(default=None, max_length=300)
    caption: Optional[str] = Field(default=None, max_length=600)
    # Relations
    album_id: Optional[str] = None
    match_id: Optional[str] = None
    team_id: Optional[str] = None
    player_id: Optional[str] = None
    post_id: Optional[str] = None
    # Phase 4 — ordering of media inside a gallery album
    display_order: int = Field(default=0, ge=0, le=9999)
    status: EntityStatus = EntityStatus.ACTIVE


MediaUpdate = make_update_model("MediaUpdate", MediaBase)


class Media(MediaBase, DBModel):
    uploaded_by: Optional[str] = None


# -------------------------------------------------------------- Gallery
class GalleryAlbumBase(AppBaseModel):
    title: str = Field(min_length=2, max_length=200)
    slug: Optional[str] = Field(default=None, max_length=220)
    description: Optional[str] = Field(default=None, max_length=2000)
    cover_url: Optional[str] = None
    cover_media_id: Optional[str] = None
    match_id: Optional[str] = None
    team_id: Optional[str] = None
    date: Optional[_dt.date] = None
    # Sumber foto album dari SATU link folder Google Drive (folder harus di-share
    # "anyone with the link"). Foto tidak diunduh/di-scrape; hanya dibaca lewat
    # Google Drive API resmi di server.
    drive_folder_url: Optional[str] = Field(default=None, max_length=500)
    status: EntityStatus = EntityStatus.ACTIVE
    # Phase 4 — publication workflow (DRAFT -> PUBLISHED). Public endpoints only
    # ever expose PUBLISHED albums.
    publish_status: GalleryStatus = GalleryStatus.DRAFT
    published_at: Optional[_dt.datetime] = None
    display_order: int = Field(default=0, ge=0, le=9999)

    @field_validator("slug", mode="before")
    @classmethod
    def _slug(cls, v, info):
        return slugify(v) if v else v

    @model_validator(mode="after")
    def _ensure_slug(self):
        if not getattr(self, "slug", None):
            source = getattr(self, "name", None) or getattr(self, "title", None) or ""
            object.__setattr__(self, "slug", slugify(source))
        return self


GalleryAlbumUpdate = make_update_model("GalleryAlbumUpdate", GalleryAlbumBase)


class GalleryAlbum(GalleryAlbumBase, DBModel):
    media_count: int = 0


# -------------------------------------------------------------- Sponsor
class SponsorBase(AppBaseModel):
    name: str = Field(min_length=1, max_length=160)
    slug: Optional[str] = Field(default=None, max_length=180)
    logo: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=4000)
    website: Optional[str] = None
    tier: Optional[str] = Field(default=None, max_length=60)
    display_order: int = Field(default=0, ge=0, le=9999)
    status: EntityStatus = EntityStatus.ACTIVE
    # Additive & backward-compatible: dokumen sponsor lama tanpa field ini tetap valid
    # (default kosong) dan tidak ada data lama yang hilang.
    contact: ContactInformation = Field(default_factory=ContactInformation)
    social_media: SocialLinks = Field(default_factory=SocialLinks)
    # Sponsor utama ditandai EKSPLISIT oleh admin — tidak ada promosi otomatis.
    is_featured: bool = False

    @field_validator("slug", mode="before")
    @classmethod
    def _sponsor_slug(cls, v):
        return slugify(v) if v else v

    @model_validator(mode="after")
    def _ensure_sponsor_slug(self):
        # Slug dibuat sekali dari nama bila kosong; slug yang SUDAH ada tidak
        # pernah diubah otomatis walau nama sponsor berubah (link lama aman).
        if not getattr(self, "slug", None):
            object.__setattr__(self, "slug", slugify(getattr(self, "name", "") or ""))
        return self


SponsorUpdate = make_update_model(
    "SponsorUpdate",
    SponsorBase,
    {
        "_sponsor_slug": field_validator("slug", mode="before")(
            classmethod(lambda cls, v: slugify(v) if v else v)
        )
    },
)


class Sponsor(SponsorBase, DBModel):
    pass


# ------------------------------------------------------------ Analytics
class AnalyticsEventCreate(AppBaseModel):
    event_type: str = Field(min_length=2, max_length=60)
    path: Optional[str] = Field(default=None, max_length=400)
    referrer: Optional[str] = Field(default=None, max_length=400)
    entity_type: Optional[str] = Field(default=None, max_length=60)
    entity_id: Optional[str] = Field(default=None, max_length=80)
    metadata: dict = Field(default_factory=dict)


class AnalyticsEvent(AnalyticsEventCreate, DBModel):
    session_id: Optional[str] = None
    user_agent: Optional[str] = None


# ---------------------------------------------------------- Achievement
class AchievementBase(AppBaseModel):
    title: str = Field(min_length=2, max_length=200)
    competition_name: Optional[str] = Field(default=None, max_length=200)
    competition_id: Optional[str] = None
    season_id: Optional[str] = None
    team_id: Optional[str] = None
    year: Optional[int] = Field(default=None, ge=1900, le=2200)
    level: Optional[str] = Field(default=None, max_length=80)
    trophy_image: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    display_order: int = Field(default=0, ge=0, le=9999)
    status: EntityStatus = EntityStatus.ACTIVE


AchievementUpdate = make_update_model("AchievementUpdate", AchievementBase)


class Achievement(AchievementBase, DBModel):
    pass
