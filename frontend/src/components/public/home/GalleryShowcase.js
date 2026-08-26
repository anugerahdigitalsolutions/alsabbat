import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Images, PlayCircle } from 'lucide-react';
import { resolveMediaUrl } from '../gallery/mediaUtils';
import { EmptyState } from '../../shared/EmptyState';

const Tile = ({ album, large = false }) => {
  const cover = resolveMediaUrl(album.cover_url_resolved);
  return (
    <Link
      to={`/gallery/${album.id}`}
      className={`als-tile als-lift relative block focus-visible:outline-none focus-visible:ring-2 ${large ? 'min-h-[300px] sm:min-h-[420px]' : 'min-h-[140px] sm:min-h-[200px]'}`}
      style={{ '--tw-ring-color': 'var(--focus-ring)' }}
      data-testid={`home-gallery-tile-${album.id}`}
    >
      {cover ? (
        <img src={cover} alt={album.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className="als-stadium-glow absolute inset-0" aria-hidden="true" />
      )}
      <span className="als-scrim-bottom absolute inset-0" aria-hidden="true" />
      <span className={`relative flex h-full flex-col justify-end ${large ? 'p-6 sm:p-8' : 'p-4'}`}>
        {large ? <span className="als-eyebrow">Momen Pertandingan</span> : null}
        <span
          className={`font-display font-bold leading-tight ${large ? 'mt-3 text-xl sm:text-2xl' : 'text-sm'}`}
          style={{ color: 'var(--club-light)' }}
        >
          {album.title}
        </span>
        {album.photo_count || album.video_count ? (
          <span className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: 'rgba(254,254,254,0.75)' }}>
            {album.photo_count ? (
              <span className="inline-flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" aria-hidden="true" /> {album.photo_count} foto
              </span>
            ) : null}
            {album.video_count ? (
              <span className="inline-flex items-center gap-1">
                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> {album.video_count} video
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </Link>
  );
};

/** Editorial gallery block: one hero tile + supporting thumbnails. */
export const GalleryShowcase = ({ albums = [] }) => {
  if (!albums.length) {
    return (
      <EmptyState
        icon={Images}
        title="Belum ada album"
        description="Dokumentasi pertandingan akan tampil di sini."
        testId="home-gallery-empty"
      />
    );
  }
  const [feature, ...rest] = albums;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]" data-testid="home-gallery-showcase">
      <Tile album={feature} large />
      <div className="grid grid-cols-2 gap-4">
        {rest.slice(0, 4).map((album) => (
          <Tile key={album.id} album={album} />
        ))}
      </div>
    </div>
  );
};

export default GalleryShowcase;
