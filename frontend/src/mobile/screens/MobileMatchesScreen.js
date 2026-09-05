import React, { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BarayaNotificationButton } from '../components/BarayaNotificationButton';
import { BrzMatchCard } from '../components/BrzMatchCard';
import { BrzEmpty, BrzError, BrzLoading } from '../components/BrzStates';
import { hasScore, isUpcomingStatus, kickoffAt } from '../lib/matchUtils';

/**
 * BARAYA AL SABBAT — Match screen.
 * Uses the existing `/api/matches` and `/api/seasons` endpoints.
 */
export default function MobileMatchesScreen() {
  const [tab, setTab] = useState('upcoming');
  const [seasonId, setSeasonId] = useState('all');

  usePageSeo({
    title: 'Pertandingan',
    description: 'Jadwal, hasil, dan Pusat Pertandingan AL SABBAT Football Club.',
    path: '/matches',
  });

  const seasons = useResourceList('/seasons', { limit: 50 });
  const { items, loading, error, reload } = useResourceList('/matches', {
    limit: 80,
    ...(seasonId !== 'all' ? { season_id: seasonId } : {}),
  });

  const { upcoming, results } = useMemo(() => {
    const up = items
      .filter((match) => isUpcomingStatus(match.status) && !hasScore(match))
      .sort((a, b) => (kickoffAt(a)?.getTime?.() ?? 0) - (kickoffAt(b)?.getTime?.() ?? 0));
    const done = items
      .filter((match) => !(isUpcomingStatus(match.status) && !hasScore(match)))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return { upcoming: up, results: done };
  }, [items]);

  const shown = tab === 'upcoming' ? upcoming : results;

  return (
    <div data-testid="baraya-matches">
      <BarayaTopBar title="Pertandingan" actions={<BarayaNotificationButton />} testId="brz-matches-topbar" />

      <div className="brz-page">
        <div className="flex gap-2" role="tablist" aria-label="Filter pertandingan">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'upcoming'}
            className={`brz-chip flex-1 justify-center${tab === 'upcoming' ? ' brz-chip--active' : ''}`}
            onClick={() => setTab('upcoming')}
            data-testid="brz-matches-tab-upcoming"
          >
            Akan Datang ({upcoming.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'results'}
            className={`brz-chip flex-1 justify-center${tab === 'results' ? ' brz-chip--active' : ''}`}
            onClick={() => setTab('results')}
            data-testid="brz-matches-tab-results"
          >
            Hasil ({results.length})
          </button>
        </div>

        {seasons.items.length > 0 ? (
          <div className="brz-hscroll -mx-4 mt-3" data-testid="brz-matches-seasons">
            <button
              type="button"
              className={`brz-chip${seasonId === 'all' ? ' brz-chip--active' : ''}`}
              onClick={() => setSeasonId('all')}
            >
              Semua musim
            </button>
            {seasons.items.map((season) => (
              <button
                key={season.id}
                type="button"
                className={`brz-chip${seasonId === season.id ? ' brz-chip--active' : ''}`}
                onClick={() => setSeasonId(season.id)}
              >
                {season.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <BrzLoading rows={3} height={132} testId="brz-matches-loading" />
          ) : error ? (
            <BrzError message={error} onRetry={reload} testId="brz-matches-error" />
          ) : shown.length === 0 ? (
            <BrzEmpty
              icon={CalendarDays}
              title={tab === 'upcoming' ? 'Belum ada jadwal pertandingan' : 'Belum ada hasil pertandingan'}
              description="Data pertandingan dikelola melalui Admin Panel pada modul Pertandingan."
              testId="brz-matches-empty"
            />
          ) : (
            shown.map((match, index) => (
              <BrzMatchCard
                key={match.id}
                match={match}
                variant={index === 0 && tab === 'upcoming' ? 'featured' : 'row'}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
