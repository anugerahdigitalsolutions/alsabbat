/**
 * Onboarding slides for the AL SABBAT mobile experience.
 *
 * Copy describes the REAL features of the existing application (Match Center,
 * berita, galeri/media, skuad, profil member & notifikasi). The imagery is
 * decorative branding artwork — it is never presented as club data.
 *
 * Images are requested at mobile resolution to keep the payload small.
 */
const PEXELS = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;
const UNSPLASH = (path) => `https://images.unsplash.com/${path}?auto=format&fit=crop&w=900&q=70`;

export const ONBOARDING_SLIDES = [
  {
    id: 'welcome',
    image: PEXELS(38789376),
    title: 'Selamat datang di AL SABBAT',
    description:
      'Satu klub, satu semangat. Semua tentang AL SABBAT Football Club kini ada dalam satu aplikasi.',
  },
  {
    id: 'matches',
    image: UNSPLASH('flagged/photo-1550413231-202a9d53a331'),
    title: 'Ikuti setiap pertandingan',
    description:
      'Jadwal, hitung mundur kick-off, hasil, dan Pusat Pertandingan lengkap dengan jalannya laga.',
  },
  {
    id: 'news-media',
    image: UNSPLASH('photo-1489944440615-453fc2b6a9a9'),
    title: 'Berita & media resmi',
    description:
      'Kabar terbaru langsung dari klub, plus galeri foto dan momen terbaik setiap laga.',
  },
  {
    id: 'profile',
    image: PEXELS(29811412),
    title: 'Jadi bagian dari AL SABBAT',
    description:
      'Kenali skuad, kelola profil dan kartu member, serta terima notifikasi penting dari klub.',
  },
];

export default ONBOARDING_SLIDES;
