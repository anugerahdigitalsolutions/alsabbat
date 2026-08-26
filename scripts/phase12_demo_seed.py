"""Phase 12 demo content — THROWAWAY database only (UI preview).

Refuses to run unless the active database name contains 'verify'/'check'/'demo'.
All media URLs are public stock photos flagged with DEMO metadata; nothing is
written to the production database and nothing is left behind.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import Collections, get_db  # noqa: E402

STADIUM = [
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    "https://images.unsplash.com/photo-1434648957308-5e6a859697e8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    "https://images.unsplash.com/photo-1599158150601-1417ebbaafdd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    "https://images.pexels.com/photos/1657324/pexels-photo-1657324.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/32190714/pexels-photo-32190714.jpeg?auto=compress&cs=tinysrgb&w=1600",
]
CROWD = [
    "https://images.unsplash.com/photo-1665413811870-5b29a250f64a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    "https://images.unsplash.com/photo-1655587044257-023d0b32cd9a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    "https://images.pexels.com/photos/12074795/pexels-photo-12074795.jpeg?auto=compress&cs=tinysrgb&w=1600",
]
PLAYERS = [
    "https://images.unsplash.com/photo-1517466787929-bc90951d0974?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "https://images.unsplash.com/photo-1670489520252-91fcbaa172f2?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "https://images.pexels.com/photos/17583379/pexels-photo-17583379.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/27642308/pexels-photo-27642308.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.unsplash.com/photo-1551854386-b42759a60dd0?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
]

NAMES = [
    ("Ahmad Fauzi", "A. Fauzi", 10, "MIDFIELDER"),
    ("Rizky Pratama", "R. Pratama", 7, "FORWARD"),
    ("Bayu Nugraha", "B. Nugraha", 1, "GOALKEEPER"),
    ("Dimas Saputra", "D. Saputra", 4, "DEFENDER"),
    ("Yoga Hermawan", "Y. Hermawan", 21, "MIDFIELDER"),
    ("Fajar Ramadhan", "F. Ramadhan", 9, "FORWARD"),
    ("Iqbal Maulana", "I. Maulana", 5, "DEFENDER"),
    ("Satria Wibowo", "S. Wibowo", 8, "MIDFIELDER"),
]


async def main() -> None:
    db = get_db()
    if not any(token in db.name for token in ("verify", "check", "demo")):
        raise SystemExit(f"refusing to seed '{db.name}' — throwaway database required")

    team = await db[Collections.TEAMS].find_one({})
    team_id = team["id"] if team else "t-demo"
    club = await db[Collections.CLUBS].find_one({})
    if club:
        await db[Collections.CLUBS].update_one(
            {"id": club["id"]},
            {
                "$set": {
                    "description": (
                        "ALSABBAT Football Club adalah satu klub dengan satu skuad utama yang "
                        "berjuang untuk lambang, suporter, dan komunitasnya. Dibangun di atas "
                        "kerja keras, disiplin, dan kebersamaan di setiap matchday."
                    ),
                    "founded_date": "2019",
                    "location": "Indonesia",
                    "stadium": "ALSABBAT Stadium",
                    "social_media": {
                        "instagram": "https://instagram.com/alsabbatfc",
                        "youtube": "https://youtube.com/@alsabbatfc",
                    },
                    "contact": {"email": "info@alsabbatfc.com", "phone": "+62 812 0000 0000"},
                }
            },
        )

    await db[Collections.SEASONS].insert_one(
        {"id": "s-demo", "name": "2026/2027", "status": "ACTIVE", "start_date": "2026-01-01",
         "created_at": "2026-01-01T00:00:00Z", "demo": True}
    )
    await db[Collections.COMPETITIONS].insert_one(
        {"id": "cp-demo", "season_id": "s-demo", "name": "Liga Komunitas", "type": "LEAGUE",
         "status": "ACTIVE", "created_at": "2026-01-01T00:00:00Z", "demo": True}
    )

    await db[Collections.PLAYERS].insert_many(
        [
            {
                "id": f"p-demo-{i}", "team_id": team_id, "full_name": full, "display_name": short,
                "jersey_number": number, "position": position, "status": "ACTIVE",
                "nationality": "Indonesia", "photo": PLAYERS[i % len(PLAYERS)],
                "created_at": "2026-01-01T00:00:00Z", "demo": True,
            }
            for i, (full, short, number, position) in enumerate(NAMES)
        ]
    )

    await db[Collections.MATCHES].insert_many(
        [
            {"id": "m-demo-1", "team_id": team_id, "season_id": "s-demo", "competition_id": "cp-demo",
             "opponent": {"name": "Garuda United"}, "date": "2026-12-20", "time": "19:30",
             "venue": "ALSABBAT Stadium", "venue_type": "HOME", "status": "SCHEDULED",
             "home_score": None, "away_score": None, "formation": "4-3-3",
             "match_cover": STADIUM[0], "created_at": "2026-01-01T00:00:00Z", "demo": True},
            {"id": "m-demo-2", "team_id": team_id, "season_id": "s-demo", "competition_id": "cp-demo",
             "opponent": {"name": "Garuda United"}, "date": "2026-05-18", "time": "16:00",
             "venue": "Lapangan Garuda", "venue_type": "AWAY", "status": "FINISHED",
             "home_score": 1, "away_score": 3, "match_cover": STADIUM[1],
             "created_at": "2026-01-01T00:00:00Z", "demo": True},
            {"id": "m-demo-3", "team_id": team_id, "season_id": "s-demo", "competition_id": "cp-demo",
             "opponent": {"name": "Bintang FC"}, "date": "2026-04-12", "time": "15:30",
             "venue": "ALSABBAT Stadium", "venue_type": "HOME", "status": "FINISHED",
             "home_score": 2, "away_score": 0, "match_cover": STADIUM[5],
             "created_at": "2026-01-01T00:00:00Z", "demo": True},
        ]
    )

    posts = [
        ("ALSABBAT Siap Hadapi Laga Besar Akhir Pekan Ini",
         "alsabbat-siap-hadapi-laga-besar",
         "Skuad berlatih intensif sepanjang minggu untuk mengamankan tiga poin di hadapan suporter sendiri.",
         CROWD[0], "ARTICLE"),
        ("Sorotan Sesi Latihan Skuad Utama", "sorotan-sesi-latihan-skuad-utama",
         "Fokus pada transisi cepat dan penyelesaian akhir menjelang matchday berikutnya.",
         STADIUM[2], "ARTICLE"),
        ("Klub Umumkan Kemitraan Baru", "klub-umumkan-kemitraan-baru",
         "Kolaborasi jangka panjang untuk pengembangan fasilitas latihan dan program komunitas.",
         CROWD[2], "ANNOUNCEMENT"),
        ("Laporan Pertandingan: ALSABBAT 2-0 Bintang FC", "laporan-alsabbat-2-0-bintang-fc",
         "Penampilan solid selama 90 menit mengantar tiga poin di kandang sendiri.",
         STADIUM[3], "MATCH_REPORT"),
    ]
    await db[Collections.POSTS].insert_many(
        [
            {
                "id": f"post-demo-{i}", "title": title, "slug": slug, "excerpt": excerpt,
                "content": f"{excerpt}\n\nKonten demo untuk keperluan pratinjau tampilan.",
                "status": "PUBLISHED", "post_type": post_type, "thumbnail": image,
                "match_id": "m-demo-3" if post_type == "MATCH_REPORT" else None,
                "published_at": f"2026-0{i + 3}-10T10:00:00Z", "seo": {},
                "created_at": f"2026-0{i + 3}-10T10:00:00Z", "demo": True,
            }
            for i, (title, slug, excerpt, image, post_type) in enumerate(posts)
        ]
    )

    albums = [
        ("Matchday: ALSABBAT vs Bintang FC", STADIUM[5], 18, 2),
        ("Atmosfer Suporter", CROWD[0], 12, 1),
        ("Sesi Latihan Skuad", STADIUM[2], 9, 0),
        ("Malam di ALSABBAT Stadium", STADIUM[0], 14, 1),
        ("Perjalanan Away", CROWD[1], 7, 0),
    ]
    album_docs = []
    media_docs = []
    for i, (title, cover, photos, videos) in enumerate(albums):
        media_id = f"media-demo-{i}"
        media_docs.append(
            {"id": media_id, "file_name": f"demo-{i}.jpg", "file_type": "IMAGE", "url": cover,
             "thumbnail_url": cover, "alt_text": title, "status": "READY",
             "created_at": "2026-01-01T00:00:00Z", "demo": True}
        )
        album_docs.append(
            {"id": f"album-demo-{i}", "title": title, "slug": f"album-demo-{i}",
             "description": "Album demo untuk pratinjau tampilan.", "status": "PUBLISHED", "publish_status": "PUBLISHED", "published_at": "2026-01-01T00:00:00Z",
             "visibility": "PUBLIC", "cover_media_id": media_id, "photo_count": photos,
             "video_count": videos, "display_order": i, "created_at": "2026-01-01T00:00:00Z",
             "demo": True}
        )
    await db[Collections.MEDIA].insert_many(media_docs)
    await db[Collections.GALLERY_ALBUMS].insert_many(album_docs)

    await db[Collections.ACHIEVEMENTS].insert_many(
        [
            {"id": "ach-demo-1", "title": "Juara Liga Komunitas", "competition_name": "Liga Komunitas",
             "year": 2025, "level": "Regional", "status": "ACTIVE", "display_order": 1,
             "created_at": "2026-01-01T00:00:00Z", "demo": True},
            {"id": "ach-demo-2", "title": "Runner-up Piala Kota", "competition_name": "Piala Kota",
             "year": 2024, "level": "Kota", "status": "ACTIVE", "display_order": 2,
             "created_at": "2026-01-01T00:00:00Z", "demo": True},
            {"id": "ach-demo-3", "title": "Tim Fair Play", "competition_name": "Liga Komunitas",
             "year": 2023, "level": "Regional", "status": "ACTIVE", "display_order": 3,
             "created_at": "2026-01-01T00:00:00Z", "demo": True},
        ]
    )
    await db[Collections.SPONSORS].insert_many(
        [
            {"id": f"sp-demo-{i}", "name": name, "tier": tier, "status": "ACTIVE",
             "display_order": i, "created_at": "2026-01-01T00:00:00Z", "demo": True}
            for i, (name, tier) in enumerate(
                [("ALSABBAT Foundation", "PRINCIPAL"), ("Sporta", "GOLD"), ("Kopi ALSABBAT", "GOLD"),
                 ("Azawear", "SILVER"), ("Mandiri Komunitas", "SILVER")]
            )
        ]
    )

    await db[Collections.MATCH_LINEUPS].insert_many(
        [
            {"id": f"l-demo-{i}", "match_id": "m-demo-3", "team_id": team_id,
             "player_id": f"p-demo-{i}", "role": "STARTING" if i < 6 else "SUBSTITUTE",
             "position": NAMES[i][3], "shirt_number": NAMES[i][2], "is_captain": i == 0,
             "display_order": i + 1, "created_at": "2026-01-01T00:00:00Z", "demo": True}
            for i in range(8)
        ]
    )
    await db[Collections.MATCH_EVENTS].insert_many(
        [
            {"id": "ev-demo-1", "match_id": "m-demo-3", "player_id": "p-demo-1", "type": "GOAL",
             "side": "CLUB", "minute": 23, "display_order": 1, "created_at": "2026-01-01T00:00:00Z", "demo": True},
            {"id": "ev-demo-2", "match_id": "m-demo-3", "player_id": "p-demo-0", "type": "ASSIST",
             "side": "CLUB", "minute": 23, "display_order": 2, "created_at": "2026-01-01T00:00:00Z", "demo": True},
            {"id": "ev-demo-3", "match_id": "m-demo-3", "player_id": "p-demo-5", "type": "GOAL",
             "side": "CLUB", "minute": 67, "display_order": 3, "created_at": "2026-01-01T00:00:00Z", "demo": True},
            {"id": "ev-demo-4", "match_id": "m-demo-3", "player_id": "p-demo-3", "type": "YELLOW_CARD",
             "side": "CLUB", "minute": 78, "display_order": 4, "created_at": "2026-01-01T00:00:00Z", "demo": True},
        ]
    )
    print("seeded DEMO content into throwaway database:", db.name)


if __name__ == "__main__":
    asyncio.run(main())
