import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import api from '../../lib/api';
import { EmptyState } from '../shared/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const ROWS = [
  ['appearances', 'Penampilan'],
  ['starts', 'Starter'],
  ['substitute_appearances', 'Pengganti'],
  ['goals', 'Gol'],
  ['assists', 'Assist'],
  ['yellow_cards', 'Kartu Kuning'],
  ['red_cards', 'Kartu Merah'],
];

/** Season statistics derived from Match Events (never invented). */
export const PlayerSeasonStats = ({ playerId }) => {
  const [seasons, setSeasons] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/players/${playerId}/statistics`);
        if (!active) return;
        setSeasons(data?.seasons || []);
        setSelected((data?.seasons || [])[0]?.season_id ?? null);
      } catch (e) {
        if (active) setSeasons([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [playerId]);

  const current = useMemo(
    () => seasons.find((s) => (s.season_id ?? null) === selected) || seasons[0] || null,
    [seasons, selected]
  );

  if (loading) {
    return (
      <div className="als-card p-6" data-testid="player-season-stats-loading">
        <p className="als-section-label">Statistik Musim</p>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
          Memuat statistik…
        </p>
      </div>
    );
  }

  if (!seasons.length) {
    return (
      <div className="als-card p-6" data-testid="player-season-stats">
        <p className="als-section-label mb-4">Statistik Musim</p>
        <EmptyState
          icon={BarChart3}
          title="Statistik belum tersedia"
          description="Statistik dihitung otomatis dari kejadian pertandingan. Tambahkan event pertandingan untuk melihat angkanya."
          testId="player-season-stats-empty"
        />
      </div>
    );
  }

  return (
    <div className="als-card p-6 sm:p-8" data-testid="player-season-stats">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="als-section-label">Statistik Musim</p>
          <span className="als-gold-rule mt-2" aria-hidden="true" />
        </div>
        {seasons.length > 1 ? (
          <Select
            value={String(selected ?? 'none')}
            onValueChange={(value) => setSelected(value === 'none' ? null : value)}
          >
            <SelectTrigger className="w-[190px] min-h-[44px]" aria-label="Pilih musim" data-testid="player-stats-season-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.season_id ?? 'none'} value={String(season.season_id ?? 'none')}>
                  {season.season_name || 'Tanpa musim'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <p className="mt-4 text-sm font-semibold" data-testid="player-stats-season-label">
        {current?.season_name || 'Tanpa musim terkait'}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ROWS.map(([key, label]) => {
          const value = current?.[key];
          const unavailable = value === null || value === undefined;
          return (
            <div key={key} data-testid={`player-stat-${key}`}>
              <dd
                className="font-display text-2xl font-extrabold tabular-nums"
                style={{ color: unavailable ? 'var(--muted-fg)' : 'var(--club-secondary)' }}
              >
                {unavailable ? '—' : value}
              </dd>
              <dt className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted-fg)' }}>
                {label}
              </dt>
            </div>
          );
        })}
      </dl>

      {current && !current.events_available ? (
        <p className="mt-5 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="player-stats-events-note">
          Gol, assist, dan kartu belum dapat dihitung karena kejadian pertandingan (Match Events) musim ini
          belum dicatat. Angka penampilan dihitung dari susunan pemain.
        </p>
      ) : null}
    </div>
  );
};

export default PlayerSeasonStats;
