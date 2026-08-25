# ALSABBAT — Social Publishing (Fase 8)

Satu konten dibuat di Admin Panel, lalu admin memilih platform tujuan secara manual.
**Hanya API resmi platform yang digunakan** — tidak ada scraping, browser automation,
unofficial API, maupun mock success.

## Arsitektur

```
Content/Post ──┐
               ├── SocialPublication (1 dokumen per platform) ── adapter platform
Media Library ─┘                                                  │
                                                                  ├── WebsitePublisher (CMS existing)
                                                                  ├── InstagramPublisher (Graph API)
                                                                  ├── TikTokPublisher (Content Posting API)
                                                                  └── YouTubePublisher / YouTubeShortsPublisher (Data API v3)
```

- Collection: `social_publications`
- Status: `DRAFT → PUBLISHING → PUBLISHED | FAILED | CANCELLED` (`QUEUED` tersedia untuk penjadwalan nanti)
- Setiap platform punya status sendiri, sehingga kegagalan satu platform tidak menyembunyikan platform lain.
- Idempotency: publikasi dengan `external_post_id` atau status `PUBLISHED` tidak bisa dipublish ulang.
  Batas percobaan: 5 (`attempt_count`), retry manual oleh admin.

## Endpoint

| Method | Path | Permission |
|---|---|---|
| GET | `/api/social/platforms` | `social:read` |
| GET | `/api/social/summary` | `social:read` |
| GET | `/api/social/publications` | `social:read` |
| GET | `/api/social/publications/{id}` | `social:read` |
| POST | `/api/social/publications` | `social:publish` |
| PATCH | `/api/social/publications/{id}` | `social:publish` |
| DELETE | `/api/social/publications/{id}` | `social:publish` |
| POST | `/api/social/publications/{id}/publish` | `social:publish` |
| POST | `/api/social/publications/{id}/retry` | `social:publish` |
| POST | `/api/social/publications/{id}/cancel` | `social:publish` |

RBAC ditegakkan di backend (`require_permission`). Role `SOCIAL_MEDIA_ADMIN` sudah memiliki
`social:read` + `social:publish`; `SUPER_ADMIN` memakai wildcard.

## Environment variables (backend saja — JANGAN commit)

```bash
# Instagram Graph API (Instagram Login / akun Professional)
IG_USER_ID=
IG_ACCESS_TOKEN=            # long-lived token, berlaku 60 hari, wajib di-refresh
META_API_VERSION=v21.0      # opsional
META_GRAPH_HOST=graph.instagram.com   # graph.facebook.com bila memakai Facebook Login for Business
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=

# TikTok Content Posting API
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_ACCESS_TOKEN=
TIKTOK_DIRECT_POST_APPROVED=false   # true hanya setelah app di-audit TikTok
TIKTOK_PRIVACY_LEVEL=SELF_ONLY

# YouTube Data API v3 (video & Shorts memakai koneksi yang sama)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_CATEGORY_ID=17      # 17 = Sports

# URL publik untuk media (Instagram & TikTok mengunduh media dari URL HTTPS)
PUBLIC_SITE_URL=https://...
MEDIA_CDN_BASE_URL=         # opsional, diprioritaskan bila diisi
```

Bila salah satu variabel kosong, endpoint `/api/social/platforms` melaporkan
`NOT_CONFIGURED` beserta daftar nama variabel yang belum diisi (**tanpa** membocorkan nilai).

## Cara memperoleh kredensial

- **Instagram**: buat Meta App (tipe Business) → tambahkan produk Instagram → Business Login →
  scope `instagram_business_basic`, `instagram_business_content_publish` → tukar authorization code
  menjadi long-lived token. Akun harus Professional (Business/Creator).
- **TikTok**: daftar app di TikTok for Developers → tambahkan Login Kit + Content Posting API →
  minta scope `video.publish` (Direct Post) atau `video.upload` (inbox) → verifikasi domain URL media →
  ajukan audit untuk publish publik.
- **YouTube**: aktifkan YouTube Data API v3 di Google Cloud → OAuth client (Web) →
  scope `https://www.googleapis.com/auth/youtube.upload` → ambil refresh token satu kali
  di workstation admin (bukan di server produksi).

## Batasan resmi yang ditegakkan

| Platform | Batasan |
|---|---|
| Instagram | Media diunduh Meta dari URL publik HTTPS (bukan multipart). Gambar JPEG ≤ 8 MB. Reels ≤ 300 MB, 3 detik–15 menit. Kuota publish per 24 jam. |
| TikTok | Tanpa audit TikTok → hanya `SELF_ONLY` dan maksimal 5 user/24 jam. Video ≤ 4 GB, ≤ 10 menit, MP4/MOV/WebM, dimensi 360–4096 px. Publish asinkron. |
| YouTube | Kuota upload ± 100 video/hari/project. Project yang belum lolos audit hanya bisa upload privat. |
| YouTube Shorts | Tidak ada endpoint terpisah. Divalidasi: durasi ≤ 180 detik dan orientasi vertikal/persegi. |
| Website | Memakai status Post existing (`PUBLISHED`). |

## Keamanan

- Semua kredensial dibaca dari environment; tidak ada secret di frontend, database, atau Git.
- Error yang disimpan hanya `error_code` + pesan yang sudah dinormalisasi (tanpa token/secret).
- Log audit mencatat user, platform, publication id, dan kode error — tanpa kredensial.
