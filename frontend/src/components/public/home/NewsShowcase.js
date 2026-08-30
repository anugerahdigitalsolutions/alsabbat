import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Newspaper } from 'lucide-react';
import { resolveMediaUrl } from '../gallery/mediaUtils';
import { EmptyState } from '../../shared/EmptyState';
import { formatPublishDateTime } from '../../../lib/publishTime';

const formatDate = (value) => formatPublishDateTime(value);

const SmallItem = ({ post }) => (
  <Link
    to={`/news/${post.slug}`}
    className="als-card als-lift als-tile flex gap-3 overflow-hidden p-0 focus-visible:outline-none focus-visible:ring-2"
    style={{ '--tw-ring-color': 'var(--focus-ring)', backgroundColor: 'var(--surface)' }}
    data-testid={`home-news-small-${post.id}`}
  >
    <span className="relative h-[86px] w-[112px] shrink-0" style={{ backgroundColor: '#000000' }}>
      {resolveMediaUrl(post.thumbnail) ? (
        <img
          src={resolveMediaUrl(post.thumbnail)}
          alt={post.title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </span>
    <span className="flex min-w-0 flex-col justify-center py-3 pr-4">
      <span className="font-display line-clamp-2 text-sm font-bold">{post.title}</span>
      <span className="mt-1 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
        {formatDate(post.published_at || post.created_at)}
      </span>
    </span>
  </Link>
);

/** Premium newsroom layout: one large feature + compact list (CMS existing). */
export const NewsShowcase = ({ posts = [] }) => {
  if (!posts.length) {
    return (
      <EmptyState
        icon={Newspaper}
        title="Belum ada berita"
        description="Berita resmi klub akan tampil di sini."
        testId="home-news-empty"
      />
    );
  }

  const [feature, ...rest] = posts;
  const cover = resolveMediaUrl(feature.thumbnail);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]" data-testid="home-news-showcase">
      <Link
        to={`/news/${feature.slug}`}
        className="als-tile als-lift group relative block min-h-[320px] focus-visible:outline-none focus-visible:ring-2 sm:min-h-[420px]"
        style={{ '--tw-ring-color': 'var(--focus-ring)' }}
        data-testid={`home-news-feature-${feature.id}`}
      >
        {cover ? (
          <img src={cover} alt={feature.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="als-stadium-glow absolute inset-0" aria-hidden="true" />
        )}
        <span className="als-scrim-bottom absolute inset-0" aria-hidden="true" />
        <span className="relative flex h-full flex-col justify-end p-6 sm:p-8">
          <span className="als-eyebrow">Berita Utama</span>
          {formatDate(feature.published_at || feature.created_at) ? (
            <span
              className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'rgba(254,254,254,0.78)' }}
              data-testid="home-news-feature-date"
            >
              {formatDate(feature.published_at || feature.created_at)}
            </span>
          ) : null}
          <span
            className="font-display mt-3 text-xl font-extrabold leading-tight sm:text-3xl"
            style={{ color: 'var(--club-light)' }}
          >
            {feature.title}
          </span>
          {feature.excerpt ? (
            <span className="mt-3 line-clamp-2 max-w-xl text-sm" style={{ color: 'rgba(254,254,254,0.82)' }}>
              {feature.excerpt}
            </span>
          ) : null}
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--club-primary)' }}>
            Baca berita <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-4">
        {rest.slice(0, 3).map((post) => (
          <SmallItem key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default NewsShowcase;
