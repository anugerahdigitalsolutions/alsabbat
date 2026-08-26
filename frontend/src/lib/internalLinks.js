/**
 * Public page targets for admin link pickers (Fase 23).
 * Labels are the public Indonesian terms; routes are the EXISTING internal routes
 * (e.g. "Pemain" tetap memakai route /teams).
 */
export const INTERNAL_LINK_OPTIONS = [
  { value: '/', label: 'Beranda' },
  { value: '/club', label: 'Klub' },
  { value: '/teams', label: 'Pemain' },
  { value: '/matches', label: 'Pertandingan' },
  { value: '/news', label: 'Berita' },
  { value: '/gallery', label: 'Galeri' },
  { value: '/merchandise', label: 'Merchandise' },
  { value: '/contact', label: 'Kontak' },
  { value: '/login', label: 'Login' },
  { value: '/order', label: 'Lacak Pesanan' },
];

export const isExternalLink = (value) => /^(https?:)?\/\//i.test(String(value || '').trim());

export const internalLinkLabel = (value) =>
  INTERNAL_LINK_OPTIONS.find((option) => option.value === value)?.label || value || '';
