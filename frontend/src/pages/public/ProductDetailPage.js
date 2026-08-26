import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { formatIDR, useCart } from '../../context/CartContext';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageSeo({
    title: product?.name || 'Merchandise',
    description: product?.short_description || product?.description || 'Merchandise resmi ALSABBAT.',
    image: product?.cover_url,
    path: `/merchandise/${slug}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/merchandise/products/by-slug/${slug}`);
      setProduct(data);
      setVariantId(data?.variants?.[0]?.id || '');
    } catch (e) {
      setError(apiErrorMessage(e, 'Produk tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const variants = product?.variants || [];
  const selected = variants.find((v) => v.id === variantId);
  const price = selected?.price_override ?? product?.price ?? 0;
  const stock = selected ? selected.stock_quantity : product?.stock_quantity ?? 0;
  const outOfStock = !product?.in_stock || stock <= 0;

  const addToCart = () => {
    if (variants.length && !variantId) {
      toast.error('Pilih varian terlebih dahulu.');
      return;
    }
    addItem({
      product_id: product.id,
      variant_id: variantId || null,
      quantity,
      name: product.name,
      variant_name: selected?.name || null,
      unit_price: price,
      image: product.cover_url || null,
      slug: product.slug,
    });
    toast.success('Ditambahkan ke keranjang.');
  };

  return (
    <div data-testid="page-product-detail">
      <PublicPageHeader
        label="Merchandise"
        title={product?.name || 'Produk'}
        description={product?.short_description}
        backgroundImage={product?.cover_url}
        imageAlt={product?.name}
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Merchandise', to: '/merchandise' }, { label: 'Produk' }]}
      />
      <div className="als-container py-10 sm:py-14">
        {loading ? (
          <LoadingState variant="text" testId="product-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="product-error" />
        ) : (
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="als-card als-zoom h-80 overflow-hidden sm:h-[420px]" style={{ backgroundColor: 'var(--surface-3)' }}>
                {product.cover_url ? (
                  <img src={product.cover_url} alt={product.name} className="h-full w-full object-cover" loading="eager" />
                ) : (
                  <div className="als-stadium-glow flex h-full items-center justify-center" style={{ backgroundColor: '#000000' }}>
                    <ShoppingBag className="h-12 w-12" style={{ color: 'rgba(252,207,43,0.5)' }} />
                  </div>
                )}
              </div>
              {(product.gallery || []).length ? (
                <div className="grid grid-cols-4 gap-3">
                  {product.gallery.map((m) => (
                    <img key={m.id} src={m.url} alt={m.alt_text || product.name} className="h-20 w-full rounded-[8px] object-cover" loading="lazy" />
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              {product.category ? <Badge variant="outline">{product.category.name}</Badge> : null}
              <h2 className="font-display mt-4 text-2xl font-bold sm:text-3xl">{product.name}</h2>
              <p className="font-display mt-3 text-2xl font-extrabold" style={{ color: 'var(--club-secondary)' }} data-testid="product-price">
                {formatIDR(price)}
              </p>
              {product.compare_at_price ? (
                <p className="text-sm line-through" style={{ color: 'var(--muted-fg)' }}>
                  {formatIDR(product.compare_at_price)}
                </p>
              ) : null}

              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                {product.description || 'Deskripsi produk belum tersedia.'}
              </p>

              {variants.length ? (
                <div className="mt-6">
                  <p className="als-section-label mb-2">Varian</p>
                  <div className="flex flex-wrap gap-2" data-testid="product-variant-selector">
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariantId(v.id)}
                        disabled={v.stock_quantity <= 0}
                        className="als-focus min-h-[44px] rounded-[var(--radius-sm)] px-4 text-sm font-semibold transition-colors duration-200 disabled:opacity-40"
                        style={{
                          backgroundColor: variantId === v.id ? 'var(--club-primary)' : 'var(--surface-2)',
                          color: variantId === v.id ? '#000000' : 'var(--fg)',
                        }}
                        data-testid={`product-variant-${v.id}`}
                      >
                        {v.name}
                        {v.stock_quantity <= 0 ? ' (habis)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))} data-testid="product-qty-minus">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-display w-10 text-center text-base font-bold tabular-nums" data-testid="product-qty">
                    {quantity}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => Math.min(50, q + 1))} data-testid="product-qty-plus">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="product-stock">
                  {outOfStock ? 'Stok habis' : `Stok tersedia: ${stock}`}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="min-h-[44px] font-semibold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  disabled={outOfStock}
                  onClick={addToCart}
                  data-testid="product-add-to-cart"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" /> Tambah ke Keranjang
                </Button>
                <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/cart')} data-testid="product-go-cart">
                  Lihat Keranjang
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
