import React from 'react';
import { Images } from 'lucide-react';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useResourceList } from '../../hooks/useResourceList';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';

export default function GalleryPage() {
  const { items, total, loading, error, reload } = useResourceList('/gallery/albums', {
    status: 'ACTIVE',
    limit: 40,
  });

  return (
    <div data-testid="page-gallery">
      <PublicPageHeader
        label="Media"
        title="Galeri ALSABBAT"
        description="Album dokumentasi pertandingan, latihan, dan kegiatan klub."
      />
      <div className="als-container py-10">
        <p className="mb-6 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="gallery-total">
          {loading ? 'Memuat…' : `${total} album`}
        </p>

        {loading ? (
          <LoadingState rows={6} testId="gallery-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="gallery-error" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Belum ada album"
            description="Album galeri akan tampil di sini setelah dibuat dari Admin Panel."
            testId="gallery-empty"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((album) => (
              <article
                key={album.id}
                className="als-card overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]"
                data-testid={`gallery-album-${album.id}`}
              >
                <div className="h-36 w-full" style={{ backgroundColor: 'var(--surface-3)' }}>
                  {album.cover_url ? (
                    <img src={album.cover_url} alt={album.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Images className="h-7 w-7" style={{ color: 'rgba(34,34,34,0.22)' }} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display line-clamp-2 text-sm font-semibold">{album.title}</h3>
                  {album.date ? (
                    <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                      {album.date}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
