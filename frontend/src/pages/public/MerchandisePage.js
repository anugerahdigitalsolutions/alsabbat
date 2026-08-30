import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Reveal } from '../../components/public/Reveal';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { formatIDR } from '../../context/CartContext';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useSiteText } from '../../lib/siteContent';
import { useClub } from '../../context/ClubContext';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';

export default function MerchandisePage() {
  const { clubName, shortName } = useClub();
  const t = useSiteText({ club: shortName || clubName || 'AL SABBAT' });
  usePageSeo({
    title: 'Merchandise',
    description: 'Merchandise resmi AL SABBAT Football Club.',
    path: '/merchandise',
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/merchandise/products', { params: { limit: 24 } });
      setItems(data?.items || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat merchandise.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div data-testid="page-merchandise">
      <PublicPageHeader
        label={t('store.header.label')}
        title={t('store.header.title')}
        description={t('store.header.description')}
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Merchandise' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <Reveal className="als-card mb-8 overflow-hidden" data-testid="merchandise-development-notice">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-md)]"
              style={{ backgroundColor: 'var(--club-secondary)', color: 'var(--club-primary)' }}
              aria-hidden="true"
            >
              <ShoppingBag className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p
                className="font-display text-base font-bold uppercase tracking-wide sm:text-lg"
                style={{ color: 'var(--club-secondary)' }}
              >
                Toko Resmi AL SABBAT
              </p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                Sedang dalam tahap pengembangan.
                <br className="hidden sm:block" /> Toko resmi dan merchandise AL SABBAT akan segera hadir.
              </p>
            </div>
            <span
              className="font-display shrink-0 self-start rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] sm:self-center"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            >
              Segera Hadir
            </span>
          </div>
          <span className="block h-1 w-full" style={{ backgroundColor: 'var(--club-primary)' }} aria-hidden="true" />
        </Reveal>

        {loading ? (
          <LoadingState rows={6} testId="merchandise-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="merchandise-error" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Merchandise segera hadir"
            description="Produk resmi AL SABBAT akan tampil di sini setelah dirilis."
            testId="merchandise-empty"
          />
        ) : (
          <div className="als-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index, 6) * 60} className="h-full">
                <Link
                  to={`/merchandise/${product.slug || product.id}`}
                  className="als-card als-zoom als-lift als-focus flex h-full flex-col overflow-hidden"
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="relative h-52" style={{ backgroundColor: 'var(--surface-3)' }}>
                    {product.cover_url ? (
                      <img src={resolveMediaUrl(product.cover_url)} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="als-stadium-glow flex h-full w-full items-center justify-center" style={{ backgroundColor: '#000000' }}>
                        <ShoppingBag className="h-9 w-9" style={{ color: 'rgba(252,207,43,0.55)' }} />
                      </div>
                    )}
                    {!product.in_stock ? (
                      <Badge className="absolute left-3 top-3 border-0" style={{ backgroundColor: '#000000', color: 'var(--club-primary)' }}>
                        Stok habis
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    {product.category ? (
                      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {product.category.name}
                      </p>
                    ) : null}
                    <h3 className="font-display mt-1 line-clamp-2 text-base font-semibold">{product.name}</h3>
                    <p className="font-display mt-auto pt-3 text-lg font-bold" style={{ color: 'var(--club-secondary)' }}>
                      {formatIDR(product.price)}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
