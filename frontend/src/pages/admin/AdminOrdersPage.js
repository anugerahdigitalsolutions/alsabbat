import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, PackageCheck, Receipt, RefreshCw, Truck } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { EmptyState } from '../../components/shared/EmptyState';
import { OrderTimeline, orderStatusLabel } from '../../components/shared/OrderTimeline';
import { formatIDR } from '../../context/CartContext';

const ORDER_STATUS = ['PENDING', 'PROCESSING', 'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
const PAYMENT_STATUS = ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'];

const STATUS_TONE = {
  PENDING: 'rgba(0,0,0,0.06)',
  PROCESSING: 'rgba(1,40,145,0.10)',
  PACKED: 'rgba(1,40,145,0.16)',
  READY_TO_SHIP: 'rgba(252,207,43,0.22)',
  SHIPPED: 'rgba(252,207,43,0.30)',
  COMPLETED: 'rgba(22,163,74,0.16)',
  CANCELLED: 'rgba(153,27,27,0.12)',
  REFUNDED: 'rgba(153,27,27,0.12)',
};

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border-soft)' }}>
    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
      {label}
    </span>
    <span className="max-w-[60%] break-words text-right text-sm font-semibold">{value || '—'}</span>
  </div>
);

const StatusBadge = ({ status, testId }) => (
  <Badge variant="outline" style={{ backgroundColor: STATUS_TONE[status] || 'transparent' }} data-testid={testId}>
    {orderStatusLabel(status)}
  </Badge>
);

