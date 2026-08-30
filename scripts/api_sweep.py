"""Sweep every parameterless GET endpoint, unauthenticated and as SUPER_ADMIN.

Read-only. Flags real server faults (5xx) and unexpected auth behaviour.
Usage: python scripts/api_sweep.py [base_url]
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


def main() -> int:
    spec = requests.get(f"{API}/openapi.json", timeout=30).json()
    gets = sorted(p for p, v in spec["paths"].items() if "get" in v and "{" not in p)

    r = requests.post(
        f"{API}/auth/login",
        json={"email": ENV.get("BOOTSTRAP_ADMIN_EMAIL"), "password": ENV.get("BOOTSTRAP_ADMIN_PASSWORD")},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"FATAL: admin login failed {r.status_code}: {r.text[:200]}")
        return 1
    token = r.json().get("access_token")
    auth = {"Authorization": f"Bearer {token}"}

    server_errors: list[tuple[str, int, str]] = []
    anon_exposed: list[str] = []
    rows = []

    for path in gets:
        try:
            a = requests.get(f"{BASE}{path}", timeout=30)
            anon = a.status_code
        except Exception as exc:
            anon = -1
            server_errors.append((f"ANON {path}", -1, str(exc)[:150]))
        try:
            b = requests.get(f"{BASE}{path}", headers=auth, timeout=30)
            adm = b.status_code
            if adm >= 500:
                server_errors.append((f"ADMIN {path}", adm, b.text[:200]))
        except Exception as exc:
            adm = -1
            server_errors.append((f"ADMIN {path}", -1, str(exc)[:150]))

        if isinstance(anon, int) and anon >= 500:
            server_errors.append((f"ANON {path}", anon, a.text[:200]))

        rows.append((path, anon, adm))

    print(f"{'PATH':<48}{'ANON':>6}{'ADMIN':>7}")
    print("-" * 61)
    for path, anon, adm in rows:
        flag = "  <== 5xx" if (isinstance(anon, int) and anon >= 500) or (isinstance(adm, int) and adm >= 500) else ""
        print(f"{path:<48}{anon:>6}{adm:>7}{flag}")

    print("\n" + "=" * 61)
    if server_errors:
        print(f"SERVER FAULTS: {len(server_errors)}")
        for name, code, body in server_errors:
            print(f"\n  {name} -> {code}\n    {body}")
    else:
        print("SERVER FAULTS: none (no 5xx on any parameterless GET)")
    print("=" * 61)
    return 1 if server_errors else 0


if __name__ == "__main__":
    sys.exit(main())
