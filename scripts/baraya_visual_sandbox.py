#!/usr/bin/env python3
"""BARAYA AL SABBAT — throwaway VISUAL sandbox database.

Purpose: give the mobile screens realistic content so the UI can be validated
visually. It writes ONLY to a separate, disposable database
(`alsabbat_visual_sandbox`) and never touches the real database.

Usage:
    python3 scripts/baraya_visual_sandbox.py seed
    python3 scripts/baraya_visual_sandbox.py drop
"""
import datetime as dt
import sys
import uuid

import bcrypt
from pymongo import MongoClient

DB_NAME = "alsabbat_visual_sandbox"
MONGO_URL = "mongodb://localhost:27017"

NOW = dt.datetime.now(dt.timezone.utc)


def iso(value):
    return value.isoformat()


def uid():
    return uuid.uuid4().hex


def stamps(extra=None):
    base = {"created_at": iso(NOW), "updated_at": iso(NOW)}
    if extra:
        base.update(extra)
    return base


def seed():
    client = MongoClient(MONGO_URL)
    client.drop_database(DB_NAME)
    db = client[DB_NAME]

    club_id = uid()
    db.clubs.insert_one(
        stamps(
            {
                "id": club_id,
                "name": "ALSABBAT Football Club",
                "short_name": "ALSABBAT",
                "logo": None,
                "primary_color": "#FCCF2B",
                "secondary_color": "#012891",
                "tertiary_color": "#000000",
                "light_color": "#FEFEFE",
                "description": "Klub sepak bola kebanggaan Baraya, berdiri untuk satu semangat dan satu mimpi.",
                "location": "Bandung, Jawa Barat",
                "stadium": "Stadion Siliwangi",
                "status": "ACTIVE",
                "contact": {},
                "social_media": {},
                "seo": {},
            }
        )
    )

    team_id = uid()
    db.teams.insert_one(
        stamps({"id": team_id, "club_id": club_id, "name": "Tim Senior", "status": "ACTIVE"})
    )

    season_id = uid()
    db.seasons.insert_one(
        stamps(
            {
                "id": season_id,
                "name": "Musim 2026/2027",
                "start_date": "2026-07-01",
                "end_date": "2027-05-30",
                "status": "ACTIVE",
            }
        )
    )

    comp_id = uid()
    db.competitions.insert_one(
        stamps({"id": comp_id, "name": "Liga Askot Bandung", "season_id": season_id, "status": "ACTIVE"})
    )

    # ------------------------------------------------------------- players
    squad = [
        ("Rizky Ramadhan", 1, "GOALKEEPER"),
        ("Bagas Prakoso", 12, "GOALKEEPER"),
        ("Fajar Nugraha", 4, "DEFENDER"),
        ("Andi Setiawan", 5, "DEFENDER"),
        ("Dimas Aditya", 3, "DEFENDER"),
        ("Yoga Pratama", 8, "MIDFIELDER"),
        ("Reza Maulana", 10, "MIDFIELDER"),
        ("Ilham Saputra", 6, "MIDFIELDER"),
        ("Gilang Permana", 9, "FORWARD"),
        ("Arif Hidayat", 11, "FORWARD"),
    ]
    player_ids = []
    for index, (name, number, position) in enumerate(squad):
        pid = uid()
        player_ids.append(pid)
        db.players.insert_one(
            stamps(
                {
                    "id": pid,
                    "team_id": team_id,
                    "full_name": name,
                    "display_name": name.split()[0],
                    "photo": None,
                    "jersey_number": number,
                    "position": position,
                    "nationality": "Indonesia",
                    "height_cm": 170 + index,
                    "weight_kg": 64 + index,
                    "status": "ACTIVE",
                    "goals": max(0, 8 - index),
                    "assists": max(0, 5 - index // 2),
                    "appearances": 14 - index // 3,
                    "yellow_cards": index % 3,
                    "red_cards": 0,
                    "historical_goals": 0,
                    "historical_assists": 0,
                    "social_media": {},
                    "gallery_images": [],
                    "bio": "Pemain binaan akademi AL SABBAT dengan karakter kerja keras dan disiplin tinggi.",
                }
            )
        )

    for name, role in [
        ("Hendra Wijaya", "HEAD_COACH"),
        ("Rudi Hartono", "ASSISTANT_COACH"),
        ("Sari Andini", "PHYSIO"),
    ]:
        db.staff.insert_one(
            stamps(
                {
                    "id": uid(),
                    "team_id": team_id,
                    "name": name,
                    "role": role,
                    "role_label": role.replace("_", " ").title(),
                    "photo": None,
                    "status": "ACTIVE",
                    "social_media": {},
                    "gallery_images": [],
                }
            )
        )

    # ------------------------------------------------------------- matches
    def match_doc(days, opponent, venue_type, status, home_score=None, away_score=None, time="15:30"):
        date = (NOW + dt.timedelta(days=days)).date()
        return stamps(
            {
                "id": uid(),
                "team_id": team_id,
                "season_id": season_id,
                "competition_id": comp_id,
                "opponent": {"name": opponent, "short_name": opponent.split()[0], "logo": None},
                "date": date.isoformat(),
                "time": time,
                "venue": "Stadion Siliwangi" if venue_type == "HOME" else "Lapangan Lodaya",
                "venue_type": venue_type,
                "status": status,
                "home_score": home_score,
                "away_score": away_score,
                "match_cover": None,
                "formation": "4-3-3",
                "opponent_formation": "4-4-2",
                "referee": "Dedi Kurniawan",
                "attendance": 1200 if status == "FINISHED" else None,
                "result_summary": "Kemenangan penting di kandang." if status == "FINISHED" else None,
            }
        )

    upcoming = match_doc(3, "Persib Muda", "HOME", "SCHEDULED")
    upcoming2 = match_doc(10, "Bandung United", "AWAY", "SCHEDULED", time="16:00")
    upcoming3 = match_doc(17, "Garuda FC", "HOME", "SCHEDULED", time="15:00")
    finished = match_doc(-6, "Maung Muda", "HOME", "FINISHED", 3, 1)
    finished2 = match_doc(-13, "Cimahi Putra", "AWAY", "FINISHED", 1, 2)
    matches = [upcoming, upcoming2, upcoming3, finished, finished2]
    db.matches.insert_many(matches)

    events = [
        ("GOAL", 23, player_ids[8], "CLUB"),
        ("ASSIST", 23, player_ids[6], "CLUB"),
        ("YELLOW_CARD", 38, player_ids[3], "CLUB"),
        ("GOAL", 52, player_ids[9], "CLUB"),
        ("GOAL", 67, None, "OPPONENT"),
        ("SUBSTITUTION", 71, player_ids[5], "CLUB"),
        ("PENALTY_SCORED", 88, player_ids[8], "CLUB"),
    ]
    for order, (etype, minute, pid, side) in enumerate(events):
        db.match_events.insert_one(
            stamps(
                {
                    "id": uid(),
                    "match_id": finished["id"],
                    "team_id": team_id,
                    "side": side,
                    "type": etype,
                    "minute": minute,
                    "minute_extra": None,
                    "player_id": pid,
                    "related_player_id": None,
                    "player_name": None if pid else "Pemain Lawan",
                    "display_order": order,
                    "status": "ACTIVE",
                }
            )
        )

    # ---------------------------------------------------------------- news
    category_id = uid()
    db.categories.insert_one(
        stamps({"id": category_id, "name": "Berita Tim", "slug": "berita-tim", "status": "ACTIVE"})
    )
    author_id = uid()
    db.authors.insert_one(stamps({"id": author_id, "name": "Media AL SABBAT", "slug": "media-alsabbat"}))

    articles = [
        (
            "AL SABBAT Menang 3-1 di Laga Kandang",
            "Gol Gilang dan Arif memastikan tiga poin penting untuk AL SABBAT di hadapan Baraya.",
        ),
        (
            "Persiapan Menghadapi Persib Muda",
            "Tim melakukan sesi latihan taktik selama tiga hari menjelang laga kandang berikutnya.",
        ),
        (
            "Akademi AL SABBAT Buka Seleksi Pemain Muda",
            "Seleksi terbuka untuk usia 13-17 tahun akan digelar akhir bulan ini di Stadion Siliwangi.",
        ),
        (
            "Baraya AL SABBAT Resmi Hadir",
            "Aplikasi mobile resmi untuk komunitas AL SABBAT kini bisa diakses oleh seluruh Baraya.",
        ),
        (
            "Kerja Sama Baru dengan Mitra Lokal",
            "Klub mengumumkan kemitraan strategis untuk mendukung pengembangan tim musim ini.",
        ),
    ]
    for index, (title, excerpt) in enumerate(articles):
        db.posts.insert_one(
            stamps(
                {
                    "id": uid(),
                    "title": title,
                    "slug": title.lower().replace(" ", "-").replace(",", "").replace("--", "-"),
                    "thumbnail": None,
                    "excerpt": excerpt,
                    "content": (
                        f"{excerpt}\n\nLaporan lengkap dari tim media AL SABBAT. "
                        "Baraya dapat mengikuti perkembangan tim melalui aplikasi Baraya AL SABBAT "
                        "setiap harinya, termasuk jadwal, hasil, dan galeri pertandingan."
                    ),
                    "category_id": category_id,
                    "author_id": author_id,
                    "tag_ids": [],
                    "status": "PUBLISHED",
                    "post_type": "MATCH_REPORT" if index == 0 else "ARTICLE",
                    "published_at": iso(NOW - dt.timedelta(days=index)),
                    "match_id": finished["id"] if index == 0 else None,
                    "seo": {},
                }
            )
        )

    # ------------------------------------------------------------- gallery
    album_id = uid()
    db.gallery_albums.insert_one(
        stamps(
            {
                "id": album_id,
                "title": "Match Day vs Maung Muda",
                "slug": "match-day-vs-maung-muda",
                "description": "Dokumentasi lengkap laga kandang AL SABBAT melawan Maung Muda.",
                "cover_url": None,
                "match_id": finished["id"],
                "team_id": team_id,
                "date": (NOW - dt.timedelta(days=6)).date().isoformat(),
                "status": "ACTIVE",
                "publish_status": "PUBLISHED",
                "published_at": iso(NOW - dt.timedelta(days=5)),
                "display_order": 0,
                "media_count": 6,
            }
        )
    )
    album2 = uid()
    db.gallery_albums.insert_one(
        stamps(
            {
                "id": album2,
                "title": "Sesi Latihan Pekan Ini",
                "slug": "sesi-latihan-pekan-ini",
                "description": "Persiapan tim menjelang laga berikutnya.",
                "cover_url": None,
                "team_id": team_id,
                "date": (NOW - dt.timedelta(days=2)).date().isoformat(),
                "status": "ACTIVE",
                "publish_status": "PUBLISHED",
                "published_at": iso(NOW - dt.timedelta(days=2)),
                "display_order": 1,
                "media_count": 3,
            }
        )
    )
    for index in range(6):
        db.media.insert_one(
            stamps(
                {
                    "id": uid(),
                    "file_name": f"matchday-{index + 1}.jpg",
                    "file_type": "IMAGE",
                    "mime_type": "image/jpeg",
                    "file_size": 240000,
                    "url": None,
                    "storage_provider": "EXTERNAL",
                    "thumbnail_url": None,
                    "album_id": album_id,
                    "match_id": finished["id"],
                    "caption": f"Momen ke-{index + 1} laga kandang",
                    "display_order": index,
                    "status": "ACTIVE",
                }
            )
        )

    # --------------------------------------------------------- merchandise
    for name, price in [("Jersey Home 2026", 285000), ("Syal Baraya", 95000), ("Topi AL SABBAT", 120000)]:
        db.products.insert_one(
            stamps(
                {
                    "id": uid(),
                    "name": name,
                    "slug": name.lower().replace(" ", "-"),
                    "short_description": "Merchandise resmi AL SABBAT Football Club.",
                    "status": "ACTIVE",
                    "price": price,
                    "currency": "IDR",
                    "stock_quantity": 25,
                    "media_ids": [],
                    "display_order": 0,
                }
            )
        )

    # ---------------------------------------------- customer (role PEMAIN)
    customer_id = uid()
    db.customers.insert_one(
        stamps(
            {
                "id": customer_id,
                "email": "visual.pemain@sandbox-alsabbat.dev",
                "full_name": "Baraya Visual",
                "phone": "081200000000",
                "password_hash": bcrypt.hashpw(b"Sandbox123", bcrypt.gensalt(rounds=12)).decode(),
                "status": "ACTIVE",
                "member_number": "ALS-0001",
                "member_code": "ALSVIS0001",
                "photo_url": None,
                "joined_at": iso(NOW - dt.timedelta(days=30)),
                "role": "PEMAIN",
                "roles": ["MEMBER", "PEMAIN"],
                "email_verified": True,
                "auth_provider": "PASSWORD",
                "player_id": player_ids[8],
            }
        )
    )
    for index, (title, message) in enumerate(
        [
            ("Pengajuan Pemain disetujui", "Selamat! Akun Anda kini berstatus Pemain AL SABBAT."),
            ("Jadwal latihan diperbarui", "Latihan pekan ini dipindah ke hari Kamis pukul 16.00 WIB."),
            ("Album baru dipublikasikan", "Album Match Day vs Maung Muda sudah bisa dilihat di menu Media."),
        ]
    ):
        db.notifications.insert_one(
            stamps(
                {
                    "id": uid(),
                    "audience": "CUSTOMER",
                    "recipient_id": customer_id,
                    "type": "INFO",
                    "title": title,
                    "message": message,
                    "link": None,
                    "read": index > 1,
                    "read_at": None,
                }
            )
        )

    print(f"seeded sandbox db `{DB_NAME}`")
    print(f"  matches={db.matches.count_documents({})} players={db.players.count_documents({})} "
          f"posts={db.posts.count_documents({})} albums={db.gallery_albums.count_documents({})}")
    print("  customer: visual.pemain@sandbox-alsabbat.dev / Sandbox123 (role PEMAIN)")
    client.close()


def drop():
    client = MongoClient(MONGO_URL)
    client.drop_database(DB_NAME)
    print(f"dropped sandbox db `{DB_NAME}`")
    client.close()


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "seed"
    if command == "drop":
        drop()
    else:
        seed()
