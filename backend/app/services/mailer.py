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
import html as html_escape
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


class ResendMailer(Mailer):
    """Resend REST API (https://api.resend.com/emails) via httpx.

    API key HANYA dari environment (`RESEND_API_KEY`) dan pengirim HANYA dari
    `MAIL_FROM`/`MAIL_FROM_NAME` — tidak ada nilai yang di-hardcode. API key,
    isi email, dan kode OTP tidak pernah masuk log.
    """

    ENDPOINT = "https://api.resend.com/emails"

    async def send(self, message: MailMessage) -> bool:
        import httpx

        sender = (
            f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
            if settings.MAIL_FROM_NAME
            else settings.MAIL_FROM
        )
        payload = {
            "from": sender,
            "to": [message.to],
            "subject": message.subject,
            "text": message.text,
        }
        if message.html:
            payload["html"] = message.html
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    self.ENDPOINT,
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except Exception as exc:  # jaringan/timeout — konten tidak pernah bocor
            logger.error("mail.failed provider=RESEND to=%s error=%s", message.to, type(exc).__name__)
            return False

        try:
            body = response.json()
        except ValueError:
            body = {}
        if not isinstance(body, dict):
            body = {}
        # Resend membalas 200/201 dengan {"id": "..."}; kegagalan memakai
        # {"statusCode": ..., "message"/"name": ...} atau HTTP >= 400.
        if response.status_code >= 400 or body.get("error") or not body.get("id"):
            logger.error(
                "mail.rejected provider=RESEND to=%s http=%s reason=%s",
                message.to,
                response.status_code,
                (body.get("name") or body.get("message") or "unknown")
                if response.status_code >= 400
                else "missing_id",
            )
            return False
        logger.info("mail.sent provider=RESEND to=%s subject=%s", message.to, message.subject)
        return True


class Smtp2GoMailer(Mailer):
    """Fase 3 — SMTP2GO REST API v3. API key hanya dari environment."""

    ENDPOINT = "https://api.smtp2go.com/v3/email/send"

    async def send(self, message: MailMessage) -> bool:
        import httpx

        sender_name = settings.SMTP2GO_SENDER_NAME or settings.MAIL_FROM_NAME
        payload = {
            "sender": f"{sender_name} <{settings.SMTP2GO_SENDER_EMAIL}>",
            "to": [message.to],
            "subject": message.subject,
            "text_body": message.text,
            "fastaccept": False,
        }
        if message.html:
            payload["html_body"] = message.html
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    self.ENDPOINT,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "X-Smtp2go-Api-Key": settings.SMTP2GO_API_KEY,
                    },
                    json=payload,
                )
        except Exception as exc:
            logger.error("mail.failed provider=SMTP2GO to=%s error=%s", message.to, type(exc).__name__)
            return False

        try:
            body = response.json()
        except ValueError:
            body = {}
        data = body.get("data", body) if isinstance(body, dict) else {}
        failed = data.get("failed", 0) if isinstance(data, dict) else 0
        failures = data.get("failures", []) if isinstance(data, dict) else []
        # SMTP2GO can answer HTTP 200 while reporting per-recipient failures.
        if response.status_code >= 400 or failed or failures:
            logger.error(
                "mail.rejected provider=SMTP2GO to=%s http=%s failed=%s",
                message.to,
                response.status_code,
                failed,
            )
            return False
        logger.info("mail.sent provider=SMTP2GO to=%s subject=%s", message.to, message.subject)
        return True


_mailer: Mailer | None = None


def smtp2go_configured() -> bool:
    return bool(settings.SMTP2GO_API_KEY and settings.SMTP2GO_SENDER_EMAIL)


def resend_configured() -> bool:
    return bool(settings.RESEND_API_KEY and settings.MAIL_FROM)


