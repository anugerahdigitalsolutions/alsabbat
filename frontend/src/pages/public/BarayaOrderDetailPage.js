import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Badge } from '../../components/ui/badge';
import { formatIDR } from '../../context/CartContext';
import { apiErrorMessage } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { barayaOrderDetail } from '../../services/barayaAuth';

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-b-0" style={{ borderColor: 'var(--border-soft)' }}>
    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
      {label}
    </span>
    <span className="max-w-[62%] text-right text-sm font-semibold">{value}</span>
  </div>
);

export default function BarayaOrderDetailPage() {
  const { orderId } = useParams();
  usePageSeo({
    title: 'Detail Pesanan',
    description: 'Detail pesanan merchandise Baraya AL SABBAT.',
    path: `/akun/pesanan/${orderId}`,
    robots: 'noindex,follow',
  });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await barayaOrderDetail(orderId));
    } catch (e) {
      setError(apiErrorMessage(e, 'Pesanan tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const shipping = order?.shipping || {};

  return (
    <div data-testid="page-baraya-order-detail">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title={order?.order_number || 'Detail Pesanan'}
        description="Rincian item, pengiriman, dan status pembayaran pesanan Anda."
        breadcrumb={[
          { label: 'Beranda', to: '/' },
          { label: 'Akun Saya', to: '/akun' },
          { label: 'Pesanan Saya', to: '/akun/pesanan' },
          { label: 'Detail' },
        ]}
      />
      <div className="als-container py-10 sm:py-14">
        <Link
          to="/akun/pesanan"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--club-secondary)' }}
          data-testid="baraya-order-back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua pesanan
        </Link>

        {loading ? (
          <LoadingState variant="text" testId="baraya-order-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="baraya-order-error" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <div className="als-card p-6" data-testid="baraya-order-items">
              <p className="als-section-label mb-4">Item Pesanan</p>
              <div className="space-y-3">
                {(order.items || []).map((item) => (
                  <div key={`${item.product_id}-${item.variant_id || 'base'}`} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block font-semibold">{item.product_name}</span>
                      <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {item.variant_name ? `${item.variant_name} · ` : ''}
                        {item.quantity} × {formatIDR(item.unit_price)}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold">{formatIDR(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2 border-t pt-4 text-sm" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-fg)' }}>Subtotal</span>
                  <span className="tabular-nums">{formatIDR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-fg)' }}>Pengiriman</span>
                  <span className="tabular-nums">{formatIDR(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
                  <span className="font-display font-bold">Total</span>
                  <span className="font-display text-lg font-bold tabular-nums" data-testid="baraya-order-total">
                    {formatIDR(order.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="als-card p-6" data-testid="baraya-order-status">
                <p className="als-section-label mb-4">Status</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{order.order_status}</Badge>
                  <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }}>
                    {order.payment_status}
                  </Badge>
                </div>
                <div className="mt-4">
                  <Row label="Nomor Pesanan" value={order.order_number} />
                  <Row label="Tanggal" value={(order.created_at || '').slice(0, 10)} />
                  <Row label="Metode" value={order.payment_method || 'Belum ada'} />
                </div>
                {order.payment_redirect_url && order.payment_status === 'PENDING' ? (
                  <a
                    href={order.payment_redirect_url}
                    className="font-display mt-5 inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] px-4 text-sm font-bold"
                    style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                    data-testid="baraya-order-pay"
                  >
                    Lanjutkan Pembayaran
                  </a>
                ) : null}
              </div>

              <div className="als-card p-6" data-testid="baraya-order-shipping">
                <p className="als-section-label mb-4">Pengiriman</p>
                <Row label="Penerima" value={shipping.recipient} />
                <Row label="Alamat" value={shipping.address} />
                <Row label="Kota" value={shipping.city} />
                <Row label="Provinsi" value={shipping.province} />
                <Row label="Kode Pos" value={shipping.postal_code} />
                {shipping.notes ? <Row label="Catatan" value={shipping.notes} /> : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
