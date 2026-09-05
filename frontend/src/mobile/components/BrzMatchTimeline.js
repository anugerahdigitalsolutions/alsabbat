import React from 'react';
import {
  ArrowLeftRight,
  CircleDot,
  Square,
  Target,
} from 'lucide-react';

const EVENT_META = {
  GOAL: { label: 'Gol', icon: CircleDot, color: 'var(--brz-accent)' },
  PENALTY_SCORED: { label: 'Gol (Penalti)', icon: CircleDot, color: 'var(--brz-accent)' },
  OWN_GOAL: { label: 'Gol Sendiri', icon: CircleDot, color: 'var(--brz-lose)' },
  PENALTY_MISSED: { label: 'Penalti Gagal', icon: Target, color: 'var(--brz-text-muted)' },
  ASSIST: { label: 'Assist', icon: Target, color: 'var(--brz-text-muted)' },
  YELLOW_CARD: { label: 'Kartu Kuning', icon: Square, color: '#facc15' },
  SECOND_YELLOW_CARD: { label: 'Kuning Kedua', icon: Square, color: '#facc15' },
  RED_CARD: { label: 'Kartu Merah', icon: Square, color: 'var(--brz-live)' },
  SUBSTITUTION: { label: 'Pergantian', icon: ArrowLeftRight, color: 'var(--brz-text-muted)' },
  OTHER: { label: 'Kejadian', icon: CircleDot, color: 'var(--brz-text-muted)' },
};

const minuteLabel = (event) => {
  if (event.minute === null || event.minute === undefined) return null;
  return `${event.minute}${event.minute_extra ? `+${event.minute_extra}` : ''}'`;
};

const playerName = (event, players) =>
  event.player_name || players?.[event.player_id]?.display_name || players?.[event.player_id]?.full_name || null;

const relatedName = (event, players) =>
  event.related_player_name ||
  players?.[event.related_player_id]?.display_name ||
  players?.[event.related_player_id]?.full_name ||
  null;

/** Match timeline — rendered only from real `/api/matches/{id}/relations` events. */
export const BrzMatchTimeline = ({ events = [], players = {}, testId = 'brz-timeline' }) => (
  <ol className="flex flex-col gap-2" data-testid={testId}>
    {events.map((event) => {
      const meta = EVENT_META[event.type] || EVENT_META.OTHER;
      const Icon = meta.icon;
      const name = playerName(event, players);
      const related = relatedName(event, players);
      const minute = minuteLabel(event);
      const opponentSide = event.side === 'OPPONENT';

      return (
        <li key={event.id} className="brz-tile flex items-center gap-3 px-3 py-2.5">
          <span
            className="flex w-[38px] flex-none justify-center text-[12px] font-bold tabular-nums"
            style={{ color: 'var(--brz-text-muted)' }}
          >
            {minute || '—'}
          </span>
          <Icon size={15} style={{ color: meta.color }} aria-hidden="true" className="flex-none" />
          <span className="min-w-0 flex-1">
            <span className="brz-clamp-1 block text-[13px] font-semibold">{name || meta.label}</span>
            <span className="brz-clamp-1 block text-[11px]" style={{ color: 'var(--brz-text-dim)' }}>
              {name ? meta.label : event.description || meta.label}
              {related ? ` · ${related}` : ''}
            </span>
          </span>
          {opponentSide ? <span className="brz-badge flex-none">Lawan</span> : null}
        </li>
      );
    })}
  </ol>
);

export default BrzMatchTimeline;
