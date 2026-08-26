import React from 'react';
import { Award, Handshake, Shield, Star } from 'lucide-react';

const CELLS = [
  { id: 'played', label: 'Matches Played', Icon: Shield, tint: 'rgba(1,40,145,0.08)', color: 'var(--club-secondary)' },
  { id: 'wins', label: 'Wins', Icon: Star, tint: 'rgba(252,207,43,0.22)', color: '#7A5A00' },
  { id: 'draws', label: 'Draws', Icon: Handshake, tint: 'rgba(1,40,145,0.06)', color: 'var(--club-secondary)' },
  { id: 'losses', label: 'Losses', Icon: Award, tint: 'rgba(0,0,0,0.06)', color: '#000000' },
];

/** Team stats derived from finished matches; `—` when no match data exists yet. */
export const TeamStatsBlock = ({ stats }) => (
  <div className="grid grid-cols-2 gap-4" data-testid="home-team-stats">
    {CELLS.map(({ id, label, Icon, tint, color }) => (
      <div key={id} className="als-card flex flex-col items-center px-3 py-5 text-center" data-testid={`home-team-stat-${id}`}>
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: tint }}>
          <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
        </span>
        <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color: 'var(--club-secondary)' }}>
          {stats?.[id] ?? '—'}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-fg)' }}>
          {label}
        </p>
      </div>
    ))}
  </div>
);

export default TeamStatsBlock;
