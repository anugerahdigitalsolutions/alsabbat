import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Reveal } from '../../components/public/Reveal';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';

const Crest = ({ team, size = 'md' }) => {
  const box = size === 'lg' ? 'h-20 w-20 text-lg' : 'h-12 w-12 text-sm';
  if (team.logo) {
    return (
      <img
        src={team.logo}
        alt={team.name}
        className={`${box} rounded-[12px] object-cover`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={`font-display flex ${box} items-center justify-center rounded-[12px] font-bold`}
      style={{ backgroundColor: 'var(--club-primary)', color: 'var(--club-tertiary)' }}
      aria-hidden="true"
    >
      {(team.short_name || team.name || 'ALS').slice(0, 3).toUpperCase()}
    </span>
  );
};

export default function TeamsPage() {
  usePageSeo({ title: 'Tim', description: 'Skuad resmi ALSABBAT Football Club.', path: '/teams' });
  const { items, loading, error, reload } = useResourceList('/teams', { status: 'ACTIVE', limit: 30 });
  const single = items.length === 1 ? items[0] : null;

  return (
    <div data-testid="page-teams">
      <PublicPageHeader
        label="Squad"
        title="ALSABBAT Football Club"
        description="Satu klub, satu skuad — profil tim, pemain, dan staf pendukung."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Squad' }]}
      />
      <div className="als-container py-10 sm:py-14">
        {loading ? (
          <LoadingState rows={3} testId="teams-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="teams-error" />
        ) : items.length === 0 ? (
          <EmptyState icon={Users} title="Belum ada tim" description="Tim klub akan tampil di sini setelah ditambahkan." testId="teams-empty" />
        ) : single ? (
          <Reveal>
            <Link
              to={`/teams/${single.id}`}
              className="als-card als-lift als-focus group relative block overflow-hidden"
              data-testid={`team-card-${single.id}`}
            >
              <div
                className="relative px-6 py-10 sm:px-10 sm:py-12"
                style={{ backgroundColor: 'var(--club-tertiary)' }}
              >
                <div className="als-stadium-glow absolute inset-0 opacity-70" aria-hidden="true" />
                <div className="als-pitch-lines absolute inset-0" aria-hidden="true" />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                  <Crest team={single} size="lg" />
                  <div className="min-w-0">
                    <p
                      className="font-display text-[11px] font-semibold uppercase tracking-[0.26em]"
                      style={{ color: 'var(--club-primary)' }}
                    >
                      Football Club
                    </p>
                    <h2
                      className="font-display mt-2 text-2xl font-bold sm:text-3xl"
                      style={{ color: 'var(--club-light)' }}
                    >
                      {single.name}
                    </h2>
                    <p
                      className="mt-3 max-w-xl text-sm leading-relaxed"
                      style={{ color: 'rgba(254,254,254,0.75)' }}
                    >
                      {single.description || 'Deskripsi tim belum diatur.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-6 py-5 sm:px-10">
                <span className="als-section-label">Squad Overview</span>
                <span
                  className="font-display inline-flex min-h-[24px] items-center gap-1.5 text-sm font-semibold"
                  style={{ color: 'var(--club-secondary)' }}
                >
                  Lihat Skuad <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((team, index) => (
              <Reveal key={team.id} delay={Math.min(index, 6) * 70} className="h-full">
                <Link
                  to={`/teams/${team.id}`}
                  className="als-card als-lift als-focus flex h-full flex-col p-6"
                  data-testid={`team-card-${team.id}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <Crest team={team} />
                    <div className="min-w-0">
                      <h2 className="font-display truncate text-lg font-bold">{team.name}</h2>
                      <Badge variant="outline" className="mt-1" style={{ backgroundColor: 'rgba(1,40,145,0.05)' }}>
                        {team.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="flex-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
                    {team.description || 'Deskripsi tim belum diatur.'}
                  </p>
                  <span
                    className="mt-5 inline-flex min-h-[24px] items-center gap-1.5 text-sm font-semibold"
                    style={{ color: 'var(--club-secondary)' }}
                  >
                    Lihat Tim <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
