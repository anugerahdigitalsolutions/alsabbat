import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { formatIDR } from '../../context/CartContext';
import { apiErrorMessage } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { barayaOrders } from '../../services/barayaAuth';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

export default function BarayaOrdersPage() {
  usePageSeo({
    title: 'Pesanan Saya',
    description: 'Riwayat pesanan merchandise Baraya AL SABBAT.',
    path: '/akun/pesanan',
    robots: 'noindex,follow',
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await barayaOrders();
      setItems(data.items || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat riwayat pesanan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div data-testid="page-baraya-orders">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Pesanan Saya"
        description="Riwayat pesanan merchandise yang tercatat pada akun Baraya Anda."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Akun Saya', to: '/akun' }, { label: 'Pesanan Saya' }]}
      />
      <div className="als-container py-10 sm:py-14">
        {loading ? (
          <LoadingState rows={3} testId="baraya-orders-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="baraya-orders-error" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada pesanan"
            description="Pesanan merchandise yang Anda buat setelah login akan tampil di sini."
            testId="baraya-orders-empty"
          />
        ) : (
          <div className="space-y-4">
            {items.map((order) => (
              <Link
                key={order.id}
                to={`/akun/pesanan/${order.id}`}
                className="als-card als-lift als-focus block p-5"
                data-testid={`baraya-order-${order.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-bold">{order.order_number}</p>
                    <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                      {formatDate(order.created_at)} · {(order.items || []).length} produk
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{order.order_status}</Badge>
                    <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }}>
                      {order.payment_status}
                    </Badge>
                    <span className="font-display text-sm font-bold tabular-nums">{formatIDR(order.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
