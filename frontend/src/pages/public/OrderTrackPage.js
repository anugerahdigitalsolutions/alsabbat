import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { formatIDR } from '../../context/CartContext';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function OrderTrackPage() {
  usePageSeo({ title: 'Lacak Pesanan', description: 'Lacak status pesanan merchandise AL SABBAT Football Club.', path: '/order', robots: 'noindex,follow' });
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    order_number: params.get('order_number') || '',
    email: params.get('email') || '',
  });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const track = async (payload = form) => {
    if (!payload.order_number || !payload.email) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/merchandise/orders/track', { params: payload });
      setOrder(data);
    } catch (e) {
      setOrder(null);
      setError(apiErrorMessage(e, 'Pesanan tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (form.order_number && form.email) track(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="page-order-track">
      <PublicPageHeader
        label="Toko"
        title="Lacak Pesanan"
        description="Masukkan nomor pesanan dan email yang digunakan saat checkout."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Merchandise', to: '/merchandise' }, { label: 'Lacak Pesanan' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="als-card max-w-xl p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Nomor Pesanan</Label>
              <Input
                value={form.order_number}
                onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))}
                placeholder="ALS-2026-000001"
                data-testid="track-order-number"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                data-testid="track-email"
              />
            </div>
          </div>
          <Button
            className="mt-5 min-h-[44px] font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            onClick={() => track()}
            disabled={loading}
            data-testid="track-submit"
          >
            <PackageSearch className="mr-2 h-4 w-4" /> Lacak
          </Button>
          {error ? (
            <p className="mt-4 text-sm" style={{ color: '#991B1B' }} data-testid="track-error">
              {error}
            </p>
          ) : null}
        </div>

        {order ? (
          <div className="als-card mt-6 max-w-xl p-6" data-testid="track-result">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-display text-lg font-bold">{order.order_number}</p>
              <Badge variant="outline">{order.order_status}</Badge>
              <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }}>
                {order.payment_status}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              {(order.items || []).map((item) => (
                <div key={`${item.product_id}-${item.variant_id || 'base'}`} className="flex justify-between text-sm">
                  <span>
                    {item.product_name}
                    {item.variant_name ? ` · ${item.variant_name}` : ''} × {item.quantity}
                  </span>
                  <span className="tabular-nums">{formatIDR(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
              <span className="font-display font-bold">Total</span>
              <span className="font-display font-bold tabular-nums">{formatIDR(order.total)}</span>
            </div>
            {order.payment_redirect_url && order.payment_status === 'PENDING' ? (
              <a
                href={order.payment_redirect_url}
                className="font-display mt-5 inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] px-4 text-sm font-bold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="track-pay-link"
              >
                Lanjutkan Pembayaran
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
