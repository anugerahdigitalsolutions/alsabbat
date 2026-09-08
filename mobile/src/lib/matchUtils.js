/**
 * Match helpers — ported from the web client so both apps derive the same
 * "next match" / "last result" from the same `/api/matches` payload.
 *
 * READ-ONLY: nothing here selects players or builds line-ups.
 */
import { resolveMediaUrl } from '../api/client';
import { formatDateShort } from './format';
import { kickoffDate } from './countdown';

export const UPCOMING_STATUS = ['SCHEDULED', 'UPCOMING', 'LIVE', 'POSTPONED'];

export const STATUS_LABEL = {
  SCHEDULED: 'Terjadwal',
  UPCOMING: 'Akan Datang',
  LIVE: 'Live',
  FINISHED: 'Selesai',
  POSTPONED: 'Ditunda',
  CANCELLED: 'Dibatalkan',
};

export const isUpcomingStatus = (status) => UPCOMING_STATUS.includes(status);

export const hasScore = (match) => match?.home_score !== null && match?.home_score !== undefined;

export const isLive = (match) => match?.status === 'LIVE';

/**
 * Kick-off timestamp dari `date` (+ `time` opsional).
 *
 * Jadwal klub disimpan sebagai waktu lokal WIB, jadi parsing dilakukan dengan
 * offset Asia/Jakarta (+07:00) agar identik di device zona waktu apa pun.
 * Waktu device hanya dipakai untuk menghitung selisih (countdown).
 */
export const kickoffAt = (match) => kickoffDate(match);

export const matchTime = (match) => (match?.time ? String(match.time).slice(0, 5).replace(':', '.') : null);

export const competitionLabel = (match) =>
  match?.competition?.name || match?.competition_name || 'Pertandingan';

/** Home / away sides — the club side follows `venue_type`. */
export const matchSides = (match, club, shortName) => {
  const clubSide = {
    name: shortName || club?.short_name || 'AL SABBAT',
    logo: resolveMediaUrl(club?.logo) || null,
    isClub: true,
  };
  const opponentSide = {
    name: match?.opponent?.short_name || match?.opponent?.name || 'Lawan',
    logo: resolveMediaUrl(match?.opponent?.logo) || null,
    isClub: false,
  };
  const atHome = match?.venue_type !== 'AWAY';
  return { home: atHome ? clubSide : opponentSide, away: atHome ? opponentSide : clubSide, atHome };
};

/** Nearest future kick-off without a score and not finished/cancelled. */
export const pickNextMatch = (matches = []) => {
  const now = Date.now();
  const candidates = matches
    .filter((match) => isUpcomingStatus(match.status) && !hasScore(match))
    .map((match) => ({ match, at: kickoffAt(match)?.getTime?.() ?? null }))
    .filter(({ match, at }) => isLive(match) || (at !== null && at >= now))
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  const live = candidates.find(({ match }) => isLive(match));
  return (live || candidates[0])?.match || null;
};

/** Latest finished match (most recent first). */
export const pickLastResult = (matches = []) => {
  const done = matches
    .filter((match) => hasScore(match) || match.status === 'FINISHED')
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return done[0] || null;
};

export const matchSubtitle = (match) => {
  const parts = [formatDateShort(match?.date)];
  const time = matchTime(match);
  if (time) parts.push(`${time} WIB`);
  return parts.filter(Boolean).join(' · ');
};

/** Result badge (W/D/L) for the club side of a finished match. */
export const clubResult = (match) => {
  if (!hasScore(match)) return null;
  const home = Number(match.home_score || 0);
  const away = Number(match.away_score || 0);
  const atHome = match?.venue_type !== 'AWAY';
  const clubGoals = atHome ? home : away;
  const rivalGoals = atHome ? away : home;
  if (clubGoals > rivalGoals) return 'W';
  if (clubGoals < rivalGoals) return 'L';
  return 'D';
};

export const EVENT_LABEL = {
  GOAL: 'Gol',
  OWN_GOAL: 'Gol Sendiri',
  PENALTY_GOAL: 'Gol Penalti',
  PENALTY_MISS: 'Penalti Gagal',
  ASSIST: 'Assist',
  YELLOW_CARD: 'Kartu Kuning',
  SECOND_YELLOW: 'Kartu Kuning Kedua',
  RED_CARD: 'Kartu Merah',
  SUBSTITUTION: 'Pergantian',
  INJURY: 'Cedera',
  SAVE: 'Penyelamatan',
  CLEAN_SHEET: 'Clean Sheet',
};

export const eventLabel = (type) => EVENT_LABEL[type] || String(type || '').replace(/_/g, ' ');

export const eventMinute = (event) => {
  if (event?.minute === null || event?.minute === undefined) return null;
  const extra = event?.minute_extra ? `+${event.minute_extra}` : '';
  return `${event.minute}${extra}'`;
};
