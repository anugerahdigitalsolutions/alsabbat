import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Goal, Handshake, Trophy } from 'lucide-react';
import api from '../../../lib/api';
import { Reveal } from '../Reveal';
import { resolveMediaUrl } from '../gallery/mediaUtils';

const TABS = [
  { key: 'goals', label: 'Top Skor', unit: 'GOL', Icon: Goal },
  { key: 'assists', label: 'Top Assist', unit: 'ASSIST', Icon: Handshake },
];

const TOP_N = 5;
const playerName = (p) => p.display_name || p.full_name || 'Pemain';

/**
 * Ringkasan TOP SKOR / TOP ASSIST di Beranda — statistik musim aktif,
 * dihitung otomatis dari Match Events (endpoint /players/stats/leaderboard).
 */
export const TopScorersShowcase = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('goals');

  const load = useCallback(() => {
    api
      .get('/players/stats/leaderboard', { params: { limit: 30 } })
      .then(({ data: payload }) => setData(payload))
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const items = (data?.items || []).filter((p) => Number(p[tab] || 0) > 0);
    return items
      .sort((a, b) => Number(b[tab] || 0) - Number(a[tab] || 0) || playerName(a).localeCompare(playerName(b)))
      .slice(0, TOP_N);
  }, [data, tab]);

  const hasAny = (data?.items || []).some(
    (p) => Number(p.goals || 0) > 0 || Number(p.assists || 0) > 0
  );
  if (!hasAny) return null;

  const active = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <Reveal className="als-card p-4 sm:p-5" data-testid="home-top-scorers">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="font-display text-base font-bold uppercase tracking-wide sm:text-lg"
            style={{ color: 'var(--club-secondary)' }}
          >
            {active.label}
          </h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-fg)' }}>
            {data?.season?.name ? `Musim ${data.season.name}` : 'Musim aktif'} · dihitung otomatis dari match events
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" role="tablist" aria-label="Kategori statistik">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={item.key === tab}
              onClick={() => setTab(item.key)}
              className="als-focus font-display rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-300"
              style={
                item.key === tab
                  ? { backgroundColor: 'var(--club-primary)', color: '#000000' }
                  : { backgroundColor: 'rgba(1,40,145,0.06)', color: 'var(--club-secondary)' }
              }
              data-testid={`home-top-scorers-tab-${item.key}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="home-top-scorers-empty">
          Belum ada {active.label.toLowerCase()} pada musim ini.
        </p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((player, rank) => (
            <li key={player.id}>
              <a
                href={`/players/${player.id}`}
                className="als-focus flex items-center gap-3 rounded-[var(--radius-sm)] p-2 transition-colors duration-300 hover:bg-[rgba(1,40,145,0.05)]"
                style={{ backgroundColor: rank === 0 ? 'rgba(252,207,43,0.16)' : 'transparent' }}
                data-testid={`home-top-scorers-${tab}-${rank}`}
              >
                <span
                  className="font-display w-6 shrink-0 text-xs font-bold tabular-nums"
                  style={{ color: rank === 0 ? '#000000' : 'var(--muted-fg)' }}
                >
                  {String(rank + 1).padStart(2, '0')}
                </span>
                <span
                  className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'rgba(1,40,145,0.08)' }}
                >
                  {player.photo ? (
                    <img
                      src={resolveMediaUrl(player.photo)}
                      alt={playerName(player)}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center">
                      <Trophy className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                    {playerName(player)}
                  </span>
                  {player.position ? (
                    <span className="block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                      {player.position}
                    </span>
                  ) : null}
                </span>
                <span className="font-display shrink-0 text-sm font-bold tabular-nums" style={{ color: 'var(--club-secondary)' }}>
                  {Number(player[tab] || 0)}
                  <span className="ml-1 text-[10px] font-semibold tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    {active.unit}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </Reveal>
  );
};

export default TopScorersShowcase;
