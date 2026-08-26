import React from 'react';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';
import { eventMeta, minuteLabel, playerLabel } from './eventMeta';

const GOAL_TYPES = ['GOAL', 'PENALTY_SCORED'];
const CARD_YELLOW = ['YELLOW_CARD', 'SECOND_YELLOW_CARD'];

const countBySide = (events, types) => {
  const club = events.filter((e) => types.includes(e.type) && e.side !== 'OPPONENT').length;
  const opponent = events.filter((e) => types.includes(e.type) && e.side === 'OPPONENT').length;
  return { club, opponent, total: club + opponent };
};

const StatRow = ({ label, club, opponent, testId }) => (
  <div
    className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 border-b py-2.5 last:border-b-0"
    style={{ borderColor: 'var(--border-soft)' }}
    data-testid={testId}
  >
    <span className="font-display text-center text-lg font-bold tabular-nums" style={{ color: 'var(--club-secondary)' }}>
      {club}
    </span>
    <span className="text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
      {label}
    </span>
    <span className="font-display text-center text-lg font-bold tabular-nums">{opponent}</span>
  </div>
);

const EventLine = ({ event, playersById, testId }) => {
  const { label } = eventMeta(event.type);
  const main = playerLabel(playersById, event.player_id, event.player_name);
  const related = playerLabel(playersById, event.related_player_id, event.related_player_name);
  return (
    <li className="flex flex-wrap items-center gap-2 py-1.5 text-sm" data-testid={testId}>
      <span
        className="font-display rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
        style={{ backgroundColor: '#000000', color: 'var(--club-primary)' }}
      >
        {minuteLabel(event)}
      </span>
      <span className="font-semibold">{main || label}</span>
      {related ? (
        <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          {event.type === 'SUBSTITUTION' ? `masuk untuk ${related}` : `assist ${related}`}
        </span>
      ) : null}
      {event.side === 'OPPONENT' ? (
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
          Lawan
        </span>
      ) : null}
    </li>
  );
};

const Block = ({ title, events, playersById, testId }) =>
  events.length ? (
    <div data-testid={testId}>
      <p className="als-section-label mb-2">{title}</p>
      <ul>
        {events.map((event) => (
          <EventLine
            key={event.id}
            event={event}
            playersById={playersById}
            testId={`${testId}-item-${event.id}`}
          />
        ))}
      </ul>
    </div>
  ) : null;

/**
 * Match statistics derived ONLY from existing MatchEvent / MatchLineup data.
 * Metrics without a data source (possession, shots, corners, ...) are not shown.
 */
export const MatchStatistics = ({ events = [], lineups = [], playersById = {} }) => {
  const rows = [
    { key: 'goals', label: 'Gol', ...countBySide(events, GOAL_TYPES) },
    { key: 'own-goals', label: 'Gol Sendiri', ...countBySide(events, ['OWN_GOAL']) },
    { key: 'assists', label: 'Assist', ...countBySide(events, ['ASSIST']) },
    { key: 'penalty-missed', label: 'Penalti Gagal', ...countBySide(events, ['PENALTY_MISSED']) },
    { key: 'yellow-cards', label: 'Kartu Kuning', ...countBySide(events, CARD_YELLOW) },
    { key: 'red-cards', label: 'Kartu Merah', ...countBySide(events, ['RED_CARD']) },
    { key: 'substitutions', label: 'Pergantian', ...countBySide(events, ['SUBSTITUTION']) },
  ].filter((row) => row.total > 0);

  const starters = lineups.filter((l) => l.role === 'STARTING').length;
  const subs = lineups.filter((l) => l.role === 'SUBSTITUTE' || l.role === 'UNUSED_SUBSTITUTE').length;

  if (!rows.length && !lineups.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Statistik pertandingan belum tersedia"
        description="Statistik dihitung otomatis dari kejadian pertandingan (gol, kartu, pergantian) setelah diinput melalui Admin Panel."
        testId="match-statistics-empty"
      />
    );
  }

  const goals = events.filter((e) => GOAL_TYPES.includes(e.type) || e.type === 'OWN_GOAL');
  const cards = events.filter((e) => CARD_YELLOW.includes(e.type) || e.type === 'RED_CARD');
  const substitutions = events.filter((e) => e.type === 'SUBSTITUTION');

  return (
    <div className="space-y-6" data-testid="match-statistics">
      <div className="als-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="als-section-label">Statistik Pertandingan</p>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            AL SABBAT · Lawan
          </span>
        </div>
        {rows.length ? (
          <div>
            {rows.map((row) => (
              <StatRow
                key={row.key}
                label={row.label}
                club={row.club}
                opponent={row.opponent}
                testId={`match-stat-${row.key}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="match-stat-no-events">
            Kejadian pertandingan belum diinput, sehingga statistik belum dapat dihitung.
          </p>
        )}

        {lineups.length ? (
          <div
            className="mt-5 grid grid-cols-2 gap-4 border-t pt-4"
            style={{ borderColor: 'var(--border-soft)' }}
            data-testid="match-stat-squad"
          >
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Pemain Inti
              </p>
              <p className="font-display text-lg font-bold tabular-nums">{starters}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Pemain Cadangan
              </p>
              <p className="font-display text-lg font-bold tabular-nums">{subs}</p>
            </div>
          </div>
        ) : null}
      </div>

      {goals.length || cards.length || substitutions.length ? (
        <div className="als-card space-y-5 p-5 sm:p-6">
          <Block title="Gol" events={goals} playersById={playersById} testId="match-stat-goals-list" />
          <Block title="Kartu" events={cards} playersById={playersById} testId="match-stat-cards-list" />
          <Block
            title="Pergantian"
            events={substitutions}
            playersById={playersById}
            testId="match-stat-subs-list"
          />
        </div>
      ) : null}
    </div>
  );
};

export default MatchStatistics;
