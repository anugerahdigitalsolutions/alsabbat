import React, { useCallback, useEffect, useState } from 'react';
import { Images } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { AlbumCard } from '../../components/public/gallery/AlbumCard';
import { usePageSeo } from '../../hooks/usePageSeo';

const PAGE_SIZE = 24;

export default function GalleryPage() {
  const [albums, setAlbums] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  usePageSeo({
    title: 'Galeri',
    description: 'Dokumentasi foto dan video pertandingan serta kegiatan ALSABBAT Football Club.',
    path: '/gallery',
  });

  const load = useCallback(async (nextSkip = 0) => {
    if (nextSkip === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const { data } = await api.get('/gallery/public/albums', {
        params: { limit: PAGE_SIZE, skip: nextSkip },
      });
      setAlbums((prev) => (nextSkip === 0 ? data.items || [] : [...prev, ...(data.items || [])]));
      setTotal(data.total || 0);
      setSkip(nextSkip);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat galeri.'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const hasMore = albums.length < total;

  return (
    <div data-testid="page-gallery">
      <PublicPageHeader
        label="Media"
        title="Moments We Remember"
        description="Album dokumentasi pertandingan, latihan, dan kegiatan klub."
      />
      <div className="als-container py-10">
        <p className="mb-6 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="gallery-total">
          {loading ? 'Memuat…' : `${total} album dipublikasikan`}
        </p>

        {loading ? (
          <LoadingState rows={6} testId="gallery-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(0)} testId="gallery-error" />
        ) : albums.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Belum ada album galeri"
            description="Album akan tampil di sini setelah dipublikasikan melalui Admin Panel."
            testId="gallery-empty"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {albums.map((album, index) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  index={index}
                  testId={`gallery-album-${album.id}`}
                />
              ))}
            </div>

            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => load(skip + PAGE_SIZE)}
                  disabled={loadingMore}
                  className="font-display rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-semibold transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="gallery-load-more"
                >
                  {loadingMore ? 'Memuat…' : 'Muat album lainnya'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
