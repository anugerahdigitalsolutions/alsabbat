/**
 * Indonesian date/number helpers.
 *
 * Implemented manually (no `Intl` dependency) so formatting is identical on
 * every Android device / Hermes build.
 */
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateShort = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
};

export const formatDateMedium = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatDateLong = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatTime = (value) => {
  const date = toDate(value);
  if (!date) return null;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}.${mm}`;
};

export const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return `${formatDateMedium(date)} · ${formatTime(date)} WIB`;
};

export const relativeTime = (value) => {
  const date = toDate(value);
  if (!date) return null;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDateMedium(date);
};

export const greeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

export const initials = (name, fallback = 'AS') => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/** Strips HTML so post excerpts render safely inside <Text>. */
export const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

export const formatIDR = (value) => {
  const number = Math.round(Number(value || 0));
  const digits = String(Math.abs(number)).split('').reverse();
  const grouped = [];
  digits.forEach((digit, index) => {
    if (index > 0 && index % 3 === 0) grouped.push('.');
    grouped.push(digit);
  });
  return `${number < 0 ? '-' : ''}Rp${grouped.reverse().join('')}`;
};

export { MONTHS, MONTHS_SHORT, DAYS };
