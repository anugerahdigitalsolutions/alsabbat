import React, { useState } from 'react';
import { Newspaper, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Link } from 'react-router-dom';
import { NewsCardShell } from '../../components/public/NewsCardShell';
import { Reveal } from '../../components/public/Reveal';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useResourceList } from '../../hooks/useResourceList';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';

export default function NewsPage() {
  const [query, setQuery] = useState('');
  const { items, total, loading, error, reload } = useResourceList('/content/posts', {
    status: 'PUBLISHED',
    limit: 30,
    ...(query ? { q: query } : {}),
  });

  const featured = items[0];
  const rest = items.slice(1);

  return (
    <div data-testid="page-news">
      <PublicPageHeader
        label="Newsroom"
        title="Latest from ALSABBAT"
        description="Kabar resmi klub, laporan pertandingan, dan pengumuman."
        backgroundImage={featured?.thumbnail}
        imageAlt={featured?.title}
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'News' }]}
        meta={<span data-testid="news-header-count">{loading ? 'Memuat…' : `${total} berita dipublikasikan`}</span>}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--muted-fg)' }}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berita…"
              className="h-11 pl-9"
              data-testid="news-search-input"
            />
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="news-total">
            {loading ? 'Memuat…' : `${total} berita`}
          </p>
        </div>

        {loading ? (
          <LoadingState rows={6} testId="news-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="news-error" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Belum ada berita"
            description="Belum ada berita yang dipublikasikan. Kelola berita dari Admin Panel."
            testId="news-empty"
          />
        ) : (
          <>
            <Reveal className="mb-10 block">
              <Link to={`/news/${featured.slug}`} className="als-focus block" data-testid={`news-featured-${featured.id}`}>
                <NewsCardShell post={featured} testId={`news-featured-card-${featured.id}`} featured />
              </Link>
            </Reveal>

            {rest.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post, index) => (
                  <Reveal key={post.id} delay={Math.min(index, 6) * 70} className="h-full">
                    <Link
                      to={`/news/${post.slug}`}
                      className="als-focus block h-full"
                      data-testid={`news-link-${post.id}`}
                    >
                      <NewsCardShell post={post} testId={`news-card-${post.id}`} />
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
