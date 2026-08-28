import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Images, Info, Share2 } from 'lucide-react';
import api from '../../../lib/api';
import { Reveal } from '../Reveal';
import { MediaLightbox } from './MediaLightbox';
import { downloadPhoto, sharePhoto } from './photoActions';
import { formatAlbumDate, resolveMediaUrl } from './mediaUtils';

/**
 * Satu baris album pertandingan: JUDUL MATCH + TANGGAL + carousel foto horizontal.
 * Sumber foto: folder Google Drive album (bila diisi) — jika tidak, media album existing.
 */
export const MatchAlbumCarousel = ({ album, index = 0, testId }) => {
  const localPhotos = (album?.media || []).filter((item) => item.file_type === 'IMAGE');
  const [photos, setPhotos] = useState(localPhotos);
  const [notice, setNotice] = useState(null);
  const [lightbox, setLightbox] = useState(-1);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!album?.drive_folder_url) {
      setPhotos(localPhotos);
      return undefined;
    }
    let cancelled = false;
    api
      .get(`/gallery/public/albums/${album.id}/drive-photos`)
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.status === 'OK' && (data.items || []).length) {
          setPhotos(data.items);
          setNotice(null);
        } else {
          setPhotos(localPhotos);
          setNotice(data?.message || null);
        }
      })
      .catch(() => {
        if (!cancelled) setNotice('Folder Google Drive belum dapat diakses. Pastikan akses folder sesuai konfigurasi.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album?.id, album?.drive_folder_url]);

  const scrollBy = useCallback((direction) => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.round(node.clientWidth * 0.82), behavior: 'smooth' });
  }, []);

  const dateLabel = formatAlbumDate(album?.date) || formatAlbumDate(album?.match?.date) || '';
  const total = photos.length;

  return (
    <Reveal as="section" delay={index * 60} className="als-card p-4 sm:p-5" data-testid={testId}>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2
            className="font-display truncate text-base font-bold uppercase tracking-wide sm:text-lg"
            style={{ color: 'var(--club-secondary)' }}
            data-testid={`${testId}-title`}
          >
            {album?.title}
          </h2>
          {dateLabel ? (
            <p
              className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--muted-fg)' }}
              data-testid={`${testId}-date`}
            >
              {dateLabel}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {total ? (
            <span className="text-xs font-semibold" style={{ color: 'var(--muted-fg)' }}>
              {total} foto
            </span>
          ) : null}
          {total > 1 ? (
            <span className="hidden items-center gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Foto sebelumnya"
                className="als-focus inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
                style={{ backgroundColor: 'rgba(1,40,145,0.08)', color: 'var(--club-secondary)' }}
                data-testid={`${testId}-prev`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Foto berikutnya"
                className="als-focus inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid={`${testId}-next`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </span>
          ) : null}
        </div>
      </header>

      {notice ? (
        <p
          className="mb-3 flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs font-medium"
          style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#991B1B' }}
          data-testid={`${testId}-drive-notice`}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      ) : null}

      {total === 0 ? (
        <div
          className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] px-4 py-10 text-center"
          style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}
          data-testid={`${testId}-empty`}
        >
          <Images className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Foto album ini belum tersedia.
          </p>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="als-scroll-thin flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-2"
          data-testid={`${testId}-scroller`}
        >
          {photos.map((photo, photoIndex) => (
            <div
              key={photo.id || `${photo.url}-${photoIndex}`}
              className="group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-[var(--radius-md)] sm:w-[46%] lg:w-[31%] xl:w-[23.5%]"
              style={{ aspectRatio: '4 / 3', backgroundColor: 'rgba(0,0,0,0.06)' }}
              data-testid={`${testId}-photo-${photoIndex}`}
            >
              <button
                type="button"
                onClick={() => setLightbox(photoIndex)}
                className="als-focus absolute inset-0 h-full w-full"
                aria-label={`Lihat foto ${photoIndex + 1} dari ${album?.title}`}
                data-testid={`${testId}-photo-open-${photoIndex}`}
              >
                <img
                  src={resolveMediaUrl(photo.thumbnail_url || photo.url)}
                  alt={photo.alt_text || photo.file_name || `Foto ${photoIndex + 1}`}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(1,40,145,0.55) 100%)' }}
                  aria-hidden="true"
                />
              </button>

              <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadPhoto(photo, { albumTitle: album?.title, index: photoIndex })}
                  aria-label={`Download foto ${photoIndex + 1}`}
                  title="Download"
                  className="als-focus inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid={`${testId}-download-${photoIndex}`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => sharePhoto(photo, { albumTitle: album?.title })}
                  aria-label={`Share foto ${photoIndex + 1}`}
                  title="Share"
                  className="als-focus inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
                  style={{ backgroundColor: 'rgba(254,254,254,0.92)', color: 'var(--club-secondary)' }}
                  data-testid={`${testId}-share-${photoIndex}`}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox >= 0 ? (
        <MediaLightbox
          items={photos}
          index={lightbox}
          albumTitle={album?.title}
          onClose={() => setLightbox(-1)}
          onPrev={() => setLightbox((prev) => (prev - 1 + total) % total)}
          onNext={() => setLightbox((prev) => (prev + 1) % total)}
        />
      ) : null}
    </Reveal>
  );
};

export default MatchAlbumCarousel;
