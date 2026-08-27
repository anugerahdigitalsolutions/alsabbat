/**
 * Tanggal + waktu publish konten publik (Berita/Cerita/Informasi).
 *
 * Konsistensi WIB:
 *  - nilai TANPA timezone (mis. "2026-08-27T14:30") dianggap sudah WIB dan
 *    ditampilkan apa adanya (tanpa konversi) => sama dengan yang disimpan admin
 *  - nilai DENGAN timezone (mis. "...Z" / "+00:00") dikonversi ke Asia/Jakarta
 *  - tanpa jam pada data => hanya tanggal (tidak pernah membuat waktu palsu)
 */
const parseParts = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const hasTimezone = /(Z|z|[+-]\d{2}:?\d{2})$/.test(raw);

  if (!hasTimezone) {
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    return {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hour: m[4] === undefined ? null : Number(m[4]),
      minute: m[5] === undefined ? null : Number(m[5]),
    };
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(dt);
  const get = (type) => Number((parts.find((p) => p.type === type) || {}).value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
};

export const formatPublishDate = (value) => {
  const p = parseParts(value);
  if (!p) return null;
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const formatPublishTime = (value) => {
  const p = parseParts(value);
  if (!p || p.hour === null || p.hour === undefined || Number.isNaN(p.hour)) return null;
  const minute = Number.isNaN(p.minute) || p.minute === null ? 0 : p.minute;
  return `${String(p.hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB`;
};

/** "27 Agustus 2026 • 14:30 WIB" (waktu dilewati bila datanya tidak punya jam). */
export const formatPublishDateTime = (value, separator = ' • ') => {
  const date = formatPublishDate(value);
  if (!date) return null;
  const time = formatPublishTime(value);
  return time ? `${date}${separator}${time}` : date;
};

export default formatPublishDateTime;
