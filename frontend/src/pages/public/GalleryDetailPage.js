import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Film, Image as ImageIcon, Swords } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { MediaLightbox } from '../../components/public/gallery/MediaLightbox';
import { DriveFolderBrowser } from '../../components/public/gallery/DriveFolderBrowser';
import { VideoCard } from '../../components/public/gallery/VideoCard';
import { formatAlbumDate, resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function GalleryDetailPage() {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(-1);

  usePageSeo({
    title: album?.title || 'Album Galeri',
    description: album?.description || 'Album dokumentasi AL SABBAT Football Club.',
    image: resolveMediaUrl(album?.cover_url_resolved),
    path: `/gallery/${albumId}`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Foto Google Drive TIDAK dimuat di sini: album Drive ditelusuri
      // per folder + per batch oleh DriveFolderBrowser (pageToken resmi).
      const { data } = await api.get(`/gallery/public/albums/${albumId}`);
      setAlbum(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Album tidak ditemukan atau belum dipublikasikan.'));
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="als-container py-12" data-testid="page-gallery-detail">
        <LoadingState rows={5} testId="gallery-detail-loading" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="als-container py-12" data-testid="page-gallery-detail">
        <ErrorState message={error || 'Album tidak ditemukan.'} onRetry={load} testId="gallery-detail-error" />
        <Link
          to="/gallery"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--club-secondary)' }}
          data-testid="gallery-detail-back-error"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke galeri
        </Link>
      </div>
    );
  }

  const media = album.media || [];
  const hasDrive = !!album.drive_folder_url;
  const photos = media.filter((m) => m.file_type === 'IMAGE');
  const videos = media.filter((m) => m.file_type === 'VIDEO');
  const cover = resolveMediaUrl(album.cover_url_resolved || album.cover_url);
  const date = formatAlbumDate(album.date || album.published_at);

  return (
    <div data-testid="page-gallery-detail">
      <section
        className="relative overflow-hidden py-12 sm:py-16"
        style={{ backgroundColor: 'var(--club-tertiary)' }}
        data-testid="gallery-detail-header"
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        ) : null}
        <div className="als-stadium-glow absolute inset-0 opacity-70" />
        <div className="als-container relative">
          <p className="font-display mb-3 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--club-primary)' }}>
            Album Galeri
          </p>
          <h1
            className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ color: 'var(--club-light)' }}
            data-testid="gallery-detail-title"
          >
            {album.title}
          </h1>
          {album.description ? (
            <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.78)' }}>
              {album.description}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm" style={{ color: 'rgba(254,254,254,0.78)' }}>
            {date ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {date}
              </span>
            ) : null}
            {hasDrive ? (
              <span className="inline-flex items-center gap-1.5" data-testid="gallery-detail-drive-source">
                <ImageIcon className="h-4 w-4" />
                Foto dari Google Drive
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5" data-testid="gallery-detail-photo-count">
                  <ImageIcon className="h-4 w-4" />
                  {photos.length} foto
                </span>
                <span className="inline-flex items-center gap-1.5" data-testid="gallery-detail-video-count">
                  <Film className="h-4 w-4" />
                  {videos.length} video
                </span>
              </>
            )}
            {album.match?.id ? (
              <Link
                to={`/matches/${album.match.id}`}
                className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                style={{ color: 'var(--club-primary)' }}
                data-testid="gallery-detail-match-link"
              >
                <Swords className="h-4 w-4" />
                Detail pertandingan vs {album.match.opponent?.name || 'lawan'}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="als-container py-10">
        <Link
          to="/gallery"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
          style={{ color: 'var(--club-secondary)' }}
          data-testid="gallery-detail-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua album
        </Link>

        {hasDrive ? (
          <DriveFolderBrowser albumId={albumId} albumTitle={album.title} testId="gallery-drive-browser" />
        ) : media.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="Album ini belum memiliki media"
            description="Foto dan video akan tampil setelah ditambahkan dari Pustaka Media."
            testId="gallery-detail-empty"
          />
        ) : (
          <div className="space-y-10">
            {photos.length ? (
              <section>
                <p className="als-section-label mb-4">Foto</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {photos.map((item, index) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setLightbox(index)}
                      className="als-card als-media-tile als-reveal relative block h-36 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{ '--tw-ring-color': 'var(--focus-ring)', animationDelay: `${Math.min(index, 10) * 40}ms` }}
                      aria-label={item.alt_text || item.caption || item.file_name}
                      data-testid={`gallery-photo-${item.id}`}
                    >
                      <img
                        src={resolveMediaUrl(item.thumbnail_url || item.url)}
                        alt={item.alt_text || item.file_name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {item.caption ? (
                        <span
                          className="als-media-overlay absolute inset-x-0 bottom-0 line-clamp-2 p-2 text-left text-[11px] font-medium"
                          style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
                            color: 'var(--club-light)',
                          }}
                        >
                          {item.caption}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {videos.length ? (
              <section>
                <p className="als-section-label mb-4">Video</p>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {videos.map((item) => (
                    <VideoCard key={item.id} item={item} testId={`gallery-video-${item.id}`} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}

        {album.match?.id ? (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Badge variant="outline" style={{ backgroundColor: 'rgba(1,40,145,0.06)', color: 'var(--club-secondary)' }}>
              Galeri Pertandingan
            </Badge>
            <span className="text-sm" style={{ color: 'var(--muted-fg)' }}>
              Album ini terhubung dengan satu pertandingan AL SABBAT.
            </span>
          </div>
        ) : null}
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
    </div>
  );
}
