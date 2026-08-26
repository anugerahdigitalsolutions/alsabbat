"""Domain enumerations for the ALSABBAT football club platform."""
from __future__ import annotations

from enum import Enum


class EntityStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class TeamCategory(str, Enum):
    FIRST_TEAM = "FIRST_TEAM"
    RESERVE_TEAM = "RESERVE_TEAM"
    YOUTH_TEAM = "YOUTH_TEAM"
    WOMEN_TEAM = "WOMEN_TEAM"
    ACADEMY = "ACADEMY"
    OTHER = "OTHER"


class PlayerPosition(str, Enum):
    GOALKEEPER = "GOALKEEPER"
    DEFENDER = "DEFENDER"
    MIDFIELDER = "MIDFIELDER"
    FORWARD = "FORWARD"


class PlayerStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INJURED = "INJURED"
    SUSPENDED = "SUSPENDED"
    ON_LOAN = "ON_LOAN"
    INACTIVE = "INACTIVE"
    RETIRED = "RETIRED"


class StaffRole(str, Enum):
    HEAD_COACH = "HEAD_COACH"
    ASSISTANT_COACH = "ASSISTANT_COACH"
    GOALKEEPER_COACH = "GOALKEEPER_COACH"
    FITNESS_COACH = "FITNESS_COACH"
    TEAM_MANAGER = "TEAM_MANAGER"
    MEDICAL_STAFF = "MEDICAL_STAFF"
    ANALYST = "ANALYST"
    KIT_MANAGER = "KIT_MANAGER"
    OTHER = "OTHER"


class SeasonStatus(str, Enum):
    UPCOMING = "UPCOMING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class CompetitionType(str, Enum):
    LEAGUE = "LEAGUE"
    CUP = "CUP"
    TOURNAMENT = "TOURNAMENT"
    FRIENDLY = "FRIENDLY"


class MatchStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    UPCOMING = "UPCOMING"
    LIVE = "LIVE"
    FINISHED = "FINISHED"
    POSTPONED = "POSTPONED"
    CANCELLED = "CANCELLED"


class MatchVenueType(str, Enum):
    HOME = "HOME"
    AWAY = "AWAY"
    NEUTRAL = "NEUTRAL"


class LineupRole(str, Enum):
    """Role of a player inside a single match lineup (one doc per player)."""

    STARTING = "STARTING"
    SUBSTITUTE = "SUBSTITUTE"
    UNUSED_SUBSTITUTE = "UNUSED_SUBSTITUTE"


class MatchEventType(str, Enum):
    """Match timeline event types (Match Center V1)."""

    GOAL = "GOAL"
    OWN_GOAL = "OWN_GOAL"
    ASSIST = "ASSIST"
    PENALTY_SCORED = "PENALTY_SCORED"
    PENALTY_MISSED = "PENALTY_MISSED"
    YELLOW_CARD = "YELLOW_CARD"
    SECOND_YELLOW_CARD = "SECOND_YELLOW_CARD"
    RED_CARD = "RED_CARD"
    SUBSTITUTION = "SUBSTITUTION"
    OTHER = "OTHER"


class MatchEventSide(str, Enum):
    """Which side an event belongs to (club team or opponent)."""

    CLUB = "CLUB"
    OPPONENT = "OPPONENT"


class PostType(str, Enum):
    """Editorial type of a CMS post (single CMS, no second content system)."""

    ARTICLE = "ARTICLE"
    MATCH_REPORT = "MATCH_REPORT"
    ANNOUNCEMENT = "ANNOUNCEMENT"


class PostStatus(str, Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class GalleryStatus(str, Enum):
    """Publication state of a gallery album (Phase 4)."""

    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class MediaType(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    DOCUMENT = "DOCUMENT"


class StorageProvider(str, Enum):
    LOCAL = "LOCAL"
    EMERGENT = "EMERGENT"
    S3 = "S3"
    EXTERNAL = "EXTERNAL"


class AnalyticsEventType(str, Enum):
    PAGE_VIEW = "PAGE_VIEW"
    CONTENT_VIEW = "CONTENT_VIEW"
    MATCH_VIEW = "MATCH_VIEW"
    GALLERY_VIEW = "GALLERY_VIEW"
    CUSTOM_EVENT = "CUSTOM_EVENT"
