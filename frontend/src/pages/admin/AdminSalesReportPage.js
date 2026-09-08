import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { formatIDR } from '../../context/CartContext';
import { orderStatusLabel } from '../../components/shared/OrderTimeline';

const PERIODS = [
  ['today', 'Hari ini'],
  ['yesterday', 'Kemarin'],
  ['this_week', 'Minggu ini'],
  ['this_month', 'Bulan ini'],
  ['last_month', 'Bulan lalu'],
  ['custom', 'Rentang kustom'],
];

const Metric = ({ label, value, hint, testId }) => (
  <div className="als-card p-4" data-testid={testId}>
    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
      {label}
    </p>
    <p className="font-display mt-1 text-xl font-bold tabular-nums">{value}</p>
    {hint ? (
      <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
        {hint}
      </p>
    ) : null}
  </div>
);

const Table = ({ head, rows, testId, empty }) => (
  <div className="als-card w-full min-w-0 max-w-full overflow-x-auto p-0" data-testid={testId}>
    <table className="w-full min-w-[520px] text-sm">
      <thead>
        <tr style={{ backgroundColor: 'var(--surface-2)' }}>
          {head.map((h) => (
            <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td className="px-3 py-4 text-sm" colSpan={head.length} style={{ color: 'var(--muted-fg)' }}>
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={index} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
              {row.map((cell, i) => (
                <td key={i} className="px-3 py-2 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default function AdminSalesReportPage() {
  const [period, setPeriod] = useState('this_month');
  const [granularity, setGranularity] = useState('day');
  const [custom, setCustom] = useState({ date_from: '', date_to: '' });
  const [report, setReport] = useState(null);
  const [products, setProducts] = useState(null);
  const [sortBy, setSortBy] = useState('quantity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = useMemo(() => {
    const base = { period };
    if (period === 'custom') {
      base.date_from = custom.date_from;
      base.date_to = custom.date_to;
    }
    return base;
  }, [period, custom.date_from, custom.date_to]);

  const load = useCallback(async () => {
    if (period === 'custom' && (!custom.date_from || !custom.date_to)) return;
    setLoading(true);
    setError(null);
    try {
      const [sales, prod] = await Promise.all([
        api.get('/reports/sales', { params: { ...params, granularity } }),
        api.get('/reports/sales/products', { params: { ...params, sort_by: sortBy } }),
      ]);
      setReport(sales.data);
      setProducts(prod.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat laporan penjualan.'));
    } finally {
      setLoading(false);
    }
  }, [params, granularity, sortBy, period, custom.date_from, custom.date_to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    try {
      const response = await api.get('/reports/sales/export.csv', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-penjualan-${report?.period?.from || 'export'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Laporan CSV diunduh.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal mengekspor laporan.'));
    }
  };

  const summary = report?.summary;

  return (
    <div className="space-y-6" data-testid="admin-sales-report-page">
      <div>
        <h1 className="font-display text-2xl font-bold">Sales Report</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
          Semua angka dihitung di server dari data pesanan &amp; refund sebenarnya (zona waktu{' '}
          {report?.period?.timezone || 'Asia/Jakarta'}).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48">
          <Label className="mb-1.5 block">Periode</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger data-testid="report-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {period === 'custom' ? (
          <>
            <div className="w-full sm:w-40">
              <Label className="mb-1.5 block">Dari</Label>
              <Input type="date" value={custom.date_from} onChange={(e) => setCustom((c) => ({ ...c, date_from: e.target.value }))} data-testid="report-date-from" />
            </div>
            <div className="w-full sm:w-40">
              <Label className="mb-1.5 block">Sampai</Label>
              <Input type="date" value={custom.date_to} onChange={(e) => setCustom((c) => ({ ...c, date_to: e.target.value }))} data-testid="report-date-to" />
            </div>
          </>
        ) : null}
        <div className="w-full sm:w-40">
          <Label className="mb-1.5 block">Tren</Label>
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger data-testid="report-granularity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Per hari</SelectItem>
              <SelectItem value="week">Per minggu</SelectItem>
              <SelectItem value="month">Per bulan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!summary} data-testid="report-export">
          <Download className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="report-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> Menghitung laporan…
        </p>
      ) : error ? (
        <div className="als-card p-5" data-testid="report-error">
          <p className="text-sm" style={{ color: '#991B1B' }}>
            {error}
          </p>
          <Button variant="outline" className="mt-3" onClick={load}>
            Coba lagi
          </Button>
        </div>
      ) : !summary ? null : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="report-metrics">
            <Metric label="Gross Sales" value={formatIDR(summary.gross_sales)} hint={report.definitions.gross_sales} testId="metric-gross" />
            <Metric label="Net Sales" value={formatIDR(summary.net_sales)} hint={report.definitions.net_sales} testId="metric-net" />
            <Metric label="Ongkir" value={formatIDR(summary.shipping_amount)} hint={report.definitions.shipping_amount} testId="metric-shipping" />
            <Metric label="Biaya COD" value={formatIDR(summary.cod_fee)} hint={report.definitions.cod_fee} testId="metric-cod" />
            <Metric label="Total Refund" value={formatIDR(summary.total_refund)} hint={report.definitions.total_refund} testId="metric-refund" />
            <Metric label="Pesanan Terhitung" value={summary.counted_orders} hint={report.definitions.counted_orders} testId="metric-counted" />
            <Metric label="Total Pesanan" value={summary.total_orders} testId="metric-orders" />
            <Metric label="Item Terjual" value={summary.items_sold} testId="metric-items" />
          </div>

          <div className="als-card p-5" data-testid="report-trend">
            <p className="als-section-label mb-4">Tren Penjualan</p>
            {report.trend.points.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                Belum ada penjualan pada periode ini.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.trend.points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(value) => formatIDR(value)} />
                    <Legend />
                    <Bar dataKey="gross_sales" name="Gross Sales" fill="#012891" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="shipping_amount" name="Ongkir" fill="#FCCF2B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <p className="als-section-label">Status Pesanan</p>
              <Table
                testId="report-status-table"
                head={['Status', 'Jumlah', 'Nilai']}
                empty="Belum ada pesanan."
                rows={summary.status_breakdown.map((row) => [orderStatusLabel(row.status), row.count, formatIDR(row.amount)])}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="als-section-label">Metode Pembayaran</p>
              <Table
                testId="report-payment-table"
                head={['Metode', 'Pesanan', 'Nilai', 'Selesai', 'Batal', 'Refund']}
                empty="Belum ada transaksi."
                rows={summary.payment_methods.map((row) => [row.method, row.orders, formatIDR(row.amount), row.completed, row.cancelled, row.refunded])}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="als-section-label">Pengiriman</p>
              <Table
                testId="report-shipping-table"
                head={['Kurir', 'Layanan', 'Kiriman', 'Ongkir', 'COD', 'Biaya COD']}
                empty="Belum ada pengiriman."
                rows={report.shipping.map((row) => [row.courier, row.service, row.shipments, formatIDR(row.shipping_amount), row.cod_shipments, formatIDR(row.cod_fee)])}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="als-section-label">Refund</p>
              <Table
                testId="report-refund-table"
                head={['Status', 'Jumlah', 'Nominal']}
                empty="Belum ada refund."
                rows={Object.entries(summary.refunds.by_status).map(([status, data]) => [status, data.count, formatIDR(data.amount)])}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="als-section-label">Penjualan per Produk</p>
              <div className="w-40">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger data-testid="report-product-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity">Urut kuantitas</SelectItem>
                    <SelectItem value="revenue">Urut pendapatan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Table
              testId="report-product-table"
              head={['Produk', 'Varian', 'Qty', 'Gross', 'Qty Refund', 'Net']}
              empty="Belum ada produk terjual."
              rows={(products?.items || []).map((row) => [
                row.product_name,
                row.variant_name || '—',
                row.quantity,
                formatIDR(row.gross_sales),
                row.refund_quantity,
                formatIDR(row.net_sales),
              ])}
            />
          </div>

          <div className="min-w-0 space-y-2">
            <p className="als-section-label">Penjualan per Kategori</p>
            <Table
              testId="report-category-table"
              head={['Kategori', 'Item Terjual', 'Gross', 'Net']}
              empty="Belum ada kategori terjual."
              rows={(products?.categories || []).map((row) => [row.category, row.items_sold, formatIDR(row.gross_sales), formatIDR(row.net_sales)])}
            />
          </div>

          <p className="flex items-start gap-2 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="report-definitions">
            <BarChart3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {report.definitions.counted_orders} {report.definitions.net_sales}
          </p>
        </div>
      )}
    </div>
  );
}
