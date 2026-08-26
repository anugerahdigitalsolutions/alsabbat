import React from 'react';
import { ExternalLink, Handshake } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function SponsorsPage() {
  usePageSeo({ title: 'Sponsor', description: 'Sponsor dan partner resmi AL SABBAT Football Club.', path: '/sponsors' });
  const { items, loading, error, reload } = useResourceList('/sponsors', {
    status: 'ACTIVE',
    limit: 60,
    sort_by: 'display_order',
    sort_dir: 'asc',
  });

  return (
    <div data-testid="page-sponsors">
      <PublicPageHeader label="Partner" title="Sponsor &amp; Partner" description="Mitra resmi yang mendukung perjalanan klub." />
      <div className="als-container py-10">
        {loading ? (
          <LoadingState rows={3} testId="sponsors-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="sponsors-error" />
        ) : items.length === 0 ? (
          <EmptyState icon={Handshake} title="Belum ada sponsor" description="Sponsor resmi klub akan tampil di sini." testId="sponsors-empty" />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((sponsor) => (
              <article key={sponsor.id} className="als-card p-6" data-testid={`sponsor-card-${sponsor.id}`}>
                <div className="mb-4 flex h-20 items-center justify-center rounded-[var(--radius-md)]" style={{ backgroundColor: 'var(--surface-2)' }}>
                  {sponsor.logo ? (
                    <img src={sponsor.logo} alt={sponsor.name} className="max-h-16 max-w-full object-contain" loading="lazy" />
                  ) : (
                    <span className="font-display text-base font-bold">{sponsor.name}</span>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-bold">{sponsor.name}</h2>
                    {sponsor.tier ? (
                      <Badge variant="outline" className="mt-1" style={{ backgroundColor: 'rgba(252,207,43,0.14)', borderColor: 'rgba(252,207,43,0.5)' }}>
                        {sponsor.tier}
                      </Badge>
                    ) : null}
                  </div>
                  {sponsor.website ? (
                    <a
                      href={sponsor.website}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Website ${sponsor.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]"
                      style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
                      data-testid={`sponsor-link-${sponsor.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
                {sponsor.description ? (
                  <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
                    {sponsor.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