def get_mailer() -> Mailer:
    global _mailer
    if _mailer is not None:
        return _mailer
    provider = (settings.MAIL_PROVIDER or "LOG").upper()
    if provider == "MEMORY":
        _mailer = MemoryMailer()
    elif provider == "RESEND" and resend_configured():
        # Pilihan eksplisit MAIL_PROVIDER=RESEND hanya berlaku bila
        # RESEND_API_KEY dan MAIL_FROM benar-benar terisi; kalau tidak, jatuh ke
        # provider lain / LOG (tidak pernah mengklaim email terkirim).
        _mailer = ResendMailer()
    elif smtp2go_configured():
        _mailer = Smtp2GoMailer()
    elif provider == "SMTP" and settings.SMTP_HOST and settings.MAIL_FROM:
        _mailer = SmtpMailer()
    else:
        _mailer = LogMailer()
    logger.info("Mailer initialised with provider=%s", type(_mailer).__name__)
    return _mailer


def reset_mailer() -> None:
    """Test helper — forces provider re-selection after settings change."""
    global _mailer
    _mailer = None


def mail_status() -> dict:
    """Honest report for the Admin panel — never exposes the API key."""
    mailer = get_mailer()
    name = type(mailer).__name__
    configured = isinstance(mailer, (Smtp2GoMailer, SmtpMailer, ResendMailer))
    if isinstance(mailer, ResendMailer):
        sender = settings.MAIL_FROM
        sender_name = settings.MAIL_FROM_NAME
    else:
        sender = settings.SMTP2GO_SENDER_EMAIL or settings.MAIL_FROM or ""
        sender_name = settings.SMTP2GO_SENDER_NAME or settings.MAIL_FROM_NAME
    return {
        "provider": {
            "ResendMailer": "RESEND",
            "Smtp2GoMailer": "SMTP2GO",
            "SmtpMailer": "SMTP",
            "MemoryMailer": "MEMORY",
            "LogMailer": "NOT_CONFIGURED",
        }.get(name, "NOT_CONFIGURED"),
        "configured": configured,
        "sender": sender,
        "sender_name": sender_name,
        "note": (
            "Email OTP & reset aktif."
            if configured
            else (
                "Isi RESEND_API_KEY + MAIL_FROM (MAIL_PROVIDER=RESEND) di environment server "
                "agar email benar-benar terkirim."
            )
        ),
    }


OTP_SUBJECTS = {
    "REGISTER": "Kode Verifikasi Pendaftaran Baraya AL SABBAT",
    "RESET": "Kode Reset Kata Sandi Baraya AL SABBAT",
}

OTP_INTROS = {
    "REGISTER": "Gunakan kode berikut untuk menyelesaikan pendaftaran akun Baraya AL SABBAT Anda.",
    "RESET": "Gunakan kode berikut untuk mengatur ulang kata sandi akun Baraya AL SABBAT Anda.",
}


async def send_customer_otp_email(
    *, email: str, full_name: str, code: str, purpose: str, expires_minutes: int
) -> bool:
    """Deliver a one-time code. The code is never written to the application log."""
    greeting = f"Baraya {full_name}".strip()
    intro = OTP_INTROS.get(purpose, OTP_INTROS["REGISTER"])
    text = (
        f"Halo {greeting},\n\n{intro}\n\n"
        f"Kode verifikasi: {code}\n\n"
        f"Kode ini berlaku {expires_minutes} menit dan hanya dapat dipakai satu kali.\n"
        "Jangan bagikan kode ini kepada siapa pun, termasuk pengurus klub.\n\n"
        "Salam,\nAL SABBAT Football Club"
    )
    html = (
        f"<p>Halo <strong>{html_escape.escape(greeting)}</strong>,</p>"
        f"<p>{html_escape.escape(intro)}</p>"
        f"<p style='font-size:30px;font-weight:800;letter-spacing:8px'>{html_escape.escape(code)}</p>"
        f"<p>Kode ini berlaku {expires_minutes} menit dan hanya dapat dipakai satu kali.</p>"
        "<p>Jangan bagikan kode ini kepada siapa pun.</p>"
        "<p>Salam,<br/>AL SABBAT Football Club</p>"
    )
    return await get_mailer().send(
        MailMessage(
            to=email,
            subject=OTP_SUBJECTS.get(purpose, OTP_SUBJECTS["REGISTER"]),
            text=text,
            html=html,
        )
    )


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
