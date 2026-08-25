import {
  ArrowRightLeft,
  CircleSlash,
  Goal,
  Handshake,
  Square,
  SquareStack,
  Target,
  Flag,
} from 'lucide-react';

/**
 * Presentation metadata for match event types.
 * Colors stay inside the ALSABBAT palette + semantic tokens.
 */
export const EVENT_META = {
  GOAL: { label: 'Gol', Icon: Goal, color: 'var(--club-secondary)' },
  OWN_GOAL: { label: 'Gol Sendiri', Icon: CircleSlash, color: 'var(--error)' },
  ASSIST: { label: 'Assist', Icon: Handshake, color: 'var(--club-secondary)' },
  PENALTY_SCORED: { label: 'Penalti Gol', Icon: Target, color: 'var(--club-secondary)' },
  PENALTY_MISSED: { label: 'Penalti Gagal', Icon: CircleSlash, color: 'var(--warning)' },
  YELLOW_CARD: { label: 'Kartu Kuning', Icon: Square, color: 'var(--club-primary)' },
  SECOND_YELLOW_CARD: { label: 'Kartu Kuning Kedua', Icon: SquareStack, color: 'var(--warning)' },
  RED_CARD: { label: 'Kartu Merah', Icon: Square, color: 'var(--error)' },
  SUBSTITUTION: { label: 'Pergantian', Icon: ArrowRightLeft, color: 'var(--muted-fg)' },
  OTHER: { label: 'Kejadian', Icon: Flag, color: 'var(--muted-fg)' },
};

export const eventMeta = (type) => EVENT_META[type] || EVENT_META.OTHER;

/** Resolve a readable player name without duplicating Player data. */
export const playerLabel = (playersById, playerId, fallbackName) => {
  const player = playerId ? playersById?.[playerId] : null;
  if (player) return player.display_name || player.full_name;
  return fallbackName || null;
};

export const minuteLabel = (event) => {
  if (event?.minute === null || event?.minute === undefined) return "—";
  const extra = event.minute_extra ? `+${event.minute_extra}` : '';
  return `${event.minute}${extra}'`;
};

export const formatMatchDate = (value) => {
  if (!value) return 'Tanggal belum diatur';
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

export const STATUS_STYLE = {
  LIVE: { bg: 'rgba(220,38,38,0.16)', fg: '#FFD9D9', border: 'rgba(220,38,38,0.4)' },
  FINISHED: { bg: 'rgba(22,163,74,0.16)', fg: '#CFF3DC', border: 'rgba(22,163,74,0.4)' },
  SCHEDULED: { bg: 'rgba(252,207,43,0.16)', fg: '#FCCF2B', border: 'rgba(252,207,43,0.4)' },
  UPCOMING: { bg: 'rgba(252,207,43,0.16)', fg: '#FCCF2B', border: 'rgba(252,207,43,0.4)' },
  POSTPONED: { bg: 'rgba(245,158,11,0.18)', fg: '#FDE9C4', border: 'rgba(245,158,11,0.42)' },
  CANCELLED: { bg: 'rgba(254,254,254,0.10)', fg: 'rgba(254,254,254,0.8)', border: 'rgba(254,254,254,0.24)' },
};
