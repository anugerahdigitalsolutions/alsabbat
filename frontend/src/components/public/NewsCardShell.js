import React from 'react';
import { ArrowUpRight, CalendarDays, Tag } from 'lucide-react';
import { Badge } from '../ui/badge';

const formatDate = (value) => {
  if (!value) return 'Tanggal belum diatur';
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (e) {
    return value;
  }
};

const Thumb = ({ post, heightClass, eager }) => (
  <div className={`relative w-full overflow-hidden ${heightClass}`} style={{ backgroundColor: 'var(--surface-3)' }}>
    {post.thumbnail ? (
      <img
        src={post.thumbnail}
        alt={post.title}
        className="h-full w-full object-cover"
        loading={eager ? 'eager' : 'lazy'}
      />
    ) : (
      <div
        className="als-stadium-glow flex h-full w-full items-center justify-center"
        style={{ backgroundColor: 'var(--club-tertiary)' }}
      >
        <Tag className="h-9 w-9" style={{ color: 'rgba(252,207,43,0.55)' }} aria-hidden="true" />
      </div>
    )}
    <Badge
      className="absolute left-3 top-3 border-0 font-semibold"
      style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
    >
      {post.status === 'PUBLISHED' ? 'Berita' : post.status}
    </Badge>
  </div>
);

export const NewsCardShell = ({ post, testId, featured = false }) => {
  if (featured) {
    return (
      <article
        className="als-card als-zoom als-lift grid overflow-hidden lg:grid-cols-2"
        data-testid={testId}
      >
        <Thumb post={post} heightClass="h-56 sm:h-72 lg:h-full lg:min-h-[320px]" eager />
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="als-section-label mb-3">Berita Utama</p>
          <h2 className="font-display text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">{post.title}</h2>
          {post.excerpt ? (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
              {post.excerpt}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--muted-fg)' }}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(post.published_at || post.created_at)}
            </span>
            <span
              className="font-display inline-flex min-h-[24px] items-center gap-1.5 font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--club-secondary)' }}
            >
              Baca Selengkapnya
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="als-card als-zoom als-lift flex h-full flex-col overflow-hidden" data-testid={testId}>
      <Thumb post={post} heightClass="h-44 sm:h-48" />
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-fg)' }}>
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(post.published_at || post.created_at)}
        </p>
        <h3 className="font-display line-clamp-2 text-lg font-semibold leading-snug">{post.title}</h3>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
            {post.excerpt}
          </p>
        ) : null}
        <span
          className="font-display mt-auto inline-flex min-h-[24px] items-center gap-1.5 pt-4 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'var(--club-secondary)' }}
        >
          Baca
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
};

export default NewsCardShell;
