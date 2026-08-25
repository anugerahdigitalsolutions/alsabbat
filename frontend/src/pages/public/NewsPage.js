import React, { useState } from 'react';
import { Newspaper, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Link } from 'react-router-dom';
import { NewsCardShell } from '../../components/public/NewsCardShell';
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

  return (
    <div data-testid="page-news">
      <PublicPageHeader
        label="Newsroom"
        title="Berita ALSABBAT"
        description="Kabar resmi klub, laporan pertandingan, dan pengumuman."
      />
      <div className="als-container py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--muted-fg)' }}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berita…"
              className="pl-9"
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post) => (
              <Link key={post.id} to={`/news/${post.slug}`} data-testid={`news-link-${post.id}`}>
                <NewsCardShell post={post} testId={`news-card-${post.id}`} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
