import React from 'react';
import { ListOrdered } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';
import { eventMeta, minuteLabel, playerLabel } from './eventMeta';

const TimelineRow = ({ event, playersById, clubName }) => {
  const { label, Icon, color } = eventMeta(event.type);
  const main = playerLabel(playersById, event.player_id, event.player_name);
  const related = playerLabel(playersById, event.related_player_id, event.related_player_name);
  const isOpponent = event.side === 'OPPONENT';

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0" data-testid={`match-event-${event.id}`}>
      <span
        className="absolute left-[19px] top-9 bottom-0 w-px last:hidden"
        style={{ backgroundColor: 'var(--border-soft)' }}
        aria-hidden="true"
      />
      <span
        className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--surface-3)' }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color, height: '1.1rem', width: '1.1rem' }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-display text-sm font-bold tabular-nums"
            style={{ color: 'var(--club-secondary)' }}
          >
            {minuteLabel(event)}
          </span>
          <span className="text-sm font-semibold">{label}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: isOpponent ? 'rgba(34,34,34,0.07)' : 'rgba(252,207,43,0.2)',
              color: isOpponent ? 'var(--muted-fg)' : '#7A5A00',
            }}
          >
            {isOpponent ? 'Lawan' : clubName}
          </span>
        </div>
        {main ? (
          <p className="mt-1 text-sm" style={{ color: 'var(--fg)' }}>
            {main}
            {related ? (
              <span style={{ color: 'var(--muted-fg)' }}>
                {event.type === 'SUBSTITUTION' ? ' ← ' : ' · assist '}
                {related}
              </span>
            ) : null}
          </p>
        ) : null}
        {event.description ? (
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
            {event.description}
          </p>
        ) : null}
      </div>
    </li>
  );
};

/** Chronological match timeline (goals, cards, substitutions). */
export const MatchTimeline = ({ events = [], playersById = {}, clubName = 'ALSABBAT' }) => {
  if (!events.length) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="Belum ada catatan kejadian"
        description="Gol, kartu, dan pergantian pemain akan muncul pada timeline setelah diinput di Admin Panel."
        testId="match-events-empty"
      />
    );
  }

  return (
    <ol className="als-card p-5" data-testid="match-timeline">
      {events.map((event) => (
        <TimelineRow key={event.id} event={event} playersById={playersById} clubName={clubName} />
      ))}
    </ol>
  );
};

export default MatchTimeline;
