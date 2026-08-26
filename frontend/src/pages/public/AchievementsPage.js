import React from 'react';
import { Trophy } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function AchievementsPage() {
  usePageSeo({ title: 'Prestasi', description: 'Prestasi dan trofi ALSABBAT Football Club.', path: '/achievements' });
  const { items, total, loading, error, reload } = useResourceList('/achievements', { status: 'ACTIVE', limit: 60 });

  return (
    <div data-testid="page-achievements">
      <PublicPageHeader label="Honours" title="Prestasi Klub" description="Trofi dan pencapaian resmi yang tercatat pada sistem klub." />
      <div className="als-container py-10">
        <p className="mb-6 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="achievements-total">
          {loading ? 'Memuat…' : `${total} prestasi`}
        </p>

        {loading ? (
          <LoadingState rows={3} testId="achievements-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="achievements-error" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Belum ada prestasi tercatat"
            description="Prestasi klub akan tampil di sini setelah dicatat melalui Admin Panel."
            testId="achievements-empty"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="als-card overflow-hidden" data-testid={`achievement-card-${item.id}`}>
                <div className="flex h-32 items-center justify-center" style={{ backgroundColor: 'var(--club-tertiary)' }}>
                  {item.trophy_image ? (
                    <img src={item.trophy_image} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Trophy className="h-10 w-10" style={{ color: 'var(--club-primary)' }} />
                  )}
                </div>
                <div className="p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {item.year ? (
                      <Badge className="border-0 font-bold" style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}>
                        {item.year}
                      </Badge>
                    ) : null}
                    {item.level ? <Badge variant="outline">{item.level}</Badge> : null}
                  </div>
                  <h2 className="font-display text-lg font-bold">{item.title}</h2>
                  {item.competition_name ? (
                    <p className="mt-1 text-sm font-medium" style={{ color: 'var(--club-secondary)' }}>
                      {item.competition_name}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
