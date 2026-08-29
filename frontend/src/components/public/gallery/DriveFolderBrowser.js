import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Download, Folder, Images, Info, Loader2, Share2 } from 'lucide-react';
import api from '../../../lib/api';
import { MediaLightbox } from './MediaLightbox';
import { downloadPhoto, sharePhoto } from './photoActions';

const ROWS_PER_BATCH = 10;

// Dedupe pendek: remount cepat (mis. StrictMode) tidak menggandakan request Drive.
const inflightRequests = new Map();
const dedupe = (key, run) => {
  const hit = inflightRequests.get(key);
  if (hit && Date.now() - hit.at < 5000) return hit.promise;
  const promise = run();
  inflightRequests.set(key, { promise, at: Date.now() });
  return promise;
};

/** Kolom grid sesuai breakpoint Tailwind yang dipakai di bawah. */
const gridColumns = (width) => {
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
};

/**
 * Penelusuran folder Google Drive album: folder → subfolder → foto.
 * Satu batch = maksimal 10 BARIS thumbnail; batch berikutnya hanya dimuat
 * ketika sentinel di bawah grid terlihat (pageToken resmi Google Drive).
 */
export const DriveFolderBrowser = ({ albumId, albumTitle, testId = 'drive-browser' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderParam = searchParams.get('folder') || '';

  const [columns, setColumns] = useState(() =>
    gridColumns(typeof window === 'undefined' ? 1280 : window.innerWidth)
  );
  useEffect(() => {
    const onResize = () => setColumns(gridColumns(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const pageSize = Math.min(100, columns * ROWS_PER_BATCH);

  const [state, setState] = useState({
    status: null,
    message: null,
    folder: null,
    path: [],
    folders: [],
    files: [],
    nextPageToken: null,
    isFile: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [batches, setBatches] = useState(0);
  const [lightbox, setLightbox] = useState(-1);
  const sentinelRef = useRef(null);

  const fetchPage = useCallback(
    async (token) => {
      const key = `${albumId}|${folderParam}|${token || ''}|${pageSize}`;
      return dedupe(key, async () => {
        const { data } = await api.get(`/gallery/public/albums/${albumId}/drive-browse`, {
          params: {
            folder_id: folderParam || undefined,
            page_token: token || undefined,
            page_size: pageSize,
          },
        });
        return data;
      });
    },
    [albumId, folderParam, pageSize]
  );

  const inflight = useRef({ key: null, promise: null });

  // Batch pertama setiap kali folder berubah.
  useEffect(() => {
    let cancelled = false;
    const key = `${albumId}|${folderParam}|${pageSize}`;
    if (inflight.current.key !== key) {
      // Satu request per folder: React StrictMode / re-render tidak menggandakan panggilan.
      inflight.current = { key, promise: fetchPage(null) };
    }
    setLoading(true);
    setLightbox(-1);
    inflight.current.promise
      .then((data) => {
        if (cancelled) return;
        setState({
          status: data?.status || 'ERROR',
          message: data?.message || null,
          folder: data?.folder || null,
          path: data?.path || [],
          folders: data?.folders || [],
          files: data?.files || [],
          nextPageToken: data?.next_page_token || null,
          isFile: !!data?.is_file,
        });
        setBatches(1);
      })
      .catch(() => {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            status: 'ERROR',
            message: 'Folder Google Drive belum dapat diakses. Coba lagi beberapa saat.',
          }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, albumId, folderParam, pageSize]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !state.nextPageToken) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(state.nextPageToken);
      setState((prev) => ({
        ...prev,
        folders: [...prev.folders, ...(data?.folders || [])],
        files: [...prev.files, ...(data?.files || [])],
        nextPageToken: data?.next_page_token || null,
      }));
      setBatches((n) => n + 1);
    } catch (e) {
      setState((prev) => ({ ...prev, message: 'Batch foto berikutnya gagal dimuat. Coba scroll ulang.' }));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loading, loadingMore, state.nextPageToken]);

  // Infinite scroll: batch berikutnya hanya saat sentinel terlihat.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !state.nextPageToken) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: '240px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, state.nextPageToken]);

  const openFolder = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('folder', id);
    else next.delete('folder');
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const crumbs = state.path || [];
  const parentId = crumbs.length >= 2 ? crumbs[crumbs.length - 2].id : '';
  const photos = useMemo(() => state.files || [], [state.files]);
  // Preview memakai resolusi penuh (grid tetap thumbnail).
  const lightboxItems = useMemo(
    () => photos.map((item) => ({ ...item, thumbnail_url: item.url })),
    [photos]
  );

  const shareUrlFor = (photo) => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    if (folderParam) url.searchParams.set('folder', folderParam);
    if (photo?.id) url.searchParams.set('photo', photo.id);
    return url.toString();
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] py-16 text-sm"
        style={{ backgroundColor: 'rgba(1,40,145,0.04)', color: 'var(--muted-fg)' }}
        data-testid={`${testId}-loading`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat isi folder Google Drive…
      </div>
    );
  }

  return (
    <div data-testid={testId} data-batches={batches} data-page-size={pageSize}>
      {/* Breadcrumb: Album → Folder → Subfolder */}
      <nav
        className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm"
        aria-label="Lokasi folder"
        data-testid={`${testId}-breadcrumb`}
      >
        <button
          type="button"
          onClick={() => openFolder('')}
          className="als-focus font-semibold hover:underline"
          style={{ color: 'var(--club-secondary)' }}
          data-testid={`${testId}-crumb-root`}
        >
          {albumTitle || 'Album'}
        </button>
        {crumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--muted-fg)' }} aria-hidden="true" />
            {index === crumbs.length - 1 ? (
              <span className="font-semibold" style={{ color: 'var(--club-tertiary)' }} data-testid={`${testId}-crumb-current`}>
                {crumb.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openFolder(crumb.id)}
                className="als-focus font-semibold hover:underline"
                style={{ color: 'var(--club-secondary)' }}
                data-testid={`${testId}-crumb-${index}`}
              >
                {crumb.name}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>

      {folderParam ? (
        <button
          type="button"
          onClick={() => openFolder(parentId)}
          className="als-focus mb-5 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
          style={{ color: 'var(--club-secondary)' }}
          data-testid={`${testId}-back`}
        >
          <ArrowLeft className="h-4 w-4" />
          {parentId ? 'Kembali ke folder sebelumnya' : `Kembali ke ${albumTitle || 'album'}`}
        </button>
      ) : null}

      {state.status && state.status !== 'OK' && state.status !== 'EMPTY' ? (
        <p
          className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs font-medium"
          style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#991B1B' }}
          data-testid={`${testId}-notice`}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      ) : null}

      {state.folders.length === 0 && photos.length === 0 && state.status !== 'OK' ? null : (
        <>
          {state.folders.length ? (
            <div className="mb-6">
              <p className="als-section-label mb-3" data-testid={`${testId}-folders-label`}>
                Folder
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {state.folders.map((folder) => (
                  <button
                    type="button"
                    key={folder.id}
                    onClick={() => openFolder(folder.id)}
                    className="als-card als-press flex items-center gap-2.5 p-3 text-left"
                    data-testid={`${testId}-folder-${folder.id}`}
                  >
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                      style={{ backgroundColor: 'rgba(252,207,43,0.22)', color: 'var(--club-secondary)' }}
                    >
                      <Folder className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display line-clamp-2 block text-xs font-semibold leading-snug sm:text-sm">
                        {folder.name}
                      </span>
                      <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                        Buka folder
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {photos.length ? (
            <div>
              <p className="als-section-label mb-3" data-testid={`${testId}-photos-label`}>
                Foto — {photos.length} dimuat
              </p>
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                data-testid={`${testId}-grid`}
              >
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-[var(--radius-md)]"
                    style={{ aspectRatio: '4 / 3', backgroundColor: 'rgba(1,40,145,0.06)' }}
                    data-testid={`${testId}-photo-${index}`}
                  >
                    <button
                      type="button"
                      onClick={() => setLightbox(index)}
                      className="als-focus absolute inset-0 h-full w-full"
                      aria-label={`Lihat foto ${photo.file_name || index + 1}`}
                      data-testid={`${testId}-photo-open-${index}`}
                    >
                      <img
                        src={photo.thumbnail_url}
                        alt={photo.alt_text || photo.file_name || `Foto ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </button>
                    <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 sm:opacity-100">
                      <button
                        type="button"
                        onClick={() => downloadPhoto(photo, { albumTitle, index })}
                        aria-label={`Download foto ${index + 1}`}
                        title="Download"
                        className="als-focus inline-flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                        data-testid={`${testId}-download-${index}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => sharePhoto(photo, { albumTitle, url: shareUrlFor(photo) })}
                        aria-label={`Share foto ${index + 1}`}
                        title="Share"
                        className="als-focus inline-flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'rgba(254,254,254,0.94)', color: 'var(--club-secondary)' }}
                        data-testid={`${testId}-share-${index}`}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {state.folders.length === 0 && photos.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] px-4 py-12 text-center"
              style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}
              data-testid={`${testId}-empty`}
            >
              <Images className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
              <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                {state.message || 'Folder ini belum berisi foto.'}
              </p>
            </div>
          ) : null}
        </>
      )}

      {state.nextPageToken ? (
        <div ref={sentinelRef} className="mt-6 flex justify-center" data-testid={`${testId}-sentinel`}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="font-display rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid={`${testId}-load-more`}
          >
            {loadingMore ? 'Memuat foto berikutnya…' : 'Muat foto berikutnya'}
          </button>
        </div>
      ) : null}

      {lightbox >= 0 ? (
        <MediaLightbox
          items={lightboxItems}
          index={lightbox}
          albumTitle={albumTitle}
          shareUrl={shareUrlFor(photos[lightbox])}
          onClose={() => setLightbox(-1)}
          onPrev={() => setLightbox((prev) => (prev - 1 + photos.length) % photos.length)}
          onNext={() => setLightbox((prev) => (prev + 1) % photos.length)}
        />
      ) : null}
    </div>
  );
};

export default DriveFolderBrowser;
