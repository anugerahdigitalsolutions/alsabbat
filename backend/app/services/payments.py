"""Payment abstraction — PaymentService -> provider adapter (official API only).

V1 provider: Midtrans Snap (Indonesia). When credentials are absent the service
reports NOT_CONFIGURED; a payment is NEVER marked PAID without a verified
server-side notification from the provider.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

from app.core.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class PaymentSession:
    configured: bool
    provider: str
    reference: Optional[str] = None
    redirect_url: Optional[str] = None
    token: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class PaymentProvider(ABC):
    name: str = ""
    label: str = ""

    @abstractmethod
    def is_configured(self) -> bool: ...

    @abstractmethod
    def missing_env(self) -> list[str]: ...

    @abstractmethod
    async def create_session(self, order: Dict[str, Any]) -> PaymentSession: ...

    @abstractmethod
    def verify_notification(self, payload: Dict[str, Any]) -> bool: ...

    @abstractmethod
    async def fetch_status(self, order_number: str) -> Optional[Dict[str, Any]]: ...

    @abstractmethod
    def map_status(self, payload: Dict[str, Any]) -> str: ...


class MidtransProvider(PaymentProvider):
    name = "MIDTRANS"
    label = "Midtrans Snap"
    ENV = ("MIDTRANS_SERVER_KEY", "MIDTRANS_CLIENT_KEY")

    @staticmethod
    def _production() -> bool:
        return os.environ.get("MIDTRANS_IS_PRODUCTION", "").lower() in {"1", "true", "yes"}

    def _base(self) -> str:
        return "https://app.midtrans.com" if self._production() else "https://app.sandbox.midtrans.com"

    def _api_base(self) -> str:
        return "https://api.midtrans.com" if self._production() else "https://api.sandbox.midtrans.com"

    def missing_env(self) -> list[str]:
        return [key for key in self.ENV if not os.environ.get(key)]

    def is_configured(self) -> bool:
        return not self.missing_env()

    async def create_session(self, order: Dict[str, Any]) -> PaymentSession:
        if not self.is_configured():
            return PaymentSession(
                configured=False,
                provider=self.name,
                error_code="PAYMENT_NOT_CONFIGURED",
                error_message=(
                    "Payment gateway belum dikonfigurasi. Variabel yang belum diisi: "
                    + ", ".join(self.missing_env())
                ),
            )
        payload = {
            "transaction_details": {
                "order_id": order["order_number"],
                "gross_amount": int(order["total"]),
            },
            "item_details": [
                {
                    "id": item.get("variant_id") or item["product_id"],
                    "price": int(item["unit_price"]),
                    "quantity": int(item["quantity"]),
                    "name": str(item["product_name"])[:50],
                }
                for item in order["items"]
            ]
            + (
                [{"id": "shipping", "price": int(order["shipping_cost"]), "quantity": 1, "name": "Pengiriman"}]
                if int(order.get("shipping_cost") or 0) > 0
                else []
            ),
            "customer_details": {
                "first_name": order["customer"]["name"][:100],
                "email": order["customer"]["email"],
                "phone": order["customer"]["phone"],
            },
        }
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    f"{self._base()}/snap/v1/transactions",
                    auth=(os.environ["MIDTRANS_SERVER_KEY"], ""),
                    headers={"Accept": "application/json"},
                    json=payload,
                )
            if response.status_code not in (200, 201):
                return PaymentSession(
                    configured=True,
                    provider=self.name,
                    error_code=str(response.status_code),
                    error_message="Midtrans menolak pembuatan transaksi.",
                )
            data = response.json()
            return PaymentSession(
                configured=True,
                provider=self.name,
                reference=order["order_number"],
                redirect_url=data.get("redirect_url"),
                token=data.get("token"),
            )
        except httpx.HTTPError:
            logger.warning("Midtrans transport error while creating a Snap transaction")
            return PaymentSession(
                configured=True,
                provider=self.name,
                error_code="TRANSPORT_ERROR",
                error_message="Gagal menghubungi Midtrans.",
            )

    def verify_notification(self, payload: Dict[str, Any]) -> bool:
        server_key = os.environ.get("MIDTRANS_SERVER_KEY", "")
        if not server_key:
            return False
        required = ("order_id", "status_code", "gross_amount", "signature_key")
        if any(payload.get(key) is None for key in required):
            return False
        raw = (
            f"{payload['order_id']}{payload['status_code']}{payload['gross_amount']}{server_key}"
        ).encode()
        expected = hashlib.sha512(raw).hexdigest()
        return hmac.compare_digest(expected, str(payload["signature_key"]))

    async def fetch_status(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Authoritative status check via the official Midtrans Status API.

        A frontend redirect is never trusted: the payment state is always read
        back from the provider (or received through the verified webhook).
        """
        if not self.is_configured():
            return None
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(
                    f"{self._api_base()}/v2/{order_number}/status",
                    auth=(os.environ["MIDTRANS_SERVER_KEY"], ""),
                    headers={"Accept": "application/json"},
                )
        except httpx.HTTPError:
            logger.warning("Midtrans transport error while reading transaction status")
            return None
        if response.status_code != 200:
            return None
        payload = response.json()
        if not self.verify_notification(payload):
            logger.warning("Midtrans status response failed signature verification")
            return None
        return payload

    def map_status(self, payload: Dict[str, Any]) -> str:
        status = str(payload.get("transaction_status") or "").lower()
        fraud = str(payload.get("fraud_status") or "").lower()
        if status == "settlement":
            return "PAID"
        if status == "capture":
            return "PAID" if fraud in {"", "accept"} else "FAILED"
        if status in {"pending", "authorize"}:
            return "PENDING"
        if status == "expire":
            return "EXPIRED"
        if status in {"deny", "cancel", "failure"}:
            return "FAILED"
        if status in {"refund", "partial_refund", "chargeback"}:
            return "REFUNDED"
        return "PENDING"


_PROVIDERS = {MidtransProvider.name: MidtransProvider()}


def active_provider() -> PaymentProvider:
    return _PROVIDERS[os.environ.get("PAYMENT_PROVIDER", MidtransProvider.name).upper()]


def provider_status() -> Dict[str, Any]:
    provider = active_provider()
    return {
        "provider": provider.name,
        "label": provider.label,
        "configured": provider.is_configured(),
        "status": "CONFIGURED" if provider.is_configured() else "PAYMENT_NOT_CONFIGURED",
        "missing_env": provider.missing_env(),
        "environment": "production" if MidtransProvider._production() else "sandbox",
    }
