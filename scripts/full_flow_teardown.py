"""Remove ONLY the records created by scripts/full_flow_check.py KEEP=1 run.

Reads /tmp/alsabbat_created.json. Touches nothing else.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import requests
from dotenv import dotenv_values

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"
ENV = dotenv_values(Path(__file__).resolve().parents[1] / "backend" / ".env")
STATE = Path("/tmp/alsabbat_created.json")


def main() -> int:
    if not STATE.exists():
        print("nothing to do: /tmp/alsabbat_created.json not found")
        return 0
    state = json.loads(STATE.read_text())
    r = requests.post(f"{API}/auth/login", json={
        "email": ENV.get("BOOTSTRAP_ADMIN_EMAIL"),
        "password": ENV.get("BOOTSTRAP_ADMIN_PASSWORD")}, timeout=30)
    if r.status_code != 200:
        print(f"login failed {r.status_code}")
        return 1
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    left = []
    for path, label in reversed(state.get("created", [])):
        d = requests.delete(f"{API}{path}", headers=h, timeout=45)
        if d.status_code in (200, 204, 404):
            print(f"  removed {label}")
        else:
            left.append((path, label, d.status_code))
            print(f"  [WARN] {label} ({path}) -> {d.status_code}")

    email = state.get("customer_email")
    if email:
        from pymongo import MongoClient
        cli = MongoClient(ENV.get("MONGO_URL", "mongodb://localhost:27017"))
        db = cli[ENV.get("MONGODB_DB_NAME", "alsabbat_platform_staging")]
        n = db["customers"].delete_many({"email": email}).deleted_count
        db["customer_sessions"].delete_many({"customer_email": email})
        print(f"  removed sandbox baraya account ({n})")

    STATE.unlink()
    print("clean" if not left else f"{len(left)} records could not be removed")
    return 1 if left else 0


if __name__ == "__main__":
    sys.exit(main())
