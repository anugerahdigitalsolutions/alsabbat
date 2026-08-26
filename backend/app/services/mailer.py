"""Mail delivery abstraction (Phase 14).

Application -> Mailer -> (SMTP | LOG | MEMORY)

  * SMTP   -> real delivery, credentials from the environment only.
  * LOG    -> no delivery; records that a mail was requested (recipient +
              subject only, never the body/token). Safe default so an
              unconfigured environment never silently fakes a delivery.
  * MEMORY -> in-memory capture, used by the automated tests only.

Reset links are built from PUBLIC_SITE_URL (never a hardcoded domain) and
never point at an admin route.
"""
from __future__ import annotations

import asyncio
import smtplib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from email.message import EmailMessage
from typing import List

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class MailMessage:
    to: str
    subject: str
    text: str
    html: str = ""


class Mailer(ABC):
    @abstractmethod
    async def send(self, message: MailMessage) -> bool: ...


class SmtpMailer(Mailer):
    """Real delivery. Never invoked unless SMTP_* is fully configured."""

    def _send_sync(self, message: MailMessage) -> None:
        mail = EmailMessage()
        mail["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
        mail["To"] = message.to
        mail["Subject"] = message.subject
        mail.set_content(message.text)
        if message.html:
            mail.add_alternative(message.html, subtype="html")
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(mail)

    async def send(self, message: MailMessage) -> bool:
        try:
            await asyncio.to_thread(self._send_sync, message)
            logger.info("mail.sent provider=SMTP to=%s subject=%s", message.to, message.subject)
            return True
        except Exception as exc:  # delivery failure must never leak content
            logger.error("mail.failed provider=SMTP to=%s error=%s", message.to, type(exc).__name__)
            return False


class LogMailer(Mailer):
    """No delivery. Audit trail only — body and tokens are never logged."""

    async def send(self, message: MailMessage) -> bool:
        logger.warning(
            "mail.not_configured provider=LOG to=%s subject=%s (set MAIL_PROVIDER=SMTP + SMTP_* to deliver)",
            message.to,
            message.subject,
        )
        return False


@dataclass
class MemoryMailer(Mailer):
    """Test transport. Keeps messages in memory, sends nothing."""

    outbox: List[MailMessage] = field(default_factory=list)

    async def send(self, message: MailMessage) -> bool:
        self.outbox.append(message)
        logger.info("mail.captured provider=MEMORY to=%s subject=%s", message.to, message.subject)
        return True


_mailer: Mailer | None = None


def get_mailer() -> Mailer:
    global _mailer
    if _mailer is not None:
        return _mailer
    provider = (settings.MAIL_PROVIDER or "LOG").upper()
    if provider == "SMTP" and settings.SMTP_HOST and settings.MAIL_FROM:
        _mailer = SmtpMailer()
    elif provider == "MEMORY":
        _mailer = MemoryMailer()
    else:
        _mailer = LogMailer()
    logger.info("Mailer initialised with provider=%s", type(_mailer).__name__)
    return _mailer


def reset_link(token: str) -> str:
    base = (settings.PUBLIC_SITE_URL or "").rstrip("/")
    return f"{base}/reset-password?token={token}"


async def send_customer_password_reset_email(
    *, email: str, full_name: str, token: str, expires_minutes: int
) -> bool:
    """Deliver the Baraya password reset instructions. Token is never logged."""
    link = reset_link(token)
    greeting = f"Baraya {full_name}".strip()
    text = (
        f"Halo {greeting},\n\n"
        "Kami menerima permintaan untuk mengatur ulang kata sandi akun Baraya ALSABBAT Anda.\n"
        f"Buka tautan berikut untuk membuat kata sandi baru:\n\n{link}\n\n"
        f"Tautan ini hanya berlaku {expires_minutes} menit dan hanya dapat digunakan satu kali.\n\n"
        "Jika Anda tidak meminta perubahan ini, abaikan email ini. Kata sandi Anda tidak berubah "
        "dan sebaiknya jangan bagikan tautan ini kepada siapa pun.\n\n"
        "Salam,\nALSABBAT Football Club"
    )
    html = (
        f"<p>Halo <strong>{greeting}</strong>,</p>"
        "<p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Baraya ALSABBAT Anda.</p>"
        f'<p><a href="{link}">Buat kata sandi baru</a></p>'
        f"<p>Tautan ini hanya berlaku {expires_minutes} menit dan hanya dapat digunakan satu kali.</p>"
        "<p>Jika Anda tidak meminta perubahan ini, abaikan email ini. Kata sandi Anda tidak berubah.</p>"
        "<p>Salam,<br/>ALSABBAT Football Club</p>"
    )
    return await get_mailer().send(
        MailMessage(
            to=email,
            subject="Reset Kata Sandi Baraya ALSABBAT",
            text=text,
            html=html,
        )
    )
