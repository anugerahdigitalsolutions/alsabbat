import React from 'react';
import { ListOrdered } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';
import { eventMeta, minuteLabel, playerLabel } from './eventMeta';

/** Visual tone per event family — stays inside brand + semantic tokens. */
const TONES = {
  GOLD: { accent: 'var(--club-primary)', tint: 'rgba(252,207,43,0.14)', ring: 'rgba(252,207,43,0.45)' },
  RED: { accent: 'var(--error)', tint: 'rgba(220,38,38,0.10)', ring: 'rgba(220,38,38,0.35)' },
  BLUE: { accent: 'var(--club-secondary)', tint: 'rgba(1,40,145,0.07)', ring: 'rgba(1,40,145,0.28)' },
  NEUTRAL: { accent: 'var(--muted-fg)', tint: 'var(--surface-2)', ring: 'var(--border-soft)' },
};

const toneFor = (type) => {
  if (type === 'GOAL' || type === 'PENALTY_SCORED' || type === 'ASSIST') return TONES.GOLD;
  if (type === 'YELLOW_CARD' || type === 'SECOND_YELLOW_CARD') return TONES.GOLD;
  if (type === 'RED_CARD' || type === 'OWN_GOAL' || type === 'PENALTY_MISSED') return TONES.RED;
  if (type === 'SUBSTITUTION') return TONES.BLUE;
  return TONES.NEUTRAL;
};

const isHighlight = (type) => type === 'GOAL' || type === 'PENALTY_SCORED';

const TimelineRow = ({ event, playersById, clubName, last }) => {
  const { label, Icon } = eventMeta(event.type);
  const tone = toneFor(event.type);
  const main = playerLabel(playersById, event.player_id, event.player_name);
  const related = playerLabel(playersById, event.related_player_id, event.related_player_name);
  const isOpponent = event.side === 'OPPONENT';

  return (
    <li className={`relative flex gap-4 ${last ? '' : 'pb-6'}`} data-testid={`match-event-${event.id}`}>
      {last ? null : (
        <span
          className="absolute left-[21px] top-11 bottom-0 w-px"
          style={{ backgroundColor: 'var(--border-soft)' }}
          aria-hidden="true"
        />
      )}
      <span
        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: tone.tint, border: `1px solid ${tone.ring}` }}
      >
        <Icon style={{ color: tone.accent, height: '1.15rem', width: '1.15rem' }} aria-hidden="true" />
      </span>

      <div
        className="min-w-0 flex-1 rounded-[var(--radius-md)] px-4 py-3"
        style={{
          backgroundColor: isHighlight(event.type) ? tone.tint : 'var(--surface-2)',
          borderLeft: `3px solid ${tone.accent}`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-display rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
            style={{ backgroundColor: 'var(--club-tertiary)', color: 'var(--club-primary)' }}
          >
            {minuteLabel(event)}
          </span>
          <span className="font-display text-sm font-bold" style={{ color: 'var(--fg)' }}>
            {label}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: isOpponent ? 'rgba(34,34,34,0.07)' : 'rgba(252,207,43,0.22)',
              color: isOpponent ? 'var(--muted-fg)' : '#7A5A00',
            }}
          >
            {isOpponent ? 'Lawan' : clubName}
          </span>
        </div>
        {main ? (
          <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {main}
            {related ? (
              <span className="font-normal" style={{ color: 'var(--muted-fg)' }}>
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
    <div className="als-card p-5 sm:p-6" data-testid="match-timeline">
      <p className="als-section-label mb-5">Timeline Pertandingan</p>
      <ol>
        {events.map((event, index) => (
          <TimelineRow
            key={event.id}
            event={event}
            playersById={playersById}
            clubName={clubName}
            last={index === events.length - 1}
          />
        ))}
      </ol>
    </div>
  );
};

export default MatchTimeline;
