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

export default function MerchandisePage() {
  const { clubName, shortName } = useClub();
  const t = useSiteText({ club: shortName || clubName || 'ALSABBAT' });
  usePageSeo({
    title: 'Merchandise',
    description: 'Merchandise resmi ALSABBAT Football Club.',
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
        {loading ? (
          <LoadingState rows={6} testId="merchandise-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="merchandise-error" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Merchandise segera hadir"
            description="Produk resmi ALSABBAT akan tampil di sini setelah dirilis."
            testId="merchandise-empty"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index, 6) * 60} className="h-full">
                <Link
                  to={`/merchandise/${product.slug}`}
                  className="als-card als-zoom als-lift als-focus flex h-full flex-col overflow-hidden"
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="relative h-52" style={{ backgroundColor: 'var(--surface-3)' }}>
                    {product.cover_url ? (
                      <img src={product.cover_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
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
