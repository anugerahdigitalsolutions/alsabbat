import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ImageIcon, PlayCircle } from 'lucide-react';
import { apiErrorMessage, barayaApi } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useBaraya } from '../../context/BarayaAuthContext';
import { formatAlbumDate, resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BrzRestricted } from '../components/BrzRestricted';
import { BrzLightbox } from '../components/BrzLightbox';
import { BrzEmpty, BrzError, BrzLoading } from '../components/BrzStates';

/**
 * AL SABBAT — album detail.
 * Media comes from `/api/gallery/public/albums/{id}`; albums backed by a
 * Google Drive folder additionally use the existing `/drive-photos` endpoint.
 */
export default function MobileAlbumDetailScreen() {
  const { albumId } = useParams();
  const { canViewGallery, loading: authLoading } = useBaraya();
  const [album, setAlbum] = useState(null);
  const [drivePhotos, setDrivePhotos] = useState([]);
  const [driveNotice, setDriveNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(-1);

  const load = useCallback(async () => {
    if (authLoading || !canViewGallery) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await barayaApi.get(`/gallery/public/albums/${albumId}`);
      setAlbum(data);
      if (data?.drive_folder_url) {
        try {
          const drive = await barayaApi.get(`/gallery/public/albums/${albumId}/drive-photos`);
          setDrivePhotos(drive.data?.items || []);
          if (drive.data?.status && drive.data.status !== 'OK') setDriveNotice(drive.data.message || null);
        } catch (e) {
          setDrivePhotos([]);
        }
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Album tidak ditemukan atau belum dipublikasikan.'));
    } finally {
      setLoading(false);
    }
  }, [albumId, authLoading, canViewGallery]);

  useEffect(() => {
    load();
  }, [load]);

  usePageSeo({
    title: album?.title || 'Album',
    description: album?.description || 'Galeri AL SABBAT Football Club.',
    path: `/gallery/${albumId}`,
  });

  const media = [
    ...(album?.media || []).map((item) => ({
      ...item,
      url: resolveMediaUrl(item.url),
      thumbnail_url: resolveMediaUrl(item.thumbnail_url || item.url),
    })),
    ...drivePhotos.map((item) => ({
      id: item.id,
      file_name: item.name,
      file_type: 'IMAGE',
      url: item.url,
      thumbnail_url: item.thumbnail_url,
    })),
  ];

  return (
    <div data-testid="baraya-album-detail">
      <BarayaTopBar back title={album?.title || 'Album'} backTo="/gallery" testId="brz-album-topbar" />

      <div className="brz-page">
        {!authLoading && !canViewGallery ? (
          <BrzRestricted feature="Album galeri" testId="brz-album-restricted" />
        ) : loading || authLoading ? (
          <BrzLoading rows={2} height={170} testId="brz-album-loading" />
        ) : error || !album ? (
          <BrzError message={error || 'Album tidak ditemukan.'} onRetry={load} testId="brz-album-error" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="brz-badge brz-badge--accent">{media.length} media</span>
              {formatAlbumDate(album.date || album.published_at) ? (
                <span className="brz-badge">{formatAlbumDate(album.date || album.published_at)}</span>
              ) : null}
            </div>

            {album.description ? <p className="brz-body mt-3">{album.description}</p> : null}
            {driveNotice ? (
              <p className="brz-body mt-3" style={{ color: 'var(--brz-live)' }} data-testid="brz-album-drive-notice">
                {driveNotice}
              </p>
            ) : null}

            {media.length === 0 ? (
              <div className="mt-4">
                <BrzEmpty
                  icon={ImageIcon}
                  title="Album masih kosong"
                  description="Media akan tampil setelah ditambahkan melalui Admin Panel."
                  testId="brz-album-empty"
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-1.5" data-testid="brz-album-grid">
                {media.map((item, position) => (
                  <button
                    key={item.id || position}
                    type="button"
                    className="relative aspect-square overflow-hidden rounded-[10px]"
                    style={{ backgroundColor: 'var(--brz-surface-sunken)' }}
                    onClick={() => setLightbox(position)}
                    aria-label={item.caption || item.file_name || `Media ${position + 1}`}
                    data-testid={`brz-album-item-${position}`}
                  >
                    <img
                      src={item.thumbnail_url || item.url}
                      alt={item.alt_text || item.caption || ''}
                      className="brz-img"
                      loading="lazy"
                      decoding="async"
                    />
                    {item.file_type === 'VIDEO' ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle size={24} color="#fff" aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {lightbox >= 0 ? (
        <BrzLightbox items={media} index={lightbox} onClose={() => setLightbox(-1)} />
      ) : null}
    </div>
  );
}
