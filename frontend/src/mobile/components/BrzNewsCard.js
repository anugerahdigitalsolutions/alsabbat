import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { formatPublishDateTime } from '../../lib/publishTime';

/**
 * News card — `variant="tile"` for the horizontal Home rail, `variant="list"`
 * for the News screen, `variant="hero"` for the featured article.
 * All fields come from `/api/content/posts`.
 */
const Thumb = ({ post, className, eager = false }) => (
  <span className={`relative block overflow-hidden ${className}`} style={{ backgroundColor: 'var(--brz-surface-sunken)' }}>
    {post.thumbnail ? (
      <img
        src={resolveMediaUrl(post.thumbnail)}
        alt={post.title}
        className="brz-img"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    ) : (
      <span className="flex h-full w-full items-center justify-center">
        <Newspaper size={26} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
      </span>
    )}
  </span>
);

export const BrzNewsCard = ({ post, variant = 'list', testId }) => {
  const id = testId || `brz-news-${post.id}`;
  const date = formatPublishDateTime(post.published_at || post.created_at);
  const to = `/news/${post.slug || post.id}`;

  if (variant === 'tile') {
    return (
      <Link to={to} className="brz-card block w-[228px] flex-none" data-testid={id}>
        <Thumb post={post} className="h-[124px] w-full" />
        <span className="block p-3">
          <span className="brz-clamp-2 block text-[13.5px] font-semibold leading-snug">{post.title}</span>
          {date ? (
            <span className="brz-meta mt-1.5 block" style={{ color: 'var(--brz-text-dim)' }}>
              {date}
            </span>
          ) : null}
        </span>
      </Link>
    );
  }

  if (variant === 'hero') {
    return (
      <Link to={to} className="brz-card relative block" data-testid={id}>
        <Thumb post={post} className="h-[186px] w-full" eager />
        <span className="brz-scrim" aria-hidden="true" />
        <span className="absolute inset-x-0 bottom-0 p-4">
          <span className="brz-badge brz-badge--accent mb-2">Sorotan</span>
          <span className="brz-clamp-2 block text-[17px] font-bold leading-snug">{post.title}</span>
          {date ? (
            <span className="brz-meta mt-1.5 block" style={{ color: 'var(--brz-text-muted)' }}>
              {date}
            </span>
          ) : null}
        </span>
      </Link>
    );
  }

  return (
    <Link to={to} className="brz-card flex items-stretch gap-0 overflow-hidden" data-testid={id}>
      <Thumb post={post} className="h-[92px] w-[104px] flex-none" />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3">
        <span className="brz-clamp-2 text-[13.5px] font-semibold leading-snug">{post.title}</span>
        {date ? (
          <span className="brz-meta" style={{ color: 'var(--brz-text-dim)' }}>
            {date}
          </span>
        ) : null}
      </span>
    </Link>
  );
};

export default BrzNewsCard;
