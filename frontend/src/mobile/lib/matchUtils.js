import { kickoffAt } from '../../components/public/MatchdayCountdown';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';

/** Shared match helpers for the BARAYA AL SABBAT mobile screens. */

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

export const hasScore = (match) =>
  match?.home_score !== null && match?.home_score !== undefined;

export const isLive = (match) => match?.status === 'LIVE';

/** Home / away sides — the club side follows `venue_type`. */
export const matchSides = (match, club, shortName) => {
  const clubSide = {
    name: shortName || 'AL SABBAT',
    logo: resolveMediaUrl(club?.logo) || null,
    isClub: true,
  };
  const opponentSide = {
    name: match?.opponent?.short_name || match?.opponent?.name || 'Lawan',
    fullName: match?.opponent?.name || 'Lawan',
    logo: resolveMediaUrl(match?.opponent?.logo) || null,
    isClub: false,
  };
  const atHome = match?.venue_type !== 'AWAY';
  return {
    home: atHome ? clubSide : opponentSide,
    away: atHome ? opponentSide : clubSide,
    atHome,
  };
};

export const formatDateShort = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch (e) {
    return value;
  }
};

export const formatDateLong = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (e) {
    return value;
  }
};

export const matchTime = (match) => (match?.time ? String(match.time).slice(0, 5) : null);

export const competitionLabel = (match) =>
  match?.competition?.name || match?.competition_name || 'Pertandingan';

/**
 * Next match = nearest future kick-off that has neither a score nor a
 * finished/cancelled status. Never invents data.
 */
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

export { kickoffAt };
