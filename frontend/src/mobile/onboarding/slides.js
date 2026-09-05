/**
 * Onboarding slides for the AL SABBAT mobile experience.
 *
 * Artwork: official AL SABBAT team photography supplied by the club, optimised
 * by `frontend/scripts/prepare-brand-assets.py` into two responsive WebP sizes
 * (480w / 900w) served from `public/onboarding/`.
 *
 * The number of slides always matches the number of images the club provides —
 * currently two. Copy introduces the real features of the app (Match Center,
 * berita, media/galeri, skuad, profil member & notifikasi).
 */
const asset = (path) => `${process.env.PUBLIC_URL || ''}${path}`;

export const ONBOARDING_SLIDES = [
  {
    id: 'welcome',
    image: asset('/onboarding/onboarding-1-900.webp'),
    imageSmall: asset('/onboarding/onboarding-1-480.webp'),
    alt: 'Skuad AL SABBAT Football Club berfoto bersama di stadion',
    title: 'Selamat datang di AL SABBAT',
    description:
      'Satu klub, satu semangat. Ikuti jadwal, hasil, dan Pusat Pertandingan AL SABBAT Football Club dalam satu aplikasi.',
  },
  {
    id: 'club',
    image: asset('/onboarding/onboarding-2-900.webp'),
    imageSmall: asset('/onboarding/onboarding-2-480.webp'),
    alt: 'Tim AL SABBAT Football Club sebelum pertandingan',
    title: 'Berita, media & skuad',
    description:
      'Kabar resmi klub, galeri foto setiap laga, profil pemain, kartu member, dan notifikasi penting — semua di sini.',
  },
];

export default ONBOARDING_SLIDES;
