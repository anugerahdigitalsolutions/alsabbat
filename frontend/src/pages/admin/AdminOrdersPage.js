import React, { useEffect, useState } from 'react';
import { Receipt, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatIDR } from '../../context/CartContext';

const ORDER_STATUS = ['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

export default function AdminOrdersPage() {
  const [items, setItems] = useState([]);
  const [payment, setPayment] = useState(null);
  const [filters, setFilters] = useState({ order_status: 'all', payment_status: 'all', q: '' });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filters.order_status !== 'all') params.order_status = filters.order_status;
      if (filters.payment_status !== 'all') params.payment_status = filters.payment_status;
      if (filters.q) params.q = filters.q;
      const [orders, cfg] = await Promise.all([
        api.get('/merchandise/orders', { params }),
        api.get('/merchandise/payment/status'),
      ]);
      setItems(orders.data?.items || []);
      setPayment(cfg.data);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat order.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.order_status, filters.payment_status]);

  const updateStatus = async (id, order_status) => {
    setBusyId(id);
    try {
      await api.patch(`/merchandise/orders/${id}/status`, { order_status });
      toast.success(`Status order diperbarui: ${order_status}`);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memperbarui status.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-orders-page">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
          Order hanya ditandai PAID setelah notifikasi terverifikasi dari payment gateway.
          {payment ? ` Provider: ${payment.label} (${payment.status}).` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48">
          <Select value={filters.order_status} onValueChange={(v) => setFilters((f) => ({ ...f, order_status: v }))}>
            <SelectTrigger data-testid="orders-filter-status">
              <SelectValue placeholder="Status order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status order</SelectItem>
              {ORDER_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select value={filters.payment_status} onValueChange={(v) => setFilters((f) => ({ ...f, payment_status: v }))}>
            <SelectTrigger data-testid="orders-filter-payment">
              <SelectValue placeholder="Status pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua pembayaran</SelectItem>
              {['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          className="w-full sm:w-56"
          placeholder="Cari nomor order…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          data-testid="orders-search"
        />
        <Button variant="outline" onClick={load} data-testid="orders-reload">
          <RefreshCw className="mr-2 h-4 w-4" /> Muat ulang
        </Button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          Memuat…
        </p>
      ) : items.length === 0 ? (
        <EmptyState icon={Receipt} title="Belum ada order" description="Order dari toko merchandise akan muncul di sini." testId="orders-empty" />
      ) : (
        <div className="space-y-3">
          {items.map((order) => (
            <div key={order.id} className="als-card p-5" data-testid={`order-row-${order.id}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-base font-bold">{order.order_number}</span>
                <Badge variant="outline">{order.order_status}</Badge>
                <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }}>
                  {order.payment_status}
                </Badge>
                <span className="font-display ml-auto text-base font-bold tabular-nums">{formatIDR(order.total)}</span>
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted-fg)' }}>
                {order.customer?.name} · {order.customer?.email} · {order.customer?.phone}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                {order.shipping?.recipient} — {order.shipping?.address}, {order.shipping?.city}, {order.shipping?.province} {order.shipping?.postal_code}
              </p>
              <div className="mt-3 space-y-1">
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
              <div className="mt-4 w-full sm:w-56">
                <Select value={order.order_status} onValueChange={(v) => updateStatus(order.id, v)} disabled={busyId === order.id}>
                  <SelectTrigger data-testid={`order-status-select-${order.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
