import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, Goal, Handshake, Square, Trophy } from 'lucide-react';
import { Reveal } from '../Reveal';
import { EmptyState } from '../../shared/EmptyState';

const CATEGORIES = [
  { key: 'goals', label: 'Top Skor', unit: 'GOL', Icon: Goal },
  { key: 'assists', label: 'Top Assist', unit: 'ASSIST', Icon: Handshake },
  { key: 'appearances', label: 'Penampilan Terbanyak', unit: 'MAIN', Icon: Trophy },
  { key: 'yellow_cards', label: 'Kartu Kuning', unit: 'KARTU', Icon: Square },
  { key: 'red_cards', label: 'Kartu Merah', unit: 'KARTU', Icon: Square },
];

const TOP_N = 3;

const playerName = (player) => player.display_name || player.full_name || 'Pemain';

const StatCard = ({ category, players, index }) => {
  const { key, label, unit, Icon } = category;
  const rows = players
    .filter((p) => Number(p[key] || 0) > 0)
    .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0) || playerName(a).localeCompare(playerName(b)))
    .slice(0, TOP_N);

  if (!rows.length) return null;

  return (
    <Reveal
      delay={index * 60}
      className="als-card p-4 sm:p-5"
      data-testid={`player-stats-card-${key}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor: key === 'red_cards' ? 'rgba(220,38,38,0.12)' : 'rgba(1,40,145,0.08)',
            color: key === 'red_cards' ? '#991B1B' : 'var(--club-secondary)',
          }}
          aria-hidden="true"
        >
          <Icon
            className="h-4 w-4"
            fill={key === 'yellow_cards' ? '#FCCF2B' : key === 'red_cards' ? '#DC2626' : 'none'}
          />
        </span>
        <h3
          className="font-display truncate text-sm font-bold uppercase tracking-wide"
          style={{ color: 'var(--club-secondary)' }}
        >
          {label}
        </h3>
      </div>

      <ol className="space-y-1.5">
        {rows.map((player, rank) => (
          <li key={player.id}>
            <Link
              to={`/players/${player.id}`}
              className="als-focus flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition-colors duration-300 hover:bg-[rgba(1,40,145,0.05)]"
              style={{ backgroundColor: rank === 0 ? 'rgba(252,207,43,0.16)' : 'transparent' }}
              data-testid={`player-stats-${key}-${rank}`}
            >
              <span
                className="font-display w-6 shrink-0 text-xs font-bold tabular-nums"
                style={{ color: rank === 0 ? '#000000' : 'var(--muted-fg)' }}
              >
                {String(rank + 1).padStart(2, '0')}
              </span>
              <span className="font-display min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                {playerName(player)}
              </span>
              <span className="font-display shrink-0 text-sm font-bold tabular-nums" style={{ color: 'var(--club-secondary)' }}>
                {Number(player[category.key] || 0)}
                <span className="ml-1 text-[10px] font-semibold tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                  {unit}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Reveal>
  );
};

/**
 * Section STATISTIK PEMAIN — peringkat otomatis dari data pemain existing.
 * Kategori dengan seluruh nilai 0 tidak ditampilkan; bila semua 0 => empty state.
 */
export const PlayerStatsBoard = ({ players = [] }) => {
  const cards = useMemo(
    () =>
      CATEGORIES.filter((category) => players.some((p) => Number(p[category.key] || 0) > 0)),
    [players]
  );

  if (!cards.length) {
    return (
      <EmptyState
        icon={Award}
        title="Statistik pemain belum tersedia"
        description="Gol, assist, penampilan, dan kartu akan tampil di sini setelah statistik pemain diperbarui di Admin Panel."
        testId="player-stats-empty"
      />
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      data-testid="player-stats-board"
    >
      {cards.map((category, index) => (
        <StatCard key={category.key} category={category} players={players} index={index} />
      ))}
    </div>
  );
};

export default PlayerStatsBoard;
