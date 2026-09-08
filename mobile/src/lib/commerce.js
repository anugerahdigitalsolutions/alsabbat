/**
 * Label & helper commerce — dicerminkan 1:1 dari backend existing
 * (`app/services/order_fulfilment.py`, `app/services/refunds.py`).
 * Semua angka (harga, ongkir, biaya COD, total) selalu berasal dari server.
 */
export const ORDER_STATUS_LABEL = {
  PENDING: 'Menunggu Pembayaran',
  PROCESSING: 'Diproses',
  PACKED: 'Dikemas',
  READY_TO_SHIP: 'Siap Dikirim',
  SHIPPED: 'Dikirim',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak Pembeli',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dana Dikembalikan',
};

export const PAYMENT_STATUS_LABEL = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Lunas',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
  REFUNDED: 'Dana Dikembalikan',
};

export const REFUND_STATUS_LABEL = {
  REQUESTED: 'Diajukan',
  UNDER_REVIEW: 'Ditinjau',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  PROCESSING: 'Diproses',
  COMPLETED: 'Selesai',
  FAILED: 'Gagal',
};

export const TIMELINE_EVENT_LABEL = {
  ORDER_CREATED: 'Pesanan dibuat',
  COD_SHIPMENT_CREATED: 'Pengiriman COD dibuat',
  COD_SHIPMENT_FAILED: 'Pembuatan pengiriman COD gagal',
  RECEIVED_CONFIRMED: 'Barang diterima pembeli',
  REJECTED_BY_CUSTOMER: 'Barang ditolak pembeli',
  REFUND_REQUESTED: 'Refund diajukan',
  REFUND_UNDER_REVIEW: 'Refund ditinjau',
  REFUND_APPROVED: 'Refund disetujui',
  REFUND_REJECTED: 'Refund ditolak',
  REFUND_PROCESSING: 'Refund diproses',
  REFUND_COMPLETED: 'Refund selesai',
  REFUND_FAILED: 'Refund gagal',
  PAYMENT_EXPIRED: 'Pembayaran kedaluwarsa',
  STOCK_DEDUCTED: 'Stok dikurangi',
  STOCK_RESTOCKED: 'Stok dikembalikan',
  STOCK_SHORTFALL: 'Stok tidak mencukupi',
  PAYMENT_STATUS_CHANGED: 'Status pembayaran diperbarui',
  SHIPPING_UPDATED: 'Data pengiriman diperbarui',
};

export const orderStatusLabel = (status) => ORDER_STATUS_LABEL[status] || status || '—';
export const paymentStatusLabel = (status) => PAYMENT_STATUS_LABEL[status] || status || '—';
export const refundStatusLabel = (status) => REFUND_STATUS_LABEL[status] || status || '—';

/** Label entri timeline (backend hanya mengirim `label` pada beberapa endpoint). */
export const timelineLabel = (entry) =>
  entry?.label ||
  TIMELINE_EVENT_LABEL[entry?.event] ||
  ORDER_STATUS_LABEL[entry?.status] ||
  entry?.event ||
  '—';

/** Warna badge status pesanan (mengikuti token tema klub). */
export const orderStatusTone = (status) => {
  if (status === 'COMPLETED') return 'win';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'lose';
  if (status === 'SHIPPED' || status === 'READY_TO_SHIP') return 'accent';
  return 'default';
};

/**
 * Kurir/layanan/resi yang berlaku. Endpoint admin & tracking mengirim
 * `shipment`; endpoint pesanan Baraya mengirim snapshot `shipping` + `fulfilment`.
 */
export const effectiveShipment = (order) => {
  if (!order) return {};
  if (order.shipment) return order.shipment;
  const snapshot = order.shipping || {};
  const fulfilment = order.fulfilment || {};
  return {
    courier_code: fulfilment.courier_code || snapshot.courier_code,
    courier_name: fulfilment.courier_name || snapshot.courier_name,
    service_code: fulfilment.service_code || snapshot.service_code,
    service_name: fulfilment.service_name || snapshot.service_name,
    awb_number: fulfilment.awb_number || null,
    shipping_note: fulfilment.shipping_note || null,
    shipped_at: order.shipped_at || null,
  };
};

/** Biaya COD sesuai kapabilitas layanan pada hasil quote (tanpa angka karangan). */
export const codFeeForOption = (option, subtotal) => {
  if (!option) return 0;
  if (option.cod_fee !== null && option.cod_fee !== undefined) return Number(option.cod_fee) || 0;
  if (option.cod_fee_percent !== null && option.cod_fee_percent !== undefined) {
    return Math.round((Number(subtotal) || 0) * (Number(option.cod_fee_percent) || 0) / 100);
  }
  return 0;
};

export const optionKey = (option) =>
  option ? `${option.courier_code}|${option.service_code}` : '';

export default {
  orderStatusLabel,
  paymentStatusLabel,
  refundStatusLabel,
  timelineLabel,
  effectiveShipment,
};
