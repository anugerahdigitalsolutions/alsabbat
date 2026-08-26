import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { formatIDR, useCart } from '../../context/CartContext';
import { usePageSeo } from '../../hooks/usePageSeo';

const FIELDS = [
  ['customer.name', 'Nama Lengkap'],
  ['customer.email', 'Email'],
  ['customer.phone', 'Nomor Telepon'],
  ['shipping.recipient', 'Nama Penerima'],
  ['shipping.city', 'Kota'],
  ['shipping.province', 'Provinsi'],
  ['shipping.postal_code', 'Kode Pos'],
];

export default function CheckoutPage() {
  usePageSeo({ title: 'Checkout', description: 'Checkout merchandise resmi ALSABBAT Football Club.', path: '/checkout', robots: 'noindex,follow' });
  const { lines, payload, clear } = useCart();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    customer: { name: '', email: '', phone: '' },
    shipping: { recipient: '', address: '', city: '', province: '', postal_code: '', notes: '' },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [cfg, revalidated] = await Promise.all([
          api.get('/merchandise/payment/status'),
          payload.length ? api.post('/merchandise/cart/revalidate', { items: payload }) : Promise.resolve({ data: null }),
        ]);
        setPaymentConfig(cfg.data);
        setSummary(revalidated.data);
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Gagal memuat data checkout.'));
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (path, value) => {
    const [group, key] = path.split('.');
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/merchandise/checkout', {
        items: payload,
        customer: form.customer,
        shipping: form.shipping,
      });
      setResult(data);
      clear();
      if (data.payment?.redirect_url) {
        window.location.href = data.payment.redirect_url;
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Checkout gagal.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div data-testid="page-checkout">
        <PublicPageHeader label="Toko" title="Pesanan Dibuat" breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Checkout' }]} />
        <div className="als-container py-12">
          <div className="als-card mx-auto max-w-xl p-6" data-testid="checkout-result">
            <p className="als-section-label">Nomor Pesanan</p>
            <p className="font-display mt-1 text-2xl font-bold">{result.order.order_number}</p>
            <p className="mt-4 text-sm" style={{ color: 'var(--muted-fg)' }}>
              Total {formatIDR(result.order.total)} · Pembayaran: {result.order.payment_status}
            </p>
            {!result.payment?.configured ? (
              <p className="mt-4 flex items-start gap-2 text-sm" style={{ color: '#991B1B' }} data-testid="checkout-payment-not-configured">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                PEMBAYARAN BELUM DIKONFIGURASI — {result.payment?.error_message}
              </p>
            ) : null}
            <Button
              className="mt-6 min-h-[44px] font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              onClick={() => navigate(`/order?order_number=${result.order.order_number}&email=${result.order.customer.email}`)}
              data-testid="checkout-track-button"
            >
              Lacak Pesanan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-checkout">
      <PublicPageHeader
        label="Toko"
        title="Checkout"
        description="Total dihitung ulang oleh server. Pembayaran hanya melalui gerbang pembayaran resmi."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Merchandise', to: '/merchandise' }, { label: 'Checkout' }]}
      />
      <div className="als-container py-10 sm:py-14">
        {lines.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Keranjang Anda kosong" description="Tambahkan produk sebelum checkout." testId="checkout-empty" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="als-card space-y-4 p-6">
              <p className="als-section-label">Data Pembeli &amp; Pengiriman</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map(([path, label]) => (
                  <div key={path}>
                    <Label className="mb-1.5 block">{label}</Label>
                    <Input
                      value={path.split('.').reduce((acc, key) => acc[key], form)}
                      onChange={(e) => setField(path, e.target.value)}
                      data-testid={`checkout-${path.replace('.', '-')}`}
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label className="mb-1.5 block">Alamat Lengkap</Label>
                <Textarea rows={3} value={form.shipping.address} onChange={(e) => setField('shipping.address', e.target.value)} data-testid="checkout-shipping-address" />
              </div>
              <div>
                <Label className="mb-1.5 block">Catatan (opsional)</Label>
                <Textarea rows={2} value={form.shipping.notes} onChange={(e) => setField('shipping.notes', e.target.value)} data-testid="checkout-shipping-notes" />
              </div>
            </div>

            <div className="als-card h-fit p-5" data-testid="checkout-summary">
              <p className="als-section-label mb-4">Ringkasan Pesanan</p>
              {(summary?.items || []).map((item) => (
                <div key={`${item.product_id}-${item.variant_id || 'base'}`} className="mb-2 flex justify-between text-sm">
                  <span className="min-w-0 truncate pr-2">
                    {item.product_name}
                    {item.variant_name ? ` · ${item.variant_name}` : ''} × {item.quantity}
                  </span>
                  <span className="tabular-nums">{formatIDR(item.subtotal)}</span>
                </div>
              ))}
              <div className="mt-4 flex justify-between border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
                <span className="font-display font-bold">Total</span>
                <span className="font-display text-lg font-bold tabular-nums" data-testid="checkout-total">
                  {formatIDR(summary?.total || 0)}
                </span>
              </div>

              {paymentConfig && !paymentConfig.configured ? (
                <p className="mt-4 flex items-start gap-2 text-xs" style={{ color: '#991B1B' }} data-testid="checkout-payment-status">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  PEMBAYARAN BELUM DIKONFIGURASI ({paymentConfig.provider}). Pesanan tetap tercatat sebagai PENDING dan admin akan menghubungi Anda.
                </p>
              ) : (
                <p className="mt-4 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="checkout-payment-status">
                  Pembayaran diproses oleh {paymentConfig?.label} ({paymentConfig?.environment}).
                </p>
              )}

              <Button
                className="mt-5 w-full min-h-[44px] font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                disabled={submitting || !summary}
                onClick={submit}
                data-testid="checkout-submit"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Buat Pesanan &amp; Bayar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
