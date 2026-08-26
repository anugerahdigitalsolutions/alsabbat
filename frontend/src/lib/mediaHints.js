/**
 * Rekomendasi ukuran gambar per jenis media (Fase 23-P).
 * Ratio diambil dari frame/komponen publik yang benar-benar merender gambar tersebut.
 * Hanya bantuan UI — bukan validasi; gambar dengan ratio lain tetap diterima dan di-crop (object-fit: cover).
 */
const CROP_NOTE = 'Foto akan otomatis dipotong agar sesuai dengan tampilan website.';

export const MEDIA_SPECS = {
  // Lambang klub (ClubCrestMark, header, footer, kartu member) — selalu persegi
  clubLogo: { fit: 'contain', aspect: 1, ratio: '1:1', size: '1000 × 1000 px', note: 'Utamakan PNG berlatar transparan.' },
  // Latar header halaman Klub & Pemain (PublicPageHeader, lebar penuh)
  clubHero: { aspect: 16 / 9, ratio: '16:9', size: '1920 × 1080 px', note: CROP_NOTE },
  // Open Graph / share media sosial
  ogImage: { aspect: 1.91, ratio: '1.91:1', size: '1200 × 630 px', note: 'Standar share Facebook/WhatsApp/X.' },
  // Frame hero homepage: 1328 × 640 px di layar 1920 (≈ 2:1), lebih tinggi di mobile
  bannerHero: { aspect: 2, ratio: '2:1', size: '1920 × 960 px', note: `Frame hero tetap. ${CROP_NOTE}` },
  // Kartu pemain (tile 4 kolom) + frame detail 208×256 / 256×320 → portrait
  playerPhoto: { aspect: 4 / 5, ratio: '4:5 (portrait)', size: '1200 × 1500 px', note: `Wajah di bagian atas foto. ${CROP_NOTE}` },
  staffPhoto: { aspect: 4 / 5, ratio: '4:5 (portrait)', size: '1200 × 1500 px', note: `Wajah di bagian atas foto. ${CROP_NOTE}` },
  // Logo tim / kompetisi / lawan — dirender di kotak persegi (h-9 w-9 … object-contain)
  teamLogo: { fit: 'contain', aspect: 1, ratio: '1:1', size: '1000 × 1000 px', note: 'Utamakan PNG berlatar transparan.' },
  competitionLogo: { fit: 'contain', aspect: 1, ratio: '1:1', size: '1000 × 1000 px', note: 'Utamakan PNG berlatar transparan.' },
  opponentLogo: { fit: 'contain', aspect: 1, ratio: '1:1', size: '500 × 500 px', note: 'Utamakan PNG berlatar transparan.' },
  // Kartu & halaman detail pertandingan (landscape)
  matchCover: { aspect: 16 / 9, ratio: '16:9', size: '1920 × 1080 px', note: CROP_NOTE },
  // Baris sponsor: kartu tinggi 96px, logo object-contain
  sponsorLogo: { fit: 'contain', aspect: 3, ratio: '3:1 (horizontal)', size: '1500 × 500 px', note: 'PNG berlatar transparan agar rapi di baris sponsor.' },
  // Frame trofi: tinggi 128px, lebar kartu ±420px
  trophyImage: { aspect: 3, ratio: '3:1', size: '1500 × 500 px', note: CROP_NOTE },
  // Kartu berita (thumbnail landscape) + kartu utama
  newsThumbnail: { aspect: 16 / 9, ratio: '16:9', size: '1920 × 1080 px', note: `Rekomendasi utama; kartu utama memakai frame lebih tinggi. ${CROP_NOTE}` },
  authorPhoto: { aspect: 1, ratio: '1:1', size: '800 × 800 px', note: 'Dirender sebagai avatar.' },
  // Cover album: frame tinggi 176px, lebar kartu ±313px
  albumCover: { aspect: 16 / 9, ratio: '16:9', size: '1600 × 900 px', note: CROP_NOTE },
  // Kartu produk: frame tinggi 208px
  productImage: { aspect: 4 / 3, ratio: '4:3', size: '1600 × 1200 px', note: `Latar polos membuat produk lebih menonjol. ${CROP_NOTE}` },
  // Kartu member digital: 440 × 288 px (≈ 3:2 landscape)
  memberCardBackground: { aspect: 3 / 2, ratio: '3:2 (landscape)', size: '1200 × 800 px', note: `Sisakan area kosong di tengah/kanan agar nama, nomor, dan QR tetap terbaca. ${CROP_NOTE}` },
  barayaPhoto: { aspect: 1, ratio: '1:1', size: '1000 × 1000 px', note: `Foto wajah, terang, dan jelas. ${CROP_NOTE}` },
};

export default MEDIA_SPECS;
