import React, { useState } from 'react';
import { Swords } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { MatchCardShell } from '../../components/public/MatchCardShell';
import { Reveal } from '../../components/public/Reveal';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useResourceList } from '../../hooks/useResourceList';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useSiteText } from '../../lib/siteContent';
import { useClub } from '../../context/ClubContext';

const UPCOMING = ['SCHEDULED', 'UPCOMING', 'LIVE', 'POSTPONED'];

export default function MatchesPage() {
  const { clubName, shortName } = useClub();
  const t = useSiteText({ club: shortName || clubName || 'ALSABBAT' });
  usePageSeo({ title: 'Pertandingan', description: 'Jadwal, hasil, dan Pusat Pertandingan ALSABBAT Football Club.', path: '/matches' });
  const [seasonId, setSeasonId] = useState('all');
  const [tab, setTab] = useState('upcoming');

  const seasons = useResourceList('/seasons', { limit: 50 });
  const { items, loading, error, reload } = useResourceList('/matches', {
    limit: 60,
    ...(seasonId !== 'all' ? { season_id: seasonId } : {}),
  });

  const upcoming = items.filter((m) => UPCOMING.includes(m.status));
  const results = items.filter((m) => !UPCOMING.includes(m.status));
  const shown = tab === 'upcoming' ? upcoming : results;

  return (
    <div data-testid="page-matches">
      <PublicPageHeader
        label={t('matches.header.label')}
        title={t('matches.header.title')}
        description={t('matches.header.description')}
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Pertandingan' }]}
        meta={
          <>
            <span data-testid="matches-meta-upcoming">{upcoming.length} pertandingan akan datang</span>
            <span data-testid="matches-meta-results">{results.length} hasil pertandingan</span>
          </>
        }
      />
      <div className="als-container py-10 sm:py-14">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList data-testid="matches-tabs">
              <TabsTrigger value="upcoming" data-testid="matches-tab-upcoming">
                Akan Datang ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="results" data-testid="matches-tab-results">
                Hasil ({results.length})
              </TabsTrigger>
            </TabsList>

            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger className="w-full sm:w-64 bg-white" data-testid="matches-season-filter">
                <SelectValue placeholder="Semua musim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua musim</SelectItem>
                {seasons.items.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value={tab} forceMount>
            {loading ? (
              <LoadingState rows={3} testId="matches-loading" />
            ) : error ? (
              <ErrorState message={error} onRetry={reload} testId="matches-error" />
            ) : shown.length === 0 ? (
              <EmptyState
                icon={Swords}
                title={tab === 'upcoming' ? 'Belum ada jadwal pertandingan' : 'Belum ada hasil pertandingan'}
                description="Data pertandingan dikelola melalui Admin Panel pada modul Pertandingan."
                testId="matches-empty"
              />
            ) : (
              <div className="als-stagger grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((match, index) => (
                  <Reveal key={match.id} delay={Math.min(index, 6) * 70}>
                    <MatchCardShell match={match} testId={`match-card-${match.id}`} />
                  </Reveal>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
