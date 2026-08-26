import React from 'react';
import { Link } from 'react-router-dom';
import { Images } from 'lucide-react';
import { resolveMediaUrl } from '../gallery/mediaUtils';
import { EmptyState } from '../../shared/EmptyState';

/** Editorial horizontal gallery strip (reference layout), real albums only. */
export const GalleryStrip = ({ albums = [] }) => {
  if (!albums.length) {
    return (
      <EmptyState
        icon={Images}
        title="Belum ada album galeri"
        description="Dokumentasi pertandingan dan momen klub akan tampil di sini."
        testId="home-gallery-empty"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="home-gallery-strip">
      {albums.slice(0, 5).map((album, index) => {
        const cover = resolveMediaUrl(album.cover_url_resolved);
        return (
          <Link
            key={album.id}
            to={`/gallery/${album.id}`}
            className={`als-tile als-lift relative block min-h-[150px] focus-visible:outline-none focus-visible:ring-2 sm:min-h-[190px] ${
              index === 0 ? 'col-span-2 sm:col-span-1' : ''
            }`}
            style={{ '--tw-ring-color': 'var(--focus-ring)' }}
            data-testid={`home-gallery-tile-${album.id}`}
          >
            {cover ? (
              <img src={cover} alt={album.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span className="als-stadium-glow absolute inset-0" aria-hidden="true" />
            )}
            <span className="als-scrim-bottom absolute inset-0" aria-hidden="true" />
            <span className="relative flex h-full flex-col justify-end p-3">
              <span className="font-display line-clamp-2 text-xs font-bold" style={{ color: 'var(--club-light)' }}>
                {album.title}
              </span>
              {album.photo_count ? (
                <span className="mt-1 text-[10px]" style={{ color: 'rgba(254,254,254,0.75)' }}>
                  {album.photo_count} foto
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default GalleryStrip;
