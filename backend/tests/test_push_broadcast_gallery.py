"""Backend tests: push registration, broadcast → push chain, gallery regression.

Focus: verify Broadcast Admin actually triggers Expo push path and reports
truthfully; push token endpoints work; gallery endpoints still gated.
"""
from __future__ import annotations

import os
import re
import subprocess
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://feature-complete-app-13.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@alsabbat.com"
ADMIN_PASSWORD = "Alsabbat2026!"

BACKEND_LOG = "/var/log/supervisor/backend.out.log"


# ---------- helpers ----------
def _read_log_tail(lines: int = 400) -> str:
    try:
        out = subprocess.run(
            ["tail", "-n", str(lines), BACKEND_LOG],
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout + out.stderr
    except Exception as exc:  # pragma: no cover
        return f"__log_read_failed__: {exc}"


def _extract_otp(email: str) -> str | None:
    # Grep last otp.debug_code for this email
    log = _read_log_tail(2000)
    # otp.debug_code purpose=REGISTER email=... code=123456
    pattern = re.compile(
        r"otp\.debug_code[^\n]*email=" + re.escape(email) + r"[^\n]*code=(\d{4,8})"
    )
    matches = pattern.findall(log)
    if matches:
        return matches[-1]
    # Alternative order (code before email)
    pattern2 = re.compile(
        r"otp\.debug_code[^\n]*code=(\d{4,8})[^\n]*email=" + re.escape(email)
    )
    matches = pattern2.findall(log)
    return matches[-1] if matches else None


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_token() -> str:
    r = requests.post(f"{API}/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
    }, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"no token: {data}"
    return token


@pytest.fixture(scope="session")
def baraya_account() -> dict:
    """Register a Baraya, verify via OTP-from-logs, return access_token + email + id."""
    email = f"push-test-{uuid.uuid4().hex[:10]}@sandbox-alsabbat.dev"
    password = "Sandbox123"
    full_name = "Push Test Baraya"

    reg = requests.post(f"{API}/baraya/register", json={
        "email": email,
        "password": password,
        "password_confirmation": password,
        "full_name": full_name,
        "phone": "081234567890",
        "accepted_terms": True,
    }, timeout=15)
    assert reg.status_code in (200, 201), f"register failed: {reg.status_code} {reg.text}"
    body = reg.json()
    assert body.get("verification_required") is True

    # Give logger a beat
    time.sleep(0.5)
    otp = None
    for _ in range(6):
        otp = _extract_otp(email)
        if otp:
            break
        time.sleep(0.5)
    assert otp, f"OTP not found in backend log for {email}"

    verify = requests.post(f"{API}/baraya/otp/verify", json={
        "email": email, "code": otp,
    }, timeout=15)
    assert verify.status_code == 200, f"verify failed: {verify.status_code} {verify.text}"
    session = verify.json()
    token = session.get("access_token")
    assert token, f"no access_token in verify response: {session}"
    customer = session.get("customer") or {}
    return {
        "email": email,
        "password": password,
        "access_token": token,
        "customer_id": customer.get("id"),
        "customer": customer,
    }


@pytest.fixture(scope="session")
def baraya_headers(baraya_account) -> dict:
    return {"Authorization": f"Bearer {baraya_account['access_token']}"}


@pytest.fixture(scope="session")
def admin_headers(admin_token) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- 1. health / auth basics ----------
def test_admin_login_ok(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 10


def test_baraya_account_created(baraya_account):
    assert baraya_account["customer_id"]
    assert baraya_account["customer"].get("email") == baraya_account["email"]


# ---------- 2. push register/unregister ----------
def test_push_register_invalid_token_rejected(baraya_headers):
    r = requests.post(
        f"{API}/baraya/push/register",
        headers=baraya_headers,
        json={"token": "abc123", "platform": "android"},
        timeout=15,
    )
    # Pydantic min_length is 10 → 422; if it passes model it hits is_expo_token check → 400/422
    assert r.status_code in (400, 422), f"unexpected status: {r.status_code} {r.text}"


def test_push_register_invalid_shape_rejected(baraya_headers):
    # >=10 chars but not Expo shape → should hit ValidationFailedError in handler
    r = requests.post(
        f"{API}/baraya/push/register",
        headers=baraya_headers,
        json={"token": "not-an-expo-token-string", "platform": "android"},
        timeout=15,
    )
    assert r.status_code in (400, 422), f"unexpected status: {r.status_code} {r.text}"
    body = r.text.lower()
    assert "expo" in body or "valid" in body or "token" in body


@pytest.fixture(scope="session")
def fake_expo_token() -> str:
    return f"ExponentPushToken[TEST-{uuid.uuid4().hex[:20]}]"


def test_push_register_valid_token(baraya_headers, fake_expo_token):
    r = requests.post(
        f"{API}/baraya/push/register",
        headers=baraya_headers,
        json={
            "token": fake_expo_token,
            "platform": "android",
            "device_id": "test-device-1",
            "app_version": "1.0.0",
        },
        timeout=15,
    )
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("success") is True
    assert body.get("device_id")
    assert body.get("platform") == "android"


def test_push_register_idempotent(baraya_headers, fake_expo_token):
    # Same token again → should still succeed (idempotent update)
    r = requests.post(
        f"{API}/baraya/push/register",
        headers=baraya_headers,
        json={"token": fake_expo_token, "platform": "android"},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json().get("success") is True


def test_push_unregister_removes_token(baraya_headers, fake_expo_token):
    r = requests.post(
        f"{API}/baraya/push/unregister",
        headers=baraya_headers,
        json={"token": fake_expo_token},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("success") is True
    assert body.get("removed") is True


def test_push_unregister_idempotent(baraya_headers, fake_expo_token):
    # Second unregister → success=True, removed=False, no error
    r = requests.post(
        f"{API}/baraya/push/unregister",
        headers=baraya_headers,
        json={"token": fake_expo_token},
        timeout=15,
    )
    assert r.status_code == 200
    body = r.json()
    assert body.get("success") is True
    assert body.get("removed") is False


# ---------- 3. broadcast SEND_NOW without devices ----------
def test_broadcast_send_now_without_devices(admin_headers, baraya_account):
    """Broadcast to MEMBERS_ONLY (includes our new Baraya) - no push device
    registered → recipient_count>0, notifications created, push reason=NO_DEVICE,
    push_delivered=false, status SENT."""
    title = f"TEST No-Device Broadcast {uuid.uuid4().hex[:6]}"
    payload = {
        "title": title,
        "message": "Verifikasi jalur push tanpa device terdaftar.",
        "recipient_group": "MEMBERS_ONLY",
        "delivery_type": "SEND_NOW",
    }
    r = requests.post(f"{API}/broadcasts", headers=admin_headers, json=payload, timeout=30)
    assert r.status_code == 201, f"broadcast create failed: {r.status_code} {r.text}"
    doc = r.json()
    assert doc.get("status") == "SENT", f"status not SENT: {doc}"
    assert doc.get("recipient_count", 0) >= 1, f"expected recipient_count>=1: {doc}"
    assert doc.get("notification_count", 0) >= 1, f"expected notification_count>=1: {doc}"
    assert doc.get("push_delivered") is False

    # Log check
    time.sleep(0.5)
    log = _read_log_tail(600)
    assert f"broadcast.delivered id={doc['id']}" in log, (
        "broadcast.delivered log line missing for id " + doc["id"]
    )
    # reason should be NO_DEVICE
    delivered_line = next(
        (ln for ln in log.splitlines() if f"broadcast.delivered id={doc['id']}" in ln),
        "",
    )
    assert "reason=NO_DEVICE" in delivered_line or "devices=0" in delivered_line, (
        f"expected NO_DEVICE / devices=0 in log line: {delivered_line}"
    )

    # Baraya should now see this notification
    n = requests.get(
        f"{API}/baraya/notifications",
        headers={"Authorization": f"Bearer {baraya_account['access_token']}"},
        timeout=15,
    )
    assert n.status_code == 200, n.text
    items = n.json().get("items", [])
    titles = [item.get("title") for item in items]
    assert title in titles, f"broadcast title not found in customer notifications: {titles[:5]}"


# ---------- 4. broadcast SEND_NOW WITH a (fake) Expo device ----------
def test_broadcast_send_now_with_fake_device(admin_headers, baraya_headers, baraya_account):
    """Register a fake Expo token, send broadcast. Expo will reject the token
    (push.bulk_rejected) but backend must not crash; push_delivered=false,
    status SENT, notification created (idempotent)."""
    token = f"ExponentPushToken[FAKE-{uuid.uuid4().hex[:20]}]"
    reg = requests.post(
        f"{API}/baraya/push/register",
        headers=baraya_headers,
        json={"token": token, "platform": "android"},
        timeout=15,
    )
    assert reg.status_code == 200, reg.text

    title = f"TEST With-Device Broadcast {uuid.uuid4().hex[:6]}"
    payload = {
        "title": title,
        "message": "Verifikasi jalur push dengan token Expo fiktif.",
        "recipient_group": "MEMBERS_ONLY",
        "delivery_type": "SEND_NOW",
    }
    r = requests.post(f"{API}/broadcasts", headers=admin_headers, json=payload, timeout=30)
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc.get("status") == "SENT"
    assert doc.get("recipient_count", 0) >= 1
    assert doc.get("notification_count", 0) >= 1
    assert doc.get("push_delivered") is False  # fake token → rejected by Expo

    time.sleep(0.5)
    log = _read_log_tail(800)
    delivered_line = next(
        (ln for ln in log.splitlines() if f"broadcast.delivered id={doc['id']}" in ln),
        "",
    )
    assert delivered_line, "no broadcast.delivered log line"
    # devices should be >=1 in this case
    assert "devices=1" in delivered_line or re.search(r"devices=[1-9]", delivered_line), (
        f"expected devices>=1: {delivered_line}"
    )
    # Expo rejection logging present somewhere in tail
    assert (
        "push.bulk_rejected" in log
        or "push.bulk_send_failed" in log
        or "push.rejected" in log
    ), "expected push.bulk_rejected/push.bulk_send_failed diagnostic in logs"

    # Cleanup token
    requests.post(
        f"{API}/baraya/push/unregister",
        headers=baraya_headers,
        json={"token": token},
        timeout=15,
    )


# ---------- 5. broadcast in-app idempotency ----------
def test_broadcast_notifications_idempotent(admin_headers, baraya_account):
    """Same broadcast reprocessed via /process-due must not create duplicate
    customer notifications (upsert-by (recipient, broadcast))."""
    title = f"TEST Idempotent {uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/broadcasts", headers=admin_headers, json={
        "title": title,
        "message": "Cek idempotensi",
        "recipient_group": "MEMBERS_ONLY",
        "delivery_type": "SEND_NOW",
    }, timeout=30)
    assert r.status_code == 201
    doc = r.json()

    # baseline count in notifications
    n1 = requests.get(
        f"{API}/baraya/notifications?limit=100",
        headers={"Authorization": f"Bearer {baraya_account['access_token']}"},
        timeout=15,
    ).json()
    count1 = sum(1 for i in n1.get("items", []) if i.get("title") == title)
    assert count1 == 1, f"expected 1 notification for {title}, got {count1}"

    # Re-trigger process-due (should be a no-op for SENT broadcast)
    requests.post(f"{API}/broadcasts/process-due", headers=admin_headers, timeout=15)

    n2 = requests.get(
        f"{API}/baraya/notifications?limit=100",
        headers={"Authorization": f"Bearer {baraya_account['access_token']}"},
        timeout=15,
    ).json()
    count2 = sum(1 for i in n2.get("items", []) if i.get("title") == title)
    assert count2 == 1, f"duplicate broadcast notifications after re-process: {count2}"


# ---------- 6. gallery regression ----------
def test_gallery_public_albums_requires_role():
    r = requests.get(f"{API}/gallery/public/albums", timeout=15)
    assert r.status_code == 403, f"expected 403 for anon: {r.status_code} {r.text[:200]}"


def test_gallery_public_albums_blocked_for_plain_member(baraya_headers):
    r = requests.get(f"{API}/gallery/public/albums", headers=baraya_headers, timeout=15)
    assert r.status_code == 403, f"expected 403 for MEMBER: {r.status_code} {r.text[:200]}"


def test_gallery_drive_photos_structure_or_not_found(admin_headers):
    """Try to inspect any album via ADMIN endpoint (uses same drive service).
    Accept NOT_CONFIGURED / NOT_FOUND / status_code cases as valid (per user note)."""
    # Try admin album list to find any album id
    a = requests.get(f"{API}/gallery/albums", headers=admin_headers, timeout=15)
    if a.status_code != 200:
        pytest.skip(f"admin album list unavailable: {a.status_code}")
    items = (a.json() or {}).get("items", [])
    if not items:
        pytest.skip("no albums in preview DB to test drive-photos structure")
    album_id = items[0]["id"]
    r = requests.get(
        f"{API}/gallery/albums/{album_id}/drive-photos",
        headers=admin_headers, timeout=20,
    )
    # Expected structure regardless of NOT_CONFIGURED
    assert r.status_code == 200, r.text
    body = r.json()
    assert "status" in body, f"missing status: {body}"
    # If items returned, total should match
    if isinstance(body.get("items"), list) and body.get("total") is not None:
        assert body["total"] == len(body["items"]), (
            f"total {body['total']} != len(items) {len(body['items'])}"
        )
