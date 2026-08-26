import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/button';
import { formatIDR, useCart } from '../../context/CartContext';

export default function CartPage() {
  const { lines, payload, updateQuantity, removeItem, count } = useCart();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const revalidate = useCallback(async () => {
    if (!payload.length) {
      setSummary(null);
      setError(null);
      return;
    }
    try {
      const { data } = await api.post('/merchandise/cart/revalidate', { items: payload });
      setSummary(data);
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Keranjang tidak dapat divalidasi.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  useEffect(() => {
    revalidate();
  }, [revalidate]);

  return (
    <div data-testid="page-cart">
      <PublicPageHeader
        label="Store"
        title="Keranjang"
        description="Harga dan stok selalu divalidasi ulang oleh server sebelum checkout."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Merchandise', to: '/merchandise' }, { label: 'Keranjang' }]}
      />
      <div className="als-container py-10 sm:py-14">
        {lines.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Keranjang Anda kosong"
            description="Jelajahi merchandise resmi ALSABBAT terlebih dahulu."
            testId="cart-empty"
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={`${line.product_id}-${line.variant_id || 'base'}`} className="als-card flex items-center gap-4 p-4" data-testid={`cart-line-${index}`}>
                  {line.image ? (
                    <img src={line.image} alt={line.name} className="h-16 w-16 shrink-0 rounded-[8px] object-cover" loading="lazy" />
                  ) : (
                    <span className="h-16 w-16 shrink-0 rounded-[8px]" style={{ backgroundColor: 'var(--surface-3)' }} aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link to={`/merchandise/${line.slug}`} className="font-display block truncate text-sm font-semibold">
                      {line.name}
                    </Link>
                    {line.variant_name ? (
                      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {line.variant_name}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--club-secondary)' }}>
                      {formatIDR(line.unit_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => updateQuantity(index, line.quantity - 1)} data-testid={`cart-minus-${index}`}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-display w-8 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => updateQuantity(index, line.quantity + 1)} data-testid={`cart-plus-${index}`}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => removeItem(index)} data-testid={`cart-remove-${index}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="als-card h-fit p-5" data-testid="cart-summary">
              <p className="als-section-label mb-4">Ringkasan</p>
              {error ? (
                <p className="text-sm" style={{ color: '#991B1B' }} data-testid="cart-error">
                  {error}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted-fg)' }}>Item</span>
                    <span className="tabular-nums">{count}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted-fg)' }}>Subtotal</span>
                    <span className="tabular-nums">{formatIDR(summary?.subtotal || 0)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted-fg)' }}>Pengiriman</span>
                    <span className="tabular-nums">{formatIDR(summary?.shipping_cost || 0)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
                    <span className="font-display font-bold">Total</span>
                    <span className="font-display text-lg font-bold tabular-nums">{formatIDR(summary?.total || 0)}</span>
                  </div>
                </>
              )}
              <Button
                className="mt-5 w-full min-h-[44px] font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                disabled={!!error || !summary}
                onClick={() => navigate('/checkout')}
                data-testid="cart-checkout-button"
              >
                Lanjut ke Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
