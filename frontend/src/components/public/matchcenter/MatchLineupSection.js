import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { EmptyState } from '../../shared/EmptyState';

const LineupRow = ({ entry, player, testId }) => {
  const name = player ? player.display_name || player.full_name : 'Pemain';
  const number = entry.shirt_number ?? player?.jersey_number;
  const positionLabel = entry.position_label || entry.position || player?.position;

  const content = (
    <>
      <span
        className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold tabular-nums"
        style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
      >
        {number ?? '-'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {positionLabel ? (
          <span className="block text-xs" style={{ color: 'var(--muted-fg)' }}>
            {positionLabel}
          </span>
        ) : null}
      </span>
      {entry.is_captain ? (
        <Badge
          variant="outline"
          className="shrink-0 text-[10px] font-bold"
          style={{ backgroundColor: 'rgba(252,207,43,0.18)', borderColor: 'rgba(252,207,43,0.5)', color: '#7A5A00' }}
        >
          C
        </Badge>
      ) : null}
      {entry.minutes_played !== null && entry.minutes_played !== undefined ? (
        <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }}>
          {entry.minutes_played}&#39;
        </span>
      ) : null}
    </>
  );

  const base =
    'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-colors duration-200 hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2';

  return player?.id ? (
    <Link to={`/players/${player.id}`} className={base} style={{ '--tw-ring-color': 'var(--focus-ring)' }} data-testid={testId}>
      {content}
    </Link>
  ) : (
    <div className={base} data-testid={testId}>
      {content}
    </div>
  );
};

const LineupGroup = ({ title, entries, playersById, testId }) => (
  <div className="als-card p-5" data-testid={testId}>
    <div className="mb-4 flex items-center justify-between">
      <p className="als-section-label">{title}</p>
      <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--muted-fg)' }}>
        {entries.length} pemain
      </span>
    </div>
    <div className="space-y-1">
      {entries.map((entry) => (
        <LineupRow
          key={entry.id}
          entry={entry}
          player={playersById?.[entry.player_id]}
          testId={`${testId}-row-${entry.id}`}
        />
      ))}
    </div>
  </div>
);

/**
 * Lineup section. Lineup documents are stored one-per-player-per-match;
 * grouping into Starting XI / Substitutes happens here on the client.
 */
export const MatchLineupSection = ({ lineups = [], playersById = {}, formation }) => {
  const starting = lineups.filter((l) => l.role === 'STARTING');
  const substitutes = lineups.filter((l) => l.role === 'SUBSTITUTE' || l.role === 'UNUSED_SUBSTITUTE');

  if (!lineups.length) {
    return (
      <EmptyState
        icon={Users}
        title="Susunan pemain belum tersedia"
        description="Susunan pemain inti dan cadangan akan tampil di sini setelah diinput melalui Admin Panel."
        testId="match-lineup-empty"
      />
    );
  }

  return (
    <div className="space-y-5" data-testid="match-lineup-section">
      {formation ? (
        <div className="flex items-center gap-2" data-testid="match-formation">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            Formasi
          </span>
          <Badge
            variant="outline"
            className="font-display font-bold"
            style={{ backgroundColor: 'rgba(1,40,145,0.06)', color: 'var(--club-secondary)' }}
          >
            {formation}
          </Badge>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {starting.length ? (
          <LineupGroup
            title="Pemain Inti"
            entries={starting}
            playersById={playersById}
            testId="match-lineup-starting"
          />
        ) : null}
        {substitutes.length ? (
          <LineupGroup
            title="Pemain Cadangan"
            entries={substitutes}
            playersById={playersById}
            testId="match-lineup-substitutes"
          />
        ) : null}
      </div>
    </div>
  );
};

export default MatchLineupSection;
