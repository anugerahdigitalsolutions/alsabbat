"""Social publishing adapters — official platform APIs only.

Application -> SocialPublisher -> (Website | Instagram | TikTok | YouTube)

Rules enforced here:
  * credentials are read from the environment (never from the database/frontend)
  * a platform without credentials returns NOT_CONFIGURED — never a fake success
  * errors are normalised into a safe code + human readable message (no secrets)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PublishResult:
    success: bool
    external_post_id: Optional[str] = None
    external_url: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PlatformConfig:
    """Safe (secret-free) configuration state exposed to the Admin UI."""

    platform: str
    label: str
    connected: bool
    status: str
    requirements: List[str]
    missing_env: List[str]
    limitations: List[str]
    official_api: str


class SocialPublisher(ABC):
    """Each adapter owns its validation, auth, upload, publish and errors."""

    platform: str = ""
    label: str = ""
    official_api: str = ""

    @abstractmethod
    def config(self) -> PlatformConfig:
        """Secret-free connection/configuration state."""

    @abstractmethod
    def validate(self, publication: Dict[str, Any], media: List[Dict[str, Any]]) -> None:
        """Raise ValidationFailedError before any network call."""

    @abstractmethod
    async def publish(
        self, publication: Dict[str, Any], media: List[Dict[str, Any]]
    ) -> PublishResult:
        """Perform the real publish through the official API."""

    # ------------------------------------------------------------- helpers
    def not_configured(self) -> PublishResult:
        cfg = self.config()
        return PublishResult(
            success=False,
            error_code="NOT_CONFIGURED",
            error_message=(
                f"{self.label} belum dikonfigurasi. Kredensial yang belum tersedia: "
                + (", ".join(cfg.missing_env) or "-")
            ),
        )
