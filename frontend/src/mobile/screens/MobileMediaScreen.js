import React, { useCallback, useEffect, useState } from 'react';
import { Images } from 'lucide-react';
import { apiErrorMessage, barayaApi } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useBaraya } from '../../context/BarayaAuthContext';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BarayaNotificationButton } from '../components/BarayaNotificationButton';
import { BrzAlbumCard } from '../components/BrzAlbumCard';
import { BrzRestricted } from '../components/BrzRestricted';
import { BrzEmpty, BrzError, BrzLoading } from '../components/BrzStates';

const PAGE_SIZE = 12;

/**
 * BARAYA AL SABBAT — Media screen.
 * Reuses the existing gallery API and its access rule (PEMAIN/STAFF only,
 * enforced by the backend). No second media storage system.
 */
export default function MobileMediaScreen() {
  const { canViewGallery, loading: authLoading } = useBaraya();
  const [albums, setAlbums] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  usePageSeo({
    title: 'Media',
    description: 'Galeri foto dan video AL SABBAT Football Club.',
    path: '/gallery',
  });

  const load = useCallback(
    async (nextSkip = 0) => {
      if (authLoading || !canViewGallery) {
        setLoading(false);
        return;
      }
      if (nextSkip === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const { data } = await barayaApi.get('/gallery/public/albums', {
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
    },
    [authLoading, canViewGallery]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const hasMore = albums.length < total;

  return (
    <div data-testid="baraya-media">
      <BarayaTopBar title="Media" actions={<BarayaNotificationButton />} testId="brz-media-topbar" />

      <div className="brz-page">
        {!authLoading && !canViewGallery ? (
          <BrzRestricted feature="Galeri AL SABBAT" testId="brz-media-restricted" />
        ) : loading || authLoading ? (
          <BrzLoading rows={2} height={190} testId="brz-media-loading" />
        ) : error ? (
          <BrzError message={error} onRetry={() => load(0)} testId="brz-media-error" />
        ) : albums.length === 0 ? (
          <BrzEmpty
            icon={Images}
            title="Belum ada album"
            description="Album akan tampil di sini setelah dipublikasikan melalui Admin Panel."
            testId="brz-media-empty"
          />
        ) : (
          <>
            <p className="brz-meta mb-3" data-testid="brz-media-total">
              {total} album dipublikasikan
            </p>
            <div className="grid grid-cols-2 gap-3">
              {albums.map((album) => (
                <BrzAlbumCard key={album.id} album={album} variant="grid" />
              ))}
            </div>
            {hasMore ? (
              <button
                type="button"
                className="brz-btn brz-btn--ghost brz-btn--block mt-4"
                onClick={() => load(skip + PAGE_SIZE)}
                disabled={loadingMore}
                data-testid="brz-media-more"
              >
                {loadingMore ? 'Memuat…' : 'Muat album lainnya'}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
