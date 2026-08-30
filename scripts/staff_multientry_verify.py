"""Verifikasi Staff multi-entry (bagian, jabatan, foto per entry) — self-cleaning.

Menguji 17 poin validasi yang diminta user pada backend LOKAL:
  - master Bagian/Jabatan di /api/meta
  - Admin: Staff Entry dari Pemain terdaftar, bagian/jabatan/foto sendiri
  - Pemain sama → banyak Staff Entry, foto berbeda, tidak menimpa foto Pemain
  - Data Staff lama (hanya `role`) tetap tampil & tidak berubah saat di-PATCH
  - Akun Pemain: banyak pengajuan Staf, status masing-masing, approval independen
  - Approval otomatis membuat Staff Entry baru (bagian/jabatan/foto/tim/pemain)

Semua fixture dihapus kembali di akhir (termasuk saat gagal).
Jalankan: python scripts/staff_multientry_verify.py
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import uuid

import requests

BASE = os.environ.get("VERIFY_API_BASE", "http://localhost:8001/api")
ADMIN_EMAIL = os.environ.get("VERIFY_ADMIN_EMAIL", "admin@alsabbat.com")
ADMIN_PASSWORD = os.environ.get("VERIFY_ADMIN_PASSWORD", "Alsabbat2026!")
LOG_PATH = "/var/log/supervisor/backend.out.log"

PASS = 0
FAIL = 0
CLEANUP: list[tuple[str, str]] = []  # (endpoint, id)


def check(label: str, condition: bool, detail: str = "") -> None:
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS  {label}")
    else:
        FAIL += 1
        print(f"  FAIL  {label} {detail}")


def admin_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def otp_code_from_log(email: str) -> str | None:
    try:
        out = subprocess.run(
            ["grep", "otp.debug_code", LOG_PATH], capture_output=True, text=True, check=False
        ).stdout
    except Exception:
        return None
    codes = re.findall(rf"email={re.escape(email)} purpose=\w+ code=(\d{{6}})", out)
    return codes[-1] if codes else None


def main() -> int:
    suffix = uuid.uuid4().hex[:8]
    print("== 1. Master Bagian & Jabatan (/api/meta)")
    meta = requests.get(f"{BASE}/meta", timeout=20).json()
    departments = meta.get("staff_departments") or []
    labels = [d["label"] for d in departments]
    check("6 bagian tersedia", len(departments) == 6, labels)
    check(
        "nama bagian sesuai master",
        labels
        == [
            "Manajemen & Direksi",
            "Tim Teknis",
            "Medis",
            "Media, Sosial & Marketing",
            "IT & Developer",
            "Operasional & Pendukung",
        ],
        labels,
    )
    by_label = {d["label"]: d["positions"] for d in departments}
    check("Bendahara ada di Manajemen & Direksi", "Bendahara" in by_label.get("Manajemen & Direksi", []))
    check(
        "Social Media Manager ada di Media, Sosial & Marketing",
        "Social Media Manager" in by_label.get("Media, Sosial & Marketing", []),
    )
    check(
        "Full Stack Developer ada di IT & Developer",
        "Full Stack Developer" in by_label.get("IT & Developer", []),
    )
    check("jabatan tidak tercampur antar bagian", "Bendahara" not in by_label.get("IT & Developer", []))

    print("== 2. Login admin")
    res = requests.post(
        f"{BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    check("admin login 200", res.status_code == 200, res.text[:120])
    if res.status_code != 200:
        return 1
    token = res.json()["access_token"]
    head = admin_headers(token)

    print("== 3. Fixture tim + pemain")
    club_id = requests.get(f"{BASE}/club", timeout=20).json()["items"][0]["id"]
    team = requests.post(
        f"{BASE}/teams",
        headers=head,
        json={"club_id": club_id, "name": f"Uji Staff {suffix}", "category": "FIRST_TEAM"},
        timeout=20,
    ).json()
    CLEANUP.append(("/teams", team["id"]))
    player = requests.post(
        f"{BASE}/players",
        headers=head,
        json={
            "team_id": team["id"],
            "full_name": f"Pemain Uji {suffix}",
            "display_name": f"PEMAIN {suffix}",
            "jersey_number": 77,
            "position": "MIDFIELDER",
            "photo": "/api/media/files/image/uji/foto-pemain.jpg",
        },
        timeout=20,
    ).json()
    CLEANUP.append(("/players", player["id"]))
    check("pemain fixture dibuat", bool(player.get("id")), player)
    player_snapshot = requests.get(f"{BASE}/players/{player['id']}", timeout=20).json()

    print("== 4. Staff Entry dari pemain terdaftar (3 entry, foto berbeda)")
    entries = []
    plan = [
        ("Media, Sosial & Marketing", "Social Media Manager", "/api/media/files/image/uji/foto-A1.jpg", "OTHER"),
        ("Manajemen & Direksi", "Bendahara", "/api/media/files/image/uji/foto-A2.jpg", "OTHER"),
        ("IT & Developer", "Full Stack Developer", "/api/media/files/image/uji/foto-A3.jpg", "OTHER"),
        ("Tim Teknis", "Pelatih Kepala", "/api/media/files/image/uji/foto-A4.jpg", "HEAD_COACH"),
    ]
    for department, position, photo, expected_role in plan:
        created = requests.post(
            f"{BASE}/staff",
            headers=head,
            json={
                "team_id": team["id"],
                "name": player["display_name"],
                "player_id": player["id"],
                "department": department,
                "position_title": position,
                "photo": photo,
                "status": "ACTIVE",
            },
            timeout=20,
        )
        check(f"buat Staff Entry {position} → 201", created.status_code == 201, created.text[:160])
        if created.status_code != 201:
            return 1
        doc = created.json()
        CLEANUP.append(("/staff", doc["id"]))
        entries.append(doc)
        check(f"{position}: bagian & jabatan tersimpan", doc["department"] == department and doc["position_title"] == position, doc)
        check(f"{position}: role lama dimap otomatis ({expected_role})", doc["role"] == expected_role, doc["role"])
        check(f"{position}: foto entry tersimpan", doc["photo"] == photo, doc.get("photo"))
        check(f"{position}: tertaut ke pemain yang sama", doc["player_id"] == player["id"], doc.get("player_id"))

    check("pemain sama → 4 Staff Entry berbeda", len({e["id"] for e in entries}) == 4)
    check("foto tiap entry berbeda", len({e["photo"] for e in entries}) == 4)

    print("== 5. Data Pemain tidak berubah")
    after = requests.get(f"{BASE}/players/{player['id']}", timeout=20).json()
    check("foto Pemain tidak tertimpa", after["photo"] == player_snapshot["photo"], after.get("photo"))
    check("status Pemain tidak berubah", after["status"] == player_snapshot["status"])
    check(
        "seluruh field Pemain identik",
        {k: v for k, v in after.items() if k != "updated_at"}
        == {k: v for k, v in player_snapshot.items() if k != "updated_at"},
    )

    print("== 6. Status per entry independen")
    patched = requests.patch(
        f"{BASE}/staff/{entries[0]['id']}", headers=head, json={"status": "INACTIVE"}, timeout=20
    )
    check("ubah status entry #1 → 200", patched.status_code == 200, patched.text[:120])
    others = [requests.get(f"{BASE}/staff/{e['id']}", timeout=20).json() for e in entries[1:]]
    check("status entry lain tetap ACTIVE", all(o["status"] == "ACTIVE" for o in others))
    requests.patch(f"{BASE}/staff/{entries[0]['id']}", headers=head, json={"status": "ACTIVE"}, timeout=20)

    print("== 7. Validasi bagian/jabatan")
    bad = requests.post(
        f"{BASE}/staff",
        headers=head,
        json={"team_id": team["id"], "name": "Salah Pasang", "department": "IT & Developer", "position_title": "Bendahara"},
        timeout=20,
    )
    check("jabatan di luar bagian ditolak (422)", bad.status_code == 422, bad.status_code)
    bad2 = requests.post(
        f"{BASE}/staff",
        headers=head,
        json={"team_id": team["id"], "name": "Bagian Ngawur", "department": "Ngawur"},
        timeout=20,
    )
    check("bagian tidak dikenal ditolak (422)", bad2.status_code == 422, bad2.status_code)

    print("== 8. Kompatibilitas data Staff lama (tanpa bagian/jabatan)")
    legacy = requests.post(
        f"{BASE}/staff",
        headers=head,
        json={
            "team_id": team["id"],
            "name": f"Staf Lama {suffix}",
            "role": "TEAM_MANAGER",
            "role_label": "Manajer Tim",
            "photo": "/api/media/files/image/uji/foto-lama.jpg",
        },
        timeout=20,
    )
    check("staf gaya lama tetap bisa dibuat", legacy.status_code == 201, legacy.text[:160])
    legacy_doc = legacy.json()
    CLEANUP.append(("/staff", legacy_doc["id"]))
    check("role & role_label lama utuh", legacy_doc["role"] == "TEAM_MANAGER" and legacy_doc["role_label"] == "Manajer Tim")
    check("bagian/jabatan kosong (bukan error)", legacy_doc["department"] is None and legacy_doc["position_title"] is None)
    edited = requests.patch(
        f"{BASE}/staff/{legacy_doc['id']}", headers=head, json={"name": f"Staf Lama {suffix} B"}, timeout=20
    ).json()
    check("PATCH nama saja tidak mengubah role lama", edited["role"] == "TEAM_MANAGER", edited.get("role"))
    listing = requests.get(f"{BASE}/staff", params={"limit": 100}, timeout=20).json()
    ids = {item["id"] for item in listing["items"]}
    check("data lama & baru sama-sama tampil di list", legacy_doc["id"] in ids and entries[0]["id"] in ids)
    filtered = requests.get(
        f"{BASE}/staff", params={"department": "IT & Developer", "limit": 100}, timeout=20
    ).json()
    check("filter per bagian bekerja", all(i["department"] == "IT & Developer" for i in filtered["items"]) and filtered["total"] >= 1)

    print("== 9. Akun Pemain: banyak pengajuan Staf")
    email = f"staffuji.{suffix}@sandbox-alsabbat.dev"
    password = "Sandbox123"
    reg = requests.post(
        f"{BASE}/baraya/register",
        json={
            "email": email,
            "full_name": f"Baraya Uji {suffix}",
            "phone": "081234567890",
            "password": password,
            "password_confirmation": password,
        },
        timeout=20,
    )
    check("register Baraya 201", reg.status_code == 201, reg.text[:160])
    code = otp_code_from_log(email)
    check("kode OTP terbaca dari log", bool(code), "tidak ditemukan")
    if not code:
        return 1
    verified = requests.post(
        f"{BASE}/baraya/otp/verify", json={"email": email, "code": code}, timeout=20
    )
    check("verifikasi OTP 200", verified.status_code == 200, verified.text[:160])
    customer_token = verified.json()["access_token"]
    customer_id = verified.json()["customer"]["id"]
    CLEANUP.append(("__customer__", customer_id))
    cust_head = {"Authorization": f"Bearer {customer_token}"}

    # Naikkan ke PEMAIN memakai endpoint admin existing (tautkan ke pemain fixture).
    role_res = requests.patch(
        f"{BASE}/baraya/admin/{customer_id}/role",
        headers=head,
        json={"role": "PEMAIN", "player_id": player["id"]},
        timeout=20,
    )
    check("akun dinaikkan menjadi PEMAIN", role_res.status_code == 200, role_res.text[:160])

    access = requests.get(f"{BASE}/baraya/access", headers=cust_head, timeout=20).json()
    check("can_apply_staff true untuk Pemain", access.get("can_apply_staff") is True, access)

    applications = []
    apply_plan = [
        ("Media, Sosial & Marketing", "Social Media Manager", "/api/media/files/image/uji/ajuan-1.jpg"),
        ("Manajemen & Direksi", "Bendahara", "/api/media/files/image/uji/ajuan-2.jpg"),
        ("IT & Developer", "Full Stack Developer", "/api/media/files/image/uji/ajuan-3.jpg"),
    ]
    for department, position, photo in apply_plan:
        res_app = requests.post(
            f"{BASE}/baraya/applications",
            headers=cust_head,
            json={
                "type": "STAFF",
                "full_name": f"Baraya Uji {suffix}",
                "phone": "081234567890",
                "motivation": "Ingin membantu klub pada bagian ini.",
                "staff_data": {
                    "name": f"Baraya Uji {suffix}",
                    "department": department,
                    "position_title": position,
                    "photo": photo,
                },
            },
            timeout=20,
        )
        check(f"pengajuan Staf {position} → 201", res_app.status_code == 201, res_app.text[:200])
        if res_app.status_code == 201:
            applications.append(res_app.json())

    check("3 pengajuan Staf diterima dari satu akun", len(applications) == 3)
    check("setiap pengajuan berstatus PENDING sendiri", all(a["status"] == "PENDING" for a in applications))
    check("foto tiap pengajuan terpisah", len({a["staff_data"]["photo"] for a in applications}) == 3)
    dup = requests.post(
        f"{BASE}/baraya/applications",
        headers=cust_head,
        json={
            "type": "STAFF",
            "full_name": f"Baraya Uji {suffix}",
            "phone": "081234567890",
            "motivation": "Duplikat bagian & jabatan yang sama.",
            "staff_data": {
                "name": f"Baraya Uji {suffix}",
                "department": "IT & Developer",
                "position_title": "Full Stack Developer",
                "photo": "/api/media/files/image/uji/ajuan-3b.jpg",
            },
        },
        timeout=20,
    )
    check("duplikat bagian+jabatan PENDING ditolak (409)", dup.status_code == 409, dup.status_code)

    print("== 10. Approval otomatis membuat Staff Entry")
    approve = requests.patch(
        f"{BASE}/baraya/admin/applications/{applications[0]['id']}",
        headers=head,
        json={"decision": "APPROVED", "note": "Diterima."},
        timeout=20,
    )
    check("approve tanpa memilih record → 200", approve.status_code == 200, approve.text[:200])
    approved = approve.json()
    new_staff_id = approved.get("staff_id")
    check("staff_id baru terbentuk", bool(new_staff_id), approved)
    if new_staff_id:
        CLEANUP.append(("/staff", new_staff_id))
        new_entry = requests.get(f"{BASE}/staff/{new_staff_id}", timeout=20).json()
        check(
            "entry baru memakai bagian/jabatan pengajuan",
            new_entry["department"] == "Media, Sosial & Marketing"
            and new_entry["position_title"] == "Social Media Manager",
            new_entry,
        )
        check("entry baru memakai foto pengajuan", new_entry["photo"] == apply_plan[0][2], new_entry.get("photo"))
        check("entry baru memakai tim pemain", new_entry["team_id"] == team["id"], new_entry.get("team_id"))
        check("entry baru menyimpan referensi pemain & akun", new_entry["player_id"] == player["id"] and new_entry["customer_id"] == customer_id, new_entry)
        check("role lama entry baru dimap otomatis", new_entry["role"] == "OTHER", new_entry.get("role"))

    mine = requests.get(f"{BASE}/baraya/applications/mine", headers=cust_head, timeout=20).json()
    status_map = {item["id"]: item["status"] for item in mine["items"]}
    check("approval #1 tidak mengubah pengajuan lain", status_map.get(applications[1]["id"]) == "PENDING" and status_map.get(applications[2]["id"]) == "PENDING", status_map)

    approve2 = requests.patch(
        f"{BASE}/baraya/admin/applications/{applications[1]['id']}",
        headers=head,
        json={"decision": "APPROVED"},
        timeout=20,
    )
    check("approve pengajuan kedua → 200", approve2.status_code == 200, approve2.text[:200])
    second_staff_id = approve2.json().get("staff_id")
    if second_staff_id:
        CLEANUP.append(("/staff", second_staff_id))
        second_entry = requests.get(f"{BASE}/staff/{second_staff_id}", timeout=20).json()
        check("entry kedua = bagian/jabatan berbeda", second_entry["position_title"] == "Bendahara" and second_entry["department"] == "Manajemen & Direksi", second_entry)
        check("entry kedua memakai foto berbeda", second_entry["photo"] == apply_plan[1][2], second_entry.get("photo"))
        check("entry kedua terpisah dari entry pertama", second_staff_id != new_staff_id)

    reject = requests.patch(
        f"{BASE}/baraya/admin/applications/{applications[2]['id']}",
        headers=head,
        json={"decision": "REJECTED", "note": "Belum dibutuhkan."},
        timeout=20,
    )
    check("pengajuan ketiga bisa ditolak sendiri", reject.status_code == 200 and reject.json()["status"] == "REJECTED", reject.text[:160])
    mine2 = requests.get(f"{BASE}/baraya/applications/mine", headers=cust_head, timeout=20).json()
    final_status = sorted(item["status"] for item in mine2["items"])
    check("status akhir: 2 APPROVED + 1 REJECTED", final_status == ["APPROVED", "APPROVED", "REJECTED"], final_status)

    print("== 11. Pemain & akun tetap utuh setelah semua approval")
    final_player = requests.get(f"{BASE}/players/{player['id']}", timeout=20).json()
    check("foto & data Pemain tetap sama", final_player["photo"] == player_snapshot["photo"] and final_player["full_name"] == player_snapshot["full_name"])
    check("status Pemain tetap ACTIVE", final_player["status"] == "ACTIVE")
    customers_list = requests.get(
        f"{BASE}/baraya/admin/list", headers=head, params={"limit": 100}, timeout=20
    ).json()
    matching = [c for c in customers_list["items"] if c["email"] == email]
    check("tidak ada akun duplikat", len(matching) == 1, len(matching))
    check("akun punya peran PEMAIN + STAFF", set(matching[0].get("roles") or []) == {"PEMAIN", "STAFF"}, matching[0].get("roles"))
    return 0


def cleanup(token: str | None) -> None:
    if not token:
        res = requests.post(
            f"{BASE}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=20,
        )
        token = res.json().get("access_token") if res.status_code == 200 else None
    print("== Cleanup")
    head = admin_headers(token) if token else {}
    from pymongo import MongoClient

    for endpoint, doc_id in reversed(CLEANUP):
        if endpoint == "__customer__":
            continue
        try:
            requests.delete(f"{BASE}{endpoint}/{doc_id}", headers=head, timeout=20)
        except Exception as exc:  # pragma: no cover
            print("  cleanup gagal", endpoint, doc_id, exc)
    # Akun uji + pengajuan + OTP + sesi dihapus langsung (tidak ada endpoint delete akun).
    customer_ids = [doc_id for endpoint, doc_id in CLEANUP if endpoint == "__customer__"]
    if True:
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            env = {}
            with open("/app/backend/.env", "r", encoding="utf-8") as handle:
                for line in handle:
                    if "=" in line and not line.strip().startswith("#"):
                        key, value = line.strip().split("=", 1)
                        env[key] = value.strip().strip('"')
            mongo_url = mongo_url or env.get("MONGO_URL")
            db_name = db_name or env.get("MONGODB_DB_NAME") or env.get("DB_NAME")
        client = MongoClient(mongo_url)
        db = client[db_name]
        for customer_id in customer_ids:
            doc = db["customers"].find_one({"id": customer_id})
            email = (doc or {}).get("email")
            db["customers"].delete_many({"id": customer_id})
            db["member_applications"].delete_many({"customer_id": customer_id})
            db["customer_sessions"].delete_many({"customer_id": customer_id})
            if email:
                db["otp_codes"].delete_many({"email": email})
                db["customer_otps"].delete_many({"email": email})
        # Sisa akun sandbox dari run sebelumnya + counter rate-limit uji (lokal saja).
        for doc in list(db["customers"].find({"email": {"$regex": "@sandbox-alsabbat.dev$"}})):
            db["member_applications"].delete_many({"customer_id": doc["id"]})
            db["customer_sessions"].delete_many({"customer_id": doc["id"]})
            db["customer_otps"].delete_many({"email": doc["email"]})
            db["customers"].delete_one({"id": doc["id"]})
        db["rate_limits"].delete_many(
            {"_id": {"$regex": "^(baraya-application|baraya-register|login):"}}
        )
        client.close()
    print("  fixture dibersihkan")


if __name__ == "__main__":
    code = 1
    try:
        code = main()
    finally:
        cleanup(None)
        print(f"\nHASIL: {PASS} PASS · {FAIL} FAIL")
    sys.exit(1 if FAIL or code else 0)
