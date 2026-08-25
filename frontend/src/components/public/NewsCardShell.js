import React from 'react';
import { CalendarDays, Tag } from 'lucide-react';
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

export const NewsCardShell = ({ post, testId }) => (
  <article className="als-card overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-md)]" data-testid={testId}>
    <div className="relative h-44 w-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
      {post.thumbnail ? (
        <img src={post.thumbnail} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Tag className="h-8 w-8" style={{ color: 'rgba(34,34,34,0.25)' }} />
        </div>
      )}
      <Badge
        className="absolute left-3 top-3 border-0 font-semibold"
        style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
      >
        {post.status === 'PUBLISHED' ? 'Berita' : post.status}
      </Badge>
    </div>
    <div className="p-5">
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
    </div>
  </article>
);

export default NewsCardShell;
