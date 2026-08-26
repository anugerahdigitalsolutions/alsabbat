"""One-off: translate public UI strings to Bahasa Indonesia (Fase Baraya)."""
import os

ROOTS = ["/app/frontend/src/pages/public", "/app/frontend/src/components/public"]

MAP = [
    # ---- navigation & chrome
    ("label: 'Home', id: 'home'", "label: 'Beranda', id: 'home'"),
    ("label: 'Club', id: 'club'", "label: 'Klub', id: 'club'"),
    ("label: 'Squad', id: 'teams'", "label: 'Skuad', id: 'teams'"),
    ("label: 'Matches', id: 'matches'", "label: 'Pertandingan', id: 'matches'"),
    ("label: 'News', id: 'news'", "label: 'Berita', id: 'news'"),
    ("label: 'Gallery', id: 'gallery'", "label: 'Galeri', id: 'gallery'"),
    ("label: 'Contact', id: 'contact'", "label: 'Kontak', id: 'contact'"),
    ("label: 'Lacak Order', id: 'order'", "label: 'Lacak Pesanan', id: 'order'"),
    ("Quick Links", "Tautan Cepat"),
    ("Contact Us", "Hubungi Kami"),
    ("Follow Us", "Ikuti Kami"),
    ("Official Platform", "Platform Resmi"),
    # ---- breadcrumbs / page headers
    ("label: 'Home'", "label: 'Beranda'"),
    ("label: 'Matches' }", "label: 'Pertandingan' }"),
    ("label: 'News' }", "label: 'Berita' }"),
    ("label: 'News', to: '/news'", "label: 'Berita', to: '/news'"),
    ("label: 'Squad' }", "label: 'Skuad' }"),
    ("label: 'Squad', to: '/teams'", "label: 'Skuad', to: '/teams'"),
    (">Home</Link>", ">Beranda</Link>"),
    (">Squad</Link>", ">Skuad</Link>"),
    ('label="Squad"', 'label="Skuad"'),
    ('label="Store"', 'label="Toko"'),
    ('label="Matchday"', 'label="Jadwal & Hasil"'),
    ('label="Honours"', 'label="Penghargaan"'),
    ('label="Newsroom"', 'label="Ruang Berita"'),
    ("'Newsroom'", "'Ruang Berita'"),
    ('title="Wear The Badge"', 'title="Pakai Lambang Klub"'),
    ('title="Moments We Remember"', 'title="Momen yang Kami Ingat"'),
    ('title="This Is ALSABBAT"', 'title="Inilah ALSABBAT"'),
    ('title="Connect With ALSABBAT"', 'title="Hubungi ALSABBAT"'),
    ('title="Stories From ALSABBAT"', 'title="Cerita Dari ALSABBAT"'),
    ('title="Every Match. Every Moment."', 'title="Setiap Laga. Setiap Momen."'),
    ('title="One Squad. One Family."', 'title="Satu Skuad. Satu Baraya."'),
    ("title: 'Squad', description", "title: 'Skuad', description"),
    ("title: 'Match Center'", "title: 'Pusat Pertandingan'"),
    ("'Match Center ALSABBAT: informasi", "'Pusat Pertandingan ALSABBAT: informasi"),
    ("Jadwal, hasil, dan Match Center ALSABBAT Football Club.", "Jadwal, hasil, dan Pusat Pertandingan ALSABBAT Football Club."),
    ("Jadwal, hasil, dan Match Center pertandingan ALSABBAT Football Club.", "Jadwal, hasil, dan Pusat Pertandingan ALSABBAT Football Club."),
    ("Data pertandingan dikelola melalui Admin Panel pada modul Matches.", "Data pertandingan dikelola melalui Admin Panel pada modul Pertandingan."),
    ("Berita resmi, match report, dan pengumuman ALSABBAT Football Club.", "Berita resmi, laporan pertandingan, dan pengumuman ALSABBAT Football Club."),
    # ---- home hero & sections
    ("'ONE CLUB.'", "'SATU KLUB.'"),
    ("'ONE PASSION.'", "'SATU SEMANGAT.'"),
    ("`ONE ${badge.toUpperCase()}.`", "`SATU ${badge.toUpperCase()}.`"),
    ("'Together we fight. Together we win.'", "'Bersama berjuang. Bersama menang.'"),
    ("nextMatch ? 'Next Match' : 'Pertandingan'", "nextMatch ? 'Pertandingan Berikutnya' : 'Pertandingan'"),
    ("secondaryLabel: 'About Us'", "secondaryLabel: 'Tentang Kami'"),
    ("eyebrow: 'Latest Result'", "eyebrow: 'Hasil Terakhir'"),
    ("subheadline: 'Full Time'", "subheadline: 'Selesai'"),
    ("ctaLabel: 'View Match'", "ctaLabel: 'Lihat Pertandingan'"),
    ("eyebrow: 'Latest News'", "eyebrow: 'Berita Terbaru'"),
    ("eyebrow: 'Match Moments'", "eyebrow: 'Momen Pertandingan'"),
    ("ctaLabel: 'View Gallery'", "ctaLabel: 'Lihat Galeri'"),
    ("nextMatch ? 'Upcoming Match' : 'Latest Result'", "nextMatch ? 'Pertandingan Berikutnya' : 'Hasil Terakhir'"),
    ("(nextMatch ? 'Matchday' : 'Full Time')", "(nextMatch ? 'Hari Pertandingan' : 'Selesai')"),
    ('label="Latest News" to="/news" actionLabel="View All News"', 'label="Berita Terbaru" to="/news" actionLabel="Semua Berita"'),
    ('label="Player Spotlight"', 'label="Sorotan Pemain"'),
    ('label="Team Stats"', 'label="Statistik Tim"'),
    ('label="Official Store" to="/merchandise" actionLabel="Store"', 'label="Toko Resmi" to="/merchandise" actionLabel="Toko"'),
    ('label="Gallery" to="/gallery" actionLabel="View All Gallery"', 'label="Galeri" to="/gallery" actionLabel="Semua Galeri"'),
    ('label="Our Sponsors"', 'label="Sponsor Kami"'),
    # ---- pillars
    ("title: 'One Club', text: 'ALSABBAT is one club with one mission.'", "title: 'Satu Klub', text: 'ALSABBAT adalah satu klub dengan satu misi.'"),
    ("title: 'One Team', text: 'One team. One squad. One heartbeat.'", "title: 'Satu Tim', text: 'Satu tim. Satu skuad. Satu detak jantung.'"),
    ("title: 'One Dream', text: 'We dream together. We achieve together.'", "title: 'Satu Mimpi', text: 'Bermimpi bersama. Meraih bersama.'"),
    ("title: 'One Glory', text: 'For the badge. For the fans. For ALSABBAT.'", "title: 'Satu Kejayaan', text: 'Untuk lambang. Untuk Baraya. Untuk ALSABBAT.'"),
    # ---- CTA / journey
    ("Follow The Journey", "Ikuti Perjalanan Kami"),
    ("Jadi bagian dari keluarga {clubName}", "Jadi bagian dari Baraya {clubName}"),
    # ---- cards & labels
    ("label: 'Matches Played'", "label: 'Main'"),
    ("label: 'Wins'", "label: 'Menang'"),
    ("label: 'Draws'", "label: 'Seri'"),
    ("label: 'Losses'", "label: 'Kalah'"),
    ("'Full Time' : 'Upcoming Match'", "'Selesai' : 'Pertandingan Berikutnya'"),
    ("        Match Details\n", "        Pertandingan Berikutnya\n"),
    (">Official Store<", ">Toko Resmi<"),
    (">Match Moments<", ">Momen Pertandingan<"),
    ("|| 'Squad'}", "|| 'Skuad'}"),
    ("        View Profile <ArrowRight", "        Lihat Profil <ArrowRight"),
    ("            View Profile\n", "            Lihat Profil\n"),
    ("          Player Spotlight\n", "          Sorotan Pemain\n"),
    ('className="als-row-label mb-4">Player Spotlight<', 'className="als-row-label mb-4">Sorotan Pemain<'),
    ("            Player Profile\n", "            Profil Pemain\n"),
    (">Headline<", ">Berita Utama<"),
    ('className="als-section-label mb-3">Headline<', 'className="als-section-label mb-3">Berita Utama<'),
    ("        Match Center\n", "        Pusat Pertandingan\n"),
    ("          Match Center\n", "          Pusat Pertandingan\n"),
    ("          Next Match\n", "          Pertandingan Berikutnya\n"),
    ("        Next Match\n", "        Pertandingan Berikutnya\n"),
    ('label="Days"', 'label="Hari"'),
    ('label="Hours"', 'label="Jam"'),
    ('label="Minutes"', 'label="Menit"'),
    ('label="Seconds"', 'label="Detik"'),
    ('label="Hrs"', 'label="Jam"'),
    ('label="Mins"', 'label="Mnt"'),
    ('label="Secs"', 'label="Dtk"'),
    ("              Matchday\n", "              Hari Pertandingan\n"),
    ("            Matchday\n", "            Hari Pertandingan\n"),
    # ---- match center
    ('als-section-label mb-4">Head-to-Head<', 'als-section-label mb-4">Rekor Pertemuan<'),
    ('als-section-label">Head-to-Head<', 'als-section-label">Rekor Pertemuan<'),
    ("'Away' : item.venue_type === 'NEUTRAL' ? 'Netral' : 'Home'", "'Tandang' : item.venue_type === 'NEUTRAL' ? 'Netral' : 'Tuan Rumah'"),
    ('als-section-label">Match Report<', 'als-section-label">Laporan Pertandingan<'),
    ('als-section-label">Match Statistics<', 'als-section-label">Statistik Pertandingan<'),
    ('als-section-label">Match Media<', 'als-section-label">Media Pertandingan<'),
    ("label: 'Goals'", "label: 'Gol'"),
    ("label: 'Own Goals'", "label: 'Gol Sendiri'"),
    ("label: 'Assists'", "label: 'Assist'"),
    ("label: 'Penalty Missed'", "label: 'Penalti Gagal'"),
    ("label: 'Yellow Cards'", "label: 'Kartu Kuning'"),
    ("label: 'Red Cards'", "label: 'Kartu Merah'"),
    ("label: 'Substitutions'", "label: 'Pergantian'"),
    ("                Starting XI\n", "                Pemain Inti\n"),
    ('title="Starting XI"', 'title="Pemain Inti"'),
    ("                Substitutes\n", "                Pemain Cadangan\n"),
    ('als-section-label">Substitutes<', 'als-section-label">Pemain Cadangan<'),
    ("Starting XI dan pemain cadangan akan tampil di sini setelah diinput melalui Admin Panel.", "Susunan pemain inti dan cadangan akan tampil di sini setelah diinput melalui Admin Panel."),
    ("Starting XI belum lengkap:", "Pemain inti belum lengkap:"),
    ("            Opponent\n", "            Lawan\n"),
    ("`${sideLabel} · Opponent`", "`${sideLabel} · Lawan`"),
    ('sideLabel="Home"', 'sideLabel="Tuan Rumah"'),
    ('sideLabel="Away"', 'sideLabel="Tandang"'),
    ("                Kick-off {match.time}", "                Mulai {match.time}"),
    ("            Matchday\n          </p>", "            Hari Pertandingan\n          </p>"),
    ('label="Venue"', 'label="Lokasi"'),
    ("Match gallery belum tersedia", "Galeri pertandingan belum tersedia"),
    ("          View Full Gallery\n", "          Lihat Galeri Lengkap\n"),
    ("              Match Gallery\n", "              Galeri Pertandingan\n"),
    ("Foto dan video akan tampil setelah ditambahkan dari Media Library.", "Foto dan video akan tampil setelah ditambahkan dari Pustaka Media."),
    ("Unggah kartu ke Media Library bila ingin dipublikasikan lewat Social Publishing.", "Unggah kartu ke Pustaka Media bila ingin dipublikasikan lewat Social Publishing."),
    ("SCHEDULED: 'MATCHDAY',", "SCHEDULED: 'HARI PERTANDINGAN',"),
    ("UPCOMING: 'MATCHDAY',", "UPCOMING: 'HARI PERTANDINGAN',"),
    ("FINISHED: 'FULL TIME',", "FINISHED: 'SELESAI',"),
    ("|| 'MATCHDAY';", "|| 'HARI PERTANDINGAN';"),
    ("Download PNG", "Unduh PNG"),
    ("label: '1:1 Feed'", "label: '1:1 Feed'"),
    # ---- club colors
    ("['primary_color', 'Primary']", "['primary_color', 'Primer']"),
    ("['secondary_color', 'Secondary']", "['secondary_color', 'Sekunder']"),
    ("['tertiary_color', 'Tertiary']", "['tertiary_color', 'Tersier']"),
    ("['light_color', 'Light']", "['light_color', 'Terang']"),
    # ---- commerce
    ("Nomor Order", "Nomor Pesanan"),
    ("Lacak Order", "Lacak Pesanan"),
    ("Ringkasan Order", "Ringkasan Pesanan"),
    ("Order Dibuat", "Pesanan Dibuat"),
    ("Buat Order &amp; Bayar", "Buat Pesanan &amp; Bayar"),
    ("Order tidak ditemukan.", "Pesanan tidak ditemukan."),
    ("Masukkan nomor order dan email yang digunakan saat checkout.", "Masukkan nomor pesanan dan email yang digunakan saat checkout."),
    ("Lacak status order merchandise ALSABBAT Football Club.", "Lacak status pesanan merchandise ALSABBAT Football Club."),
    ("Order tetap tercatat sebagai PENDING dan admin akan menghubungi Anda.", "Pesanan tetap tercatat sebagai PENDING dan admin akan menghubungi Anda."),
    ("PAYMENT NOT CONFIGURED", "PEMBAYARAN BELUM DIKONFIGURASI"),
    ("'OUT OF STOCK'", "'Stok habis'"),
    ("Total dihitung ulang oleh server. Pembayaran hanya melalui gateway resmi.", "Total dihitung ulang oleh server. Pembayaran hanya melalui gerbang pembayaran resmi."),
]


def main():
    files = []
    for root in ROOTS:
        for dp, _dn, fn in os.walk(root):
            files += [os.path.join(dp, f) for f in fn if f.endswith(".js")]

    hits = {k: 0 for k, _ in MAP}
    for path in files:
        original = open(path).read()
        text = original
        for old, new in MAP:
            if old in text:
                hits[old] += text.count(old)
                text = text.replace(old, new)
        if text != original:
            open(path, "w").write(text)
            print("updated", path)

    missing = [k for k, v in hits.items() if v == 0]
    print("\nUNMATCHED (%d):" % len(missing))
    for m in missing:
        print("  -", repr(m))


if __name__ == "__main__":
    main()
