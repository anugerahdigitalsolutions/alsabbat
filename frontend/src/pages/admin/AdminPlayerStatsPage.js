import React, { useCallback, useEffect, useState } from 'react';
import { Info, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';

const COLUMNS = [
  { key: 'goals', label: 'Gol' },
  { key: 'assists', label: 'Assist' },
  { key: 'appearances', label: 'Penampilan' },
  { key: 'yellow_cards', label: 'Kartu Kuning' },
  { key: 'red_cards', label: 'Kartu Merah' },
];

const playerName = (p) => p.display_name || p.full_name || 'Pemain';

/** Admin → Statistik Pemain (read-only, dihitung otomatis dari Match Events). */
export default function AdminPlayerStatsPage() {
  const [seasonId, setSeasonId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetSeason) => {
    setLoading(true);
    try {
      const { data: payload } = await api.get('/players/stats/leaderboard', {
        params: { limit: 200, ...(targetSeason ? { season_id: targetSeason } : {}) },
      });
      setData(payload);
      if (!targetSeason && payload?.season?.id) setSeasonId(payload.season.id);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat statistik pemain'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  const seasons = data?.seasons || [];
  const items = data?.items || [];

  return (
    <div className="space-y-5" data-testid="admin-player-stats">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Statistik Pemain</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
            Dihitung otomatis dari Match Events, dipisah per musim. Tidak ada input manual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {seasons.length ? (
            <Select
              value={seasonId}
              onValueChange={(value) => {
                setSeasonId(value);
                load(value);
              }}
            >
              <SelectTrigger className="w-56 bg-white" data-testid="admin-player-stats-season">
                <SelectValue placeholder="Pilih musim" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.name} {season.status === 'ACTIVE' ? '(aktif)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button variant="outline" onClick={() => load(seasonId)} data-testid="admin-player-stats-reload">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Muat ulang
          </Button>
        </div>
      </div>

      <p
        className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs font-semibold uppercase tracking-wide"
        style={{ backgroundColor: 'rgba(1,40,145,0.06)', color: 'var(--club-secondary)' }}
        data-testid="admin-player-stats-note"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Dihitung otomatis dari Match Events
      </p>

      {loading ? (
        <LoadingState rows={4} testId="admin-player-stats-loading" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada statistik pada musim ini"
          description={
            data?.season
              ? 'Catat Match Events (gol, assist, kartu) pada pertandingan musim ini agar statistik muncul.'
              : 'Belum ada musim yang tersedia. Buat Season terlebih dahulu di menu Seasons.'
          }
          testId="admin-player-stats-empty"
        />
      ) : (
        <div className="als-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Musim</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Pemain</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((player) => (
                <tr key={player.id} className="border-t" data-testid={`admin-player-stats-row-${player.id}`}>
                  <td className="px-4 py-3" style={{ color: 'var(--muted-fg)' }}>
                    {data?.season?.name || '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold">{playerName(player)}</td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-right tabular-nums">
                      {Number(player[column.key] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
