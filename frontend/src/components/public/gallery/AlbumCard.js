import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Film, Image as ImageIcon, Swords } from 'lucide-react';
import { formatAlbumDate, resolveMediaUrl } from './mediaUtils';

/** Gallery album card — cover, title, related match, date and media counters. */
export const AlbumCard = ({ album, index = 0, testId }) => {
  const cover = resolveMediaUrl(album.cover_url_resolved || album.cover_url);
  const date = formatAlbumDate(album.date || album.published_at);

  return (
    <Link
      to={`/gallery/${album.id}`}
      className="als-card als-media-tile als-reveal block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ '--tw-ring-color': 'var(--focus-ring)', animationDelay: `${Math.min(index, 8) * 45}ms` }}
      data-testid={testId}
    >
      <div className="relative h-44 w-full overflow-hidden" style={{ backgroundColor: 'var(--surface-3)' }}>
        {cover ? (
          <img src={cover} alt={album.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-7 w-7" style={{ color: 'rgba(0,0,0,0.22)' }} />
          </div>
        )}
        <div
          className="als-media-overlay absolute inset-0 flex items-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))' }}
        >
          <span className="font-display text-xs font-semibold" style={{ color: 'var(--club-primary)' }}>
            Lihat album
          </span>
        </div>
        <div className="absolute right-2 top-2 flex gap-1">
          {album.photo_count ? (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: 'rgba(254,254,254,0.92)', color: 'var(--club-tertiary)' }}
              data-testid={`${testId}-photo-count`}
            >
              <ImageIcon className="h-3 w-3" />
              {album.photo_count}
            </span>
          ) : null}
          {album.video_count ? (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: 'var(--club-secondary)', color: 'var(--club-light)' }}
              data-testid={`${testId}-video-count`}
            >
              <Film className="h-3 w-3" />
              {album.video_count}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-display line-clamp-2 text-sm font-semibold leading-snug">{album.title}</h3>
        <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
          {album.match?.opponent?.name ? (
            <p className="flex items-center gap-1.5 truncate" data-testid={`${testId}-match`}>
              <Swords className="h-3.5 w-3.5 shrink-0" />
              vs {album.match.opponent.name}
            </p>
          ) : null}
          {date ? (
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {date}
            </p>
          ) : null}
          <p data-testid={`${testId}-media-total`}>
            {album.drive_folder_url ? 'Foto dari Google Drive' : `${album.media_total || 0} media`}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default AlbumCard;
