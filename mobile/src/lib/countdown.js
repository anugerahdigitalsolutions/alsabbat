/**
 * Hitungan mundur real-time (kartu "Pertandingan Terdekat").
 *
 * - Waktu pertandingan SELALU berasal dari data backend (`match.date` +
 *   `match.time`); tidak ada tanggal hardcode/dummy di sini.
 * - Jadwal klub disimpan sebagai waktu lokal WIB (tanpa zona), jadi timestamp
 *   tanpa zona diperlakukan sebagai Asia/Jakarta (+07:00) agar hasilnya sama
 *   di device dengan zona waktu apa pun.
 * - Waktu device HANYA dipakai untuk menghitung selisih terhadap kickoff.
 * - Satu interval per hook, selalu dibersihkan saat unmount (tanpa memory leak
 *   dan tanpa interval ganda).
 */
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

/** Zona waktu data AL SABBAT. */
export const CLUB_UTC_OFFSET = '+07:00';

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

/** Parsing ISO/naive yang aman → Date atau null (tidak pernah Invalid Date). */
export function parseClubTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  let text = String(value).trim();
  if (!text) return null;
  text = text.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text = `${text}T00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) text = `${text}:00`;
  if (!HAS_ZONE.test(text)) text = `${text}${CLUB_UTC_OFFSET}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Kickoff pertandingan (WIB) dari payload `/api/matches`. */
export function kickoffDate(match) {
  if (!match?.date) return null;
  const date = String(match.date).slice(0, 10);
  const time = match.time ? String(match.time).slice(0, 5) : '00:00';
  return parseClubTimestamp(`${date}T${time}:00`);
}

/** Kickoff sebagai ISO stabil (dipakai sebagai dependency hook). */
export function kickoffIso(match) {
  const date = kickoffDate(match);
  return date ? date.toISOString() : null;
}

export function splitDuration(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    totalSeconds: total,
  };
}

export const pad2 = (value) => String(Math.max(0, Number(value) || 0)).padStart(2, '0');

/**
 * useCountdown(target)
 * @param target ISO string / Date / ms
 * @returns { valid, started, remaining, days, hours, minutes, seconds }
 */
export function useCountdown(target, { enabled = true, intervalMs = 1000 } = {}) {
  const targetTime = useMemo(() => {
    const date = parseClubTimestamp(target);
    return date ? date.getTime() : null;
  }, [target]);

  const active = Boolean(enabled) && targetTime !== null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    // `now` sudah diinisialisasi saat mount/remount (useState lazy) dan
    // disinkronkan ulang lewat AppState saat app kembali aktif — tanpa
    // setState sinkron di dalam body effect.
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      if (subscription?.remove) subscription.remove();
    };
  }, [active, targetTime, intervalMs]);

  const remaining = active ? targetTime - now : null;
  return {
    valid: targetTime !== null,
    // Tidak pernah negatif: pertandingan yang sudah dimulai ditandai `started`.
    started: remaining !== null ? remaining <= 0 : false,
    remaining: remaining !== null ? Math.max(0, remaining) : null,
    targetDate: targetTime !== null ? new Date(targetTime) : null,
    ...splitDuration(remaining ?? 0),
  };
}

export default useCountdown;
