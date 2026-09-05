import React from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { formatAlbumDate, resolveMediaUrl } from '../../components/public/gallery/mediaUtils';

/**
 * Gallery album card — reuses the EXISTING media infrastructure (the URLs come
 * straight from `/api/gallery/public/albums`). No second media system.
 */
const AlbumCover = ({ cover, title, className }) => (
  <span className={`relative block overflow-hidden ${className}`} style={{ backgroundColor: 'var(--brz-surface-sunken)' }}>
    {cover ? (
      <img src={cover} alt={title} className="brz-img" loading="lazy" decoding="async" />
    ) : (
      <span className="flex h-full w-full items-center justify-center">
        <ImageIcon size={24} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
      </span>
    )}
    <span className="brz-scrim" aria-hidden="true" />
  </span>
);

export const BrzAlbumCard = ({ album, variant = 'tile', testId }) => {
  const id = testId || `brz-album-${album.id}`;
  const cover = resolveMediaUrl(album.cover_url);
  const date = formatAlbumDate(album.date || album.published_at);
  const count = album.media_count;

  if (variant === 'grid') {
    return (
      <Link to={`/gallery/${album.id}`} className="brz-card relative block" data-testid={id}>
        <AlbumCover cover={cover} title={album.title} className="aspect-[4/5] w-full" />
        <span className="absolute inset-x-0 bottom-0 p-3">
          <span className="brz-clamp-2 block text-[12.5px] font-semibold leading-snug">{album.title}</span>
          <span className="brz-meta mt-1 block" style={{ color: 'var(--brz-text-muted)' }}>
            {count ? `${count} media` : date || ''}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link to={`/gallery/${album.id}`} className="brz-card relative block w-[168px] flex-none" data-testid={id}>
      <AlbumCover cover={cover} title={album.title} className="h-[124px] w-full" />
      <span className="absolute inset-x-0 bottom-0 p-3">
        <span className="brz-clamp-1 block text-[12.5px] font-semibold">{album.title}</span>
        <span className="brz-meta block" style={{ color: 'var(--brz-text-muted)' }}>
          {count ? `${count} media` : date || ''}
        </span>
      </span>
    </Link>
  );
};

export default BrzAlbumCard;
