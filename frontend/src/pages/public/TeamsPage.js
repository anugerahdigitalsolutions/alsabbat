import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function TeamsPage() {
  usePageSeo({ title: 'Tim', description: 'Daftar tim resmi ALSABBAT Football Club.', path: '/teams' });
  const { items, loading, error, reload } = useResourceList('/teams', { status: 'ACTIVE', limit: 30 });

  return (
    <div data-testid="page-teams">
      <PublicPageHeader label="Squad" title="Tim ALSABBAT" description="Satu klub, beberapa tim — dari first team hingga akademi." />
      <div className="als-container py-10">
        {loading ? (
          <LoadingState rows={3} testId="teams-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="teams-error" />
        ) : items.length === 0 ? (
          <EmptyState icon={Users} title="Belum ada tim" description="Tim klub akan tampil di sini setelah ditambahkan." testId="teams-empty" />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="als-card flex flex-col p-6 transition-shadow hover:shadow-[var(--shadow-md)]"
                data-testid={`team-card-${team.id}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="h-12 w-12 rounded-[10px] object-cover" loading="lazy" />
                  ) : (
                    <span
                      className="font-display flex h-12 w-12 items-center justify-center rounded-[10px] text-sm font-bold"
                      style={{ backgroundColor: 'var(--club-primary)', color: 'var(--club-tertiary)' }}
                    >
                      {(team.short_name || team.name || 'ALS').slice(0, 3).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h2 className="font-display text-lg font-bold">{team.name}</h2>
                    <Badge variant="outline" className="mt-1" style={{ backgroundColor: 'rgba(1,40,145,0.05)' }}>
                      {team.category}
                    </Badge>
                  </div>
                </div>
                <p className="flex-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
                  {team.description || 'Deskripsi tim belum diatur.'}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--club-secondary)' }}>
                  Lihat Tim <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
