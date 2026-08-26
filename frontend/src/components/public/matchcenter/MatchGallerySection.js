import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Film, Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';
import { MediaLightbox } from '../gallery/MediaLightbox';
import { resolveMediaUrl } from '../gallery/mediaUtils';

const MAX_TILES = 6;

/**
 * MATCH MEDIA — photos & videos coming from PUBLISHED gallery albums
 * linked to this match (Match -> GalleryAlbum -> Media).
 */
export const MatchGallerySection = ({ matchMedia = [], albums = [] }) => {
  const [lightbox, setLightbox] = useState(-1);
  const photos = matchMedia.filter((m) => m.file_type === 'IMAGE');
  const videos = matchMedia.filter((m) => m.file_type === 'VIDEO');
  const tiles = [...photos, ...videos].slice(0, MAX_TILES);
  const primaryAlbum = albums[0];

  if (!matchMedia.length) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Match gallery belum tersedia"
        description="Foto dan video pertandingan akan tampil di sini setelah album galeri dipublikasikan."
        testId="match-gallery-section-empty"
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="match-gallery-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="als-section-label">Match Media</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="match-media-counts">
            {photos.length} foto · {videos.length} video
          </p>
        </div>
        <Link
          to={primaryAlbum ? `/gallery/${primaryAlbum.id}` : '/gallery'}
          className="font-display inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="match-view-full-gallery"
        >
          View Full Gallery
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((item, index) => {
          const isVideo = item.file_type === 'VIDEO';
          const photoIndex = photos.findIndex((p) => p.id === item.id);
          const tileClass =
            'als-card als-media-tile als-reveal relative block h-32 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-36';
          const tileStyle = {
            '--tw-ring-color': 'var(--focus-ring)',
            animationDelay: `${Math.min(index, 6) * 45}ms`,
          };
          const thumb = resolveMediaUrl(item.thumbnail_url || item.url);

          const inner = (
            <>
              {thumb && !isVideo ? (
                <img
                  src={thumb}
                  alt={item.alt_text || item.file_name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: 'var(--surface-3)' }}
                >
                  <Film className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} />
                </span>
              )}
              <span
                className="als-media-overlay absolute inset-x-0 bottom-0 line-clamp-2 p-2 text-left text-[11px] font-medium"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
                  color: 'var(--club-light)',
                }}
              >
                {item.caption || item.album_title || (isVideo ? 'Video pertandingan' : 'Foto pertandingan')}
              </span>
            </>
          );

          return isVideo ? (
            <Link
              key={item.id}
              to={item.album_id ? `/gallery/${item.album_id}` : '/gallery'}
              className={tileClass}
              style={tileStyle}
              aria-label={item.caption || item.file_name}
              data-testid={`match-media-tile-${item.id}`}
            >
              {inner}
            </Link>
          ) : (
            <button
              type="button"
              key={item.id}
              onClick={() => setLightbox(photoIndex)}
              className={tileClass}
              style={tileStyle}
              aria-label={item.alt_text || item.caption || item.file_name}
              data-testid={`match-media-tile-${item.id}`}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {lightbox >= 0 ? (
        <MediaLightbox
          items={photos}
          index={lightbox}
          onClose={() => setLightbox(-1)}
          onPrev={() => setLightbox((i) => (i - 1 + photos.length) % photos.length)}
          onNext={() => setLightbox((i) => (i + 1) % photos.length)}
        />
      ) : null}
    </section>
  );
};

export default MatchGallerySection;
