import React from 'react';
import { Link } from 'react-router-dom';
import { Images, Share2, Video } from 'lucide-react';
import { Badge } from '../../ui/badge';

const PanelShell = ({ title, count, children, testId }) => (
  <div className="als-card p-5" data-testid={testId}>
    <div className="mb-4 flex items-center justify-between gap-2">
      <p className="als-section-label">{title}</p>
      {count !== undefined ? (
        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--muted-fg)' }}>
          {count}
        </span>
      ) : null}
    </div>
    {children}
  </div>
);

const Placeholder = ({ icon: Icon, text, testId }) => (
  <div
    className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-5"
    style={{ backgroundColor: 'var(--surface-2)' }}
    data-testid={testId}
  >
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: 'rgba(1,40,145,0.07)' }}
    >
      <Icon className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
    </span>
    <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
      {text}
    </p>
  </div>
);

/**
 * Match Center integration points.
 * Gallery / Video / Social stay as separate referenced resources —
 * publishing & upload flows belong to a later phase.
 */
export const MatchMediaPanel = ({ galleryAlbums = [], images = [], videos = [], socialContent = [] }) => (
  <div className="grid grid-cols-1 gap-5 lg:grid-cols-3" data-testid="match-media-panel">
    <PanelShell title="Galeri Pertandingan" count={galleryAlbums.length + images.length} testId="match-gallery-panel">
      {galleryAlbums.length || images.length ? (
        <div className="space-y-3">
          {galleryAlbums.map((album) => (
            <Link
              key={album.id}
              to={`/gallery/${album.id}`}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition-colors duration-200 hover:bg-[var(--surface-2)]"
              data-testid={`match-gallery-album-${album.id}`}
            >
              {album.cover_url ? (
                <img
                  src={album.cover_url}
                  alt={album.title}
                  className="h-10 w-14 rounded object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span
                  className="flex h-10 w-14 items-center justify-center rounded"
                  style={{ backgroundColor: 'var(--surface-3)' }}
                >
                  <Images className="h-4 w-4" style={{ color: 'var(--muted-fg)' }} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{album.title}</span>
            </Link>
          ))}
          {images.length ? (
            <div className="grid grid-cols-3 gap-2">
              {images.slice(0, 6).map((item) => (
                <img
                  key={item.id}
                  src={item.thumbnail_url || item.url}
                  alt={item.alt_text || 'Foto pertandingan'}
                  className="h-16 w-full rounded object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  data-testid={`match-image-${item.id}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <Placeholder
          icon={Images}
          text="Belum ada foto atau album galeri yang ditautkan ke pertandingan ini."
          testId="match-gallery-empty"
        />
      )}
    </PanelShell>

    <PanelShell title="Video Sorotan" count={videos.length} testId="match-video-panel">
      {videos.length ? (
        <div className="space-y-2">
          {videos.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition-colors duration-200 hover:bg-[var(--surface-2)]"
              data-testid={`match-video-${item.id}`}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(1,40,145,0.07)' }}
              >
                <Video className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.caption || item.file_name}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <Placeholder
          icon={Video}
          text="Belum ada video yang ditautkan. Modul publishing video hadir pada fase berikutnya."
          testId="match-video-empty"
        />
      )}
    </PanelShell>

    <PanelShell title="Konten Media Sosial" testId="match-social-panel">
      {socialContent.length ? (
        <div className="space-y-2">
          {socialContent.map((item, index) => (
            <div key={item.id || index} className="text-sm" data-testid={`match-social-${item.id || index}`}>
              {item.caption || item.url}
            </div>
          ))}
        </div>
      ) : (
        <>
          <Placeholder
            icon={Share2}
            text="Titik integrasi sudah disiapkan. Publikasi Instagram / TikTok / YouTube menyusul pada fase berikutnya."
            testId="match-social-empty"
          />
          <Badge
            variant="outline"
            className="mt-3 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--muted-fg)' }}
          >
            Arsitektur siap
          </Badge>
        </>
      )}
    </PanelShell>
  </div>
);

export default MatchMediaPanel;
