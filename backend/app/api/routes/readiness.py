"""Fase 19 — Content Readiness (read-only, dihitung dari data nyata).

Tidak ada model/koleksi baru: seluruh angka berasal dari koleksi existing.
Aturan kesiapan bersifat eksplisit — setiap kategori punya daftar `checks` boolean,
persen = jumlah check terpenuhi / total check. Tidak ada angka karangan.
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.core.database import Collections, get_db

router = APIRouter(tags=["readiness"])


def _category(cid: str, label: str, stage: str, route: str, checks: List[Dict[str, Any]], counts: Dict[str, int]) -> Dict[str, Any]:
    total = len(checks)
    done = sum(1 for check in checks if check["done"])
    percent = int(round((done / total) * 100)) if total else 0
    status = "SIAP" if total and done == total else ("BELUM DIISI" if done == 0 else "SEBAGIAN")
    return {
        "id": cid,
        "label": label,
        "stage": stage,
        "route": route,
        "checks": checks,
        "counts": counts,
        "done": done,
        "total": total,
        "percent": percent,
        "status": status,
    }


def _check(label: str, done: Any) -> Dict[str, Any]:
    return {"label": label, "done": bool(done)}


@router.get("/content", summary="Ringkasan kesiapan konten (data nyata)")
async def content_readiness(_user=Depends(require_permission("club:read"))) -> Dict[str, Any]:
    db = get_db()
    club = await db[Collections.CLUBS].find_one({}, {"_id": 0}) or {}
    contact = club.get("contact") or {}
    social = club.get("social_media") or {}

    async def count(collection: str, query: Dict[str, Any] | None = None) -> int:
        return await db[collection].count_documents(query or {})

    players_total = await count(Collections.PLAYERS)
    players_active = await count(Collections.PLAYERS, {"status": "ACTIVE"})
    players_no_photo = await count(Collections.PLAYERS, {"$or": [{"photo": None}, {"photo": ""}]})
    players_no_number = await count(Collections.PLAYERS, {"jersey_number": None})

    staff_total = await count(Collections.STAFF)
    staff_no_photo = await count(Collections.STAFF, {"$or": [{"photo": None}, {"photo": ""}]})
    staff_no_role = await count(Collections.STAFF, {"$or": [{"role": None}, {"role": ""}]})

    seasons_total = await count(Collections.SEASONS)
    seasons_active = await count(Collections.SEASONS, {"is_current": True})
    competitions_total = await count(Collections.COMPETITIONS)

    matches_total = await count(Collections.MATCHES)
    matches_scheduled = await count(Collections.MATCHES, {"status": "SCHEDULED"})
    matches_no_venue = await count(Collections.MATCHES, {"$or": [{"venue": None}, {"venue": ""}]})
    events_total = await count(Collections.MATCH_EVENTS)

    posts_total = await count(Collections.POSTS)
    posts_published = await count(Collections.POSTS, {"status": "PUBLISHED"})
    posts_no_thumb = await count(Collections.POSTS, {"status": "PUBLISHED", "$or": [{"thumbnail": None}, {"thumbnail": ""}]})

    albums_total = await count(Collections.GALLERY_ALBUMS)
    albums_published = await count(Collections.GALLERY_ALBUMS, {"status": "PUBLISHED"})
    media_total = await count(Collections.MEDIA)

    sponsors_total = await count(Collections.SPONSORS)
    sponsors_no_logo = await count(Collections.SPONSORS, {"$or": [{"logo": None}, {"logo": ""}]})
    achievements_total = await count(Collections.ACHIEVEMENTS)

    products_total = await count(Collections.PRODUCTS)
    products_active = await count(Collections.PRODUCTS, {"status": "ACTIVE"})
    products_no_image = await count(Collections.PRODUCTS, {"$or": [{"images": {"$size": 0}}, {"images": None}]})

    banners_total = await count(Collections.BANNERS)
    banners_active = await count(Collections.BANNERS, {"status": "ACTIVE"})

    site_content = {
        doc["key"]: doc.get("value")
        async for doc in db[Collections.SITE_CONTENT].find({}, {"_id": 0, "key": 1, "value": 1})
    }

    def has_prefix(prefix: str) -> bool:
        return any(key.startswith(prefix) and value for key, value in site_content.items())

    customers_total = await count(Collections.CUSTOMERS)
    customers_active = await count(Collections.CUSTOMERS, {"status": "ACTIVE"})

    categories = [
        _category(
            "club_profile", "Profil Klub", "TAHAP 1 — IDENTITAS KLUB", "/admin/club",
            [
                _check("Nama klub", club.get("name")),
                _check("Nama pendek", club.get("short_name")),
                _check("Deskripsi", club.get("description")),
                _check("Cerita klub", club.get("story")),
                _check("Lokasi", club.get("location")),
                _check("Stadion / markas", club.get("stadium")),
            ],
            {},
        ),
        _category(
            "club_identity", "Logo & Identitas", "TAHAP 1 — IDENTITAS KLUB", "/admin/club",
            [
                _check("Logo klub", club.get("logo")),
                _check("Warna klub terkonfigurasi", club.get("primary_color") and club.get("secondary_color")),
            ],
            {},
        ),
        _category(
            "club_hero", "Foto Utama Klub", "TAHAP 1 — IDENTITAS KLUB", "/admin/club",
            [_check("Foto utama (hero) halaman Klub", club.get("hero_image"))],
            {},
        ),
        _category(
            "club_contact", "Konten Kontak", "TAHAP 1 — IDENTITAS KLUB", "/admin/club",
            [
                _check("Email", contact.get("email")),
                _check("Telepon", contact.get("phone")),
                _check("WhatsApp", contact.get("whatsapp")),
                _check("Alamat", contact.get("address")),
                _check("Media sosial", any(social.values()) if social else False),
            ],
            {},
        ),
        _category(
            "staff", "Staf", "TAHAP 2 — STRUKTUR TIM", "/admin/staff",
            [
                _check("Ada data staf", staff_total > 0),
                _check("Semua staf punya jabatan", staff_total > 0 and staff_no_role == 0),
                _check("Semua staf punya foto", staff_total > 0 and staff_no_photo == 0),
            ],
            {"total": staff_total, "tanpa_foto": staff_no_photo},
        ),
        _category(
            "players", "Skuad (Pemain)", "TAHAP 2 — STRUKTUR TIM", "/admin/players",
            [
                _check("Ada data pemain", players_total > 0),
                _check("Ada pemain berstatus ACTIVE", players_active > 0),
                _check("Semua pemain punya nomor punggung", players_total > 0 and players_no_number == 0),
                _check("Semua pemain punya foto", players_total > 0 and players_no_photo == 0),
            ],
            {"total": players_total, "aktif": players_active, "tanpa_foto": players_no_photo},
        ),
        _category(
            "seasons", "Musim", "TAHAP 3 — MUSIM & KOMPETISI", "/admin/seasons",
            [
                _check("Ada musim", seasons_total > 0),
                _check("Ada musim aktif", seasons_active > 0),
            ],
            {"total": seasons_total, "aktif": seasons_active},
        ),
        _category(
            "competitions", "Kompetisi", "TAHAP 3 — MUSIM & KOMPETISI", "/admin/competitions",
            [_check("Ada kompetisi", competitions_total > 0)],
            {"total": competitions_total},
        ),
        _category(
            "matches", "Pertandingan", "TAHAP 4 — PERTANDINGAN", "/admin/matches",
            [
                _check("Ada pertandingan", matches_total > 0),
                _check("Ada pertandingan terjadwal", matches_scheduled > 0),
                _check("Semua pertandingan punya venue", matches_total > 0 and matches_no_venue == 0),
            ],
            {"total": matches_total, "terjadwal": matches_scheduled},
        ),
        _category(
            "match_events", "Kejadian Pertandingan", "TAHAP 4 — PERTANDINGAN", "/admin/match-events",
            [
                _check("Ada event pertandingan", events_total > 0),
            ],
            {"event": events_total},
        ),
        _category(
            "news", "Berita", "TAHAP 5 — KONTEN", "/admin/content",
            [
                _check("Ada berita", posts_total > 0),
                _check("Ada berita terbit (PUBLISHED)", posts_published > 0),
                _check("Semua berita terbit punya thumbnail", posts_published > 0 and posts_no_thumb == 0),
            ],
            {"total": posts_total, "terbit": posts_published},
        ),
        _category(
            "gallery", "Galeri", "TAHAP 5 — KONTEN", "/admin/gallery",
            [
                _check("Ada album", albums_total > 0),
                _check("Ada album terbit", albums_published > 0),
                _check("Ada media terunggah", media_total > 0),
            ],
            {"album": albums_total, "terbit": albums_published, "media": media_total},
        ),
        _category(
            "sponsors", "Sponsor", "TAHAP 5 — KONTEN", "/admin/sponsors",
            [
                _check("Ada sponsor", sponsors_total > 0),
                _check("Semua sponsor punya logo", sponsors_total > 0 and sponsors_no_logo == 0),
            ],
            {"total": sponsors_total},
        ),
        _category(
            "achievements", "Prestasi", "TAHAP 5 — KONTEN", "/admin/achievements",
            [_check("Ada prestasi", achievements_total > 0)],
            {"total": achievements_total},
        ),
        _category(
            "banners", "Banner Homepage", "TAHAP 6 — HOMEPAGE", "/admin/home-content",
            [
                _check("Ada banner hero", banners_total > 0),
                _check("Ada banner aktif (tampil di homepage)", banners_active > 0),
            ],
            {"total": banners_total, "aktif": banners_active},
        ),
        _category(
            "home_content", "Konten Homepage", "TAHAP 6 — HOMEPAGE", "/admin/home-content",
            [
                _check("Teks hero disesuaikan", has_prefix("home.hero.")),
                _check("Pilar brand disesuaikan", has_prefix("home.pillar.")),
                _check("CTA penutup disesuaikan", has_prefix("home.cta.")),
            ],
            {"key_terisi": sum(1 for key, value in site_content.items() if key.startswith("home.") and value)},
        ),
        _category(
            "merchandise", "Merchandise", "TAHAP 7 — MERCHANDISE", "/admin/products",
            [
                _check("Ada produk", products_total > 0),
                _check("Ada produk aktif", products_active > 0),
                _check("Semua produk punya gambar", products_total > 0 and products_no_image == 0),
            ],
            {"total": products_total, "aktif": products_active},
        ),
        _category(
            "member_card", "Desain Kartu Member", "TAHAP 8 — BARAYA", "/admin/baraya",
            [
                _check("Latar kartu dipilih (opsional, default ALSABBAT dipakai bila kosong)", site_content.get("member.card.background_url")),
            ],
            {},
        ),
        _category(
            "baraya", "Baraya ALSABBAT", "TAHAP 8 — BARAYA", "/admin/baraya",
            [
                _check("Ada akun Baraya terdaftar", customers_total > 0),
                _check("Ada Baraya aktif", customers_active > 0),
            ],
            {"total": customers_total, "aktif": customers_active},
        ),
    ]

    done = sum(category["done"] for category in categories)
    total = sum(category["total"] for category in categories)
    return {
        "categories": categories,
        "overall": {
            "done": done,
            "total": total,
            "percent": int(round((done / total) * 100)) if total else 0,
            "siap": sum(1 for c in categories if c["status"] == "SIAP"),
            "sebagian": sum(1 for c in categories if c["status"] == "SEBAGIAN"),
            "belum": sum(1 for c in categories if c["status"] == "BELUM DIISI"),
        },
        "has_any_data": total > 0 and done > 0,
    }