export default function AdminOrdersPage() {
  const [items, setItems] = useState([]);
  const [payment, setPayment] = useState(null);
  const [filters, setFilters] = useState({ order_status: 'all', payment_status: 'all', q: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shipForm, setShipForm] = useState({ courier_code: '', service_code: '', awb_number: '' });
  const [manual, setManual] = useState({ amount: '', transfer_reference: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 50 };
      if (filters.order_status !== 'all') params.order_status = filters.order_status;
      if (filters.payment_status !== 'all') params.payment_status = filters.payment_status;
      if (filters.q.trim()) params.q = filters.q.trim();
      const [orders, cfg] = await Promise.all([
        api.get('/merchandise/orders', { params }),
        api.get('/merchandise/payment/status'),
      ]);
      setItems(orders.data?.items || []);
      setPayment(cfg.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat order.'));
    } finally {
      setLoading(false);
    }
  }, [filters.order_status, filters.payment_status, filters.q]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.order_status, filters.payment_status]);

  const openDetail = async (orderId) => {
    setDetailLoading(true);
    setDetail({ id: orderId });
    try {
      const { data } = await api.get(`/merchandise/orders/${orderId}`);
      setDetail(data);
      setShipForm({
        courier_code: data.shipment?.courier_code || '',
        service_code: data.shipment?.service_code || '',
        awb_number: data.shipment?.awb_number || '',
      });
    } catch (e) {
      setDetail(null);
      toast.error(apiErrorMessage(e, 'Gagal memuat detail order.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const applyOrder = (data) => {
    setDetail(data);
    setItems((current) => current.map((o) => (o.id === data.id ? { ...o, ...data } : o)));
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/merchandise/orders/${detail.id}/status`, { order_status: status });
      applyOrder(data);
      toast.success(`Status pesanan: ${orderStatusLabel(status)}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Perubahan status ditolak.'));
    } finally {
      setBusy(false);
    }
  };

  const saveShipment = async () => {
    setBusy(true);
    try {
      const body = {};
      Object.entries(shipForm).forEach(([key, value]) => {
        if (value.trim()) body[key] = value.trim();
      });
      const { data } = await api.patch(`/merchandise/orders/${detail.id}/fulfilment`, body);
      applyOrder(data);
      toast.success('Data pengiriman disimpan.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan data pengiriman.'));
    } finally {
      setBusy(false);
    }
  };

  const refund = detail?.refund || null;
  const isCod = detail?.payment_method_choice === 'COD';

  const runRefundAction = async (path, body) => {
    setBusy(true);
    try {
      await api[body === undefined ? 'post' : 'patch'](`/merchandise/refunds/${refund.id}/${path}`, body);
      const { data } = await api.get(`/merchandise/orders/${detail.id}`);
      applyOrder(data);
      toast.success('Refund diperbarui.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Aksi refund gagal.'));
    } finally {
      setBusy(false);
    }
  };

  const processRefund = async () => {
    setBusy(true);
    try {
      await api.post(`/merchandise/refunds/${refund.id}/process`);
      const { data } = await api.get(`/merchandise/orders/${detail.id}`);
      applyOrder(data);
      toast.success('Refund diproses.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Aksi refund gagal.'));
    } finally {
      setBusy(false);
    }
  };

  const completeManualRefund = async () => {
    setBusy(true);
    try {
      await api.post(`/merchandise/refunds/${refund.id}/manual-transfer`, {
        amount: Number(manual.amount || refund.amount),
        transfer_reference: manual.transfer_reference,
        note: manual.note || undefined,
      });
      const { data } = await api.get(`/merchandise/orders/${detail.id}`);
      applyOrder(data);
      toast.success('Transfer refund dicatat.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal mencatat transfer refund.'));
    } finally {
      setBusy(false);
    }
  };

  const createCodShipment = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/merchandise/orders/${detail.id}/cod-shipment`);
      applyOrder(data);
      toast.success('Pengiriman COD dibuat.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal membuat pengiriman COD.'));
    } finally {
      setBusy(false);
    }
  };

  const shipment = detail?.shipment || {};
  const snapshotShipping = detail?.shipping || {};

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
                  {orderStatusLabel(s)}
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
              {PAYMENT_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          className="w-full sm:w-64"
          placeholder="Cari nomor order / nama / email / resi…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load();
          }}
          data-testid="orders-search"
        />
        <Button variant="outline" onClick={load} data-testid="orders-reload">
          <RefreshCw className="mr-2 h-4 w-4" /> Muat ulang
        </Button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="orders-loading">
          Memuat…
        </p>
      ) : error ? (
        <div className="als-card p-5" data-testid="orders-error">
          <p className="text-sm" style={{ color: '#991B1B' }}>
            {error}
          </p>
          <Button variant="outline" className="mt-3" onClick={load}>
            Coba lagi
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Receipt} title="Belum ada order" description="Order dari toko merchandise akan muncul di sini." testId="orders-empty" />
      ) : (
        <div className="space-y-3" data-testid="orders-list">
          {items.map((order) => (
            <div key={order.id} className="als-card p-5" data-testid={`order-row-${order.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold">{order.order_number}</span>
                <StatusBadge status={order.order_status} testId={`order-status-${order.id}`} />
                <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }}>
                  {order.payment_status}
                </Badge>
                <span className="font-display ml-auto text-base font-bold tabular-nums">{formatIDR(order.total)}</span>
              </div>
              <p className="mt-2 break-words text-sm" style={{ color: 'var(--muted-fg)' }}>
                {(order.created_at || '').slice(0, 10)} · {order.customer?.name} · {order.customer?.email}
              </p>
              <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                {order.item_count} item · Subtotal {formatIDR(order.subtotal)} · Ongkir {formatIDR(order.shipping_cost)}
                {order.shipment?.awb_number ? ` · Resi ${order.shipment.awb_number}` : ''}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => openDetail(order.id)}
                data-testid={`order-detail-open-${order.id}`}
              >
                <PackageCheck className="mr-2 h-4 w-4" /> Kelola pesanan
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(open) => (open ? null : setDetail(null))}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto" data-testid="order-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">{detail?.order_number || 'Detail Pesanan'}</DialogTitle>
          </DialogHeader>

          {detailLoading || !detail?.order_number ? (
            <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="order-detail-loading">
              Memuat detail…
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={detail.order_status} testId="order-detail-status" />
                <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }} data-testid="order-detail-payment-status">
                  {detail.payment_status}
                </Badge>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div data-testid="order-detail-customer">
                  <p className="als-section-label mb-2">Pembeli</p>
                  <Row label="Nama" value={detail.customer?.name} />
                  <Row label="Email" value={detail.customer?.email} />
                  <Row label="Telepon" value={detail.customer?.phone} />
                </div>
                <div data-testid="order-detail-shipping">
                  <p className="als-section-label mb-2">Pengiriman</p>
                  <Row label="Penerima" value={snapshotShipping.recipient} />
                  <Row label="Alamat" value={snapshotShipping.address} />
                  <Row
                    label="Kota / Provinsi"
                    value={[snapshotShipping.city, snapshotShipping.province, snapshotShipping.postal_code].filter(Boolean).join(', ')}
                  />
                  <Row label="Tujuan (RajaOngkir)" value={snapshotShipping.destination_label || snapshotShipping.destination_id} />
                  <Row
                    label="Kurir / Layanan"
                    value={[shipment.courier_name || shipment.courier_code, shipment.service_code].filter(Boolean).join(' · ')}
                  />
                  <Row label="Ongkir" value={formatIDR(detail.shipping_cost)} />
                  <Row label="Nomor Resi (AWB)" value={shipment.awb_number} />
                  {snapshotShipping.notes ? <Row label="Catatan Pembeli" value={snapshotShipping.notes} /> : null}
                </div>
              </div>

              <div data-testid="order-detail-items">
                <p className="als-section-label mb-2">Item (harga saat pesanan dibuat)</p>
                <div className="space-y-2">
                  {(detail.items || []).map((item) => (
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
                <div className="mt-3 space-y-1 border-t pt-3 text-sm" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-fg)' }}>Subtotal</span>
                    <span className="tabular-nums">{formatIDR(detail.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-fg)' }}>Ongkir</span>
                    <span className="tabular-nums">{formatIDR(detail.shipping_cost)}</span>
                  </div>
                  {detail.cod_fee ? (
                    <div className="flex justify-between" data-testid="order-detail-cod-fee">
                      <span style={{ color: 'var(--muted-fg)' }}>Biaya COD</span>
                      <span className="tabular-nums">{formatIDR(detail.cod_fee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="font-display font-bold">Total</span>
                    <span className="font-display font-bold tabular-nums" data-testid="order-detail-total">
                      {formatIDR(detail.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div data-testid="order-detail-payment">
                <p className="als-section-label mb-2">Pembayaran</p>
                <Row label="Provider" value={detail.payment_provider} />
                <Row label="Metode" value={detail.payment_method} />
                <Row label="Status" value={detail.payment_status} />
                <Row label="Referensi" value={detail.payment_reference} />
              </div>

              <div data-testid="order-detail-fulfilment">
                <p className="als-section-label mb-2">Kurir & Resi (AWB)</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="mb-1.5 block">Kurir</Label>
                    <Input
                      value={shipForm.courier_code}
                      onChange={(e) => setShipForm((f) => ({ ...f, courier_code: e.target.value }))}
                      placeholder="jne"
                      data-testid="order-fulfilment-courier"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Layanan</Label>
                    <Input
                      value={shipForm.service_code}
                      onChange={(e) => setShipForm((f) => ({ ...f, service_code: e.target.value }))}
                      placeholder="REG"
                      data-testid="order-fulfilment-service"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Nomor Resi (AWB)</Label>
                    <Input
                      value={shipForm.awb_number}
                      onChange={(e) => setShipForm((f) => ({ ...f, awb_number: e.target.value }))}
                      placeholder="Masukkan resi asli dari kurir"
                      data-testid="order-fulfilment-awb"
                    />
                  </div>
                </div>
                <Button variant="outline" className="mt-3" onClick={saveShipment} disabled={busy} data-testid="order-fulfilment-save">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                  Simpan data pengiriman
                </Button>
                <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
                  Resi wajib diisi sebelum pesanan ditandai Siap Dikirim / Dikirim. Tidak ada pelacakan otomatis pada fase ini.
                </p>
              </div>

              {isCod ? (
                <div data-testid="order-detail-cod">
                  <p className="als-section-label mb-2">COD</p>
                  <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                    Biaya COD {formatIDR(detail.cod_fee || 0)} · dibayar pembeli saat barang diterima.
                  </p>
                  <Button variant="outline" className="mt-2" onClick={createCodShipment} disabled={busy} data-testid="order-cod-shipment">
                    Buat Pengiriman COD (Delivery API)
                  </Button>
                </div>
              ) : null}

              {refund ? (
                <div data-testid="order-detail-refund">
                  <p className="als-section-label mb-2">Refund — {refund.status_label}</p>
                  <Row label="Metode" value={refund.method} />
                  <Row label="Nominal" value={formatIDR(refund.amount)} />
                  <Row label="Alasan" value={refund.reason} />
                  <Row label="Detail" value={refund.detail} />
                  <Row label="Rekening" value={refund.bank_account} />
                  <Row label="Referensi Provider" value={refund.provider_reference} />
                  <Row label="Referensi Transfer" value={refund.transfer_reference} />
                  {(refund.evidence_urls || []).length ? (
                    <div className="mt-2 flex flex-wrap gap-2" data-testid="order-refund-evidence">
                      {refund.evidence_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                          Lihat bukti
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['REQUESTED', 'UNDER_REVIEW'].includes(refund.status) ? (
                      <>
                        <Button onClick={() => runRefundAction('review', { decision: 'APPROVED' })} disabled={busy} style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }} data-testid="refund-approve">
                          Setujui
                        </Button>
                        <Button variant="outline" onClick={() => runRefundAction('review', { decision: 'REJECTED' })} disabled={busy} data-testid="refund-reject">
                          Tolak
                        </Button>
                      </>
                    ) : null}
                    {['APPROVED', 'FAILED'].includes(refund.status) ? (
                      <Button onClick={processRefund} disabled={busy} style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }} data-testid="refund-process">
                        Proses Refund
                      </Button>
                    ) : null}
                  </div>
                  {refund.status === 'PROCESSING' && refund.method === 'COD_MANUAL' ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="refund-manual-form">
                      <Input placeholder={`Nominal (${refund.amount})`} value={manual.amount} onChange={(e) => setManual((m) => ({ ...m, amount: e.target.value }))} data-testid="refund-manual-amount" />
                      <Input placeholder="Referensi transfer" value={manual.transfer_reference} onChange={(e) => setManual((m) => ({ ...m, transfer_reference: e.target.value }))} data-testid="refund-manual-reference" />
                      <Button onClick={completeManualRefund} disabled={busy || manual.transfer_reference.trim().length < 3} data-testid="refund-manual-submit">
                        Catat Transfer
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div data-testid="order-detail-actions">
                <p className="als-section-label mb-2">Aksi Fulfillment</p>
                {(detail.allowed_transitions || []).length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="order-actions-empty">
                    Pesanan sudah final — tidak ada aksi status yang tersedia.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(detail.allowed_transitions || []).map((action) => (
                      <Button
                        key={action.status}
                        onClick={() => changeStatus(action.status)}
                        disabled={busy || !action.allowed}
                        title={action.blocked_reason || ''}
                        variant={action.status === 'CANCELLED' ? 'outline' : 'default'}
                        style={
                          action.status === 'CANCELLED'
                            ? undefined
                            : { backgroundColor: 'var(--club-primary)', color: '#000000' }
                        }
                        data-testid={`order-action-${action.status}`}
                      >
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Tandai {action.label}
                      </Button>
                    ))}
                  </div>
                )}
                {(detail.allowed_transitions || [])
                  .filter((a) => !a.allowed && a.blocked_reason)
                  .map((a) => (
                    <p key={a.status} className="mt-2 text-xs" style={{ color: '#991B1B' }} data-testid={`order-action-blocked-${a.status}`}>
                      {a.label}: {a.blocked_reason}
                    </p>
                  ))}
              </div>

              <div data-testid="order-detail-timeline">
                <p className="als-section-label mb-2">Timeline</p>
                <OrderTimeline entries={detail.timeline} showActor testId="admin-order-timeline" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
