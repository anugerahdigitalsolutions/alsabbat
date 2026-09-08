import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Search, ShoppingCart, Truck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage, barayaApi } from '../../lib/api';
import { useBaraya } from '../../context/BarayaAuthContext';
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
  usePageSeo({ title: 'Checkout', description: 'Checkout merchandise resmi AL SABBAT Football Club.', path: '/checkout', robots: 'noindex,follow' });
  const { lines, payload, clear } = useCart();
  const { customer } = useBaraya();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    customer: { name: '', email: '', phone: '' },
    shipping: { recipient: '', address: '', city: '', province: '', postal_code: '', notes: '' },
  });
  // Fase 2 — ongkir real-time (semua perhitungan di server)
  const [shippingConfig, setShippingConfig] = useState(null);
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState(null);
  const [destLoading, setDestLoading] = useState(false);
  const [destination, setDestination] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');

  const options = quote?.options || [];
  const selectedOption = options.find((o) => `${o.courier_code}|${o.service_code}` === selectedKey) || null;
  const subtotal = summary?.subtotal || 0;
  const shippingCost = selectedOption?.cost || 0;
  const grandTotal = subtotal + shippingCost;
  const shippingEnabled = Boolean(shippingConfig?.configured);

  const searchDestination = async () => {
    if (destQuery.trim().length < 3) {
      toast.error('Kata kunci pencarian minimal 3 karakter.');
      return;
    }
    setDestLoading(true);
    try {
      const { data } = await api.get('/merchandise/shipping/destinations', { params: { search: destQuery.trim() } });
      setDestResults(data.items || []);
      if (!(data.items || []).length) toast.error('Tujuan tidak ditemukan. Coba nama kecamatan/kota lain.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal mencari tujuan pengiriman.'));
    } finally {
      setDestLoading(false);
    }
  };

  const chooseDestination = (item) => {
    setDestination(item);
    setDestResults(null);
    setQuote(null);
    setSelectedKey('');
    setForm((f) => ({
      ...f,
      shipping: {
        ...f.shipping,
        city: item.city || item.district || f.shipping.city,
        province: item.province || f.shipping.province,
        postal_code: item.postal_code || f.shipping.postal_code,
      },
    }));
  };

  const calculateShipping = async () => {
    if (!destination) {
      toast.error('Pilih tujuan pengiriman terlebih dahulu.');
      return;
    }
    setQuoting(true);
    setSelectedKey('');
    try {
      const { data } = await api.post('/merchandise/shipping/quote', {
        items: payload,
        destination_id: destination.destination_id,
      });
      setQuote(data);
    } catch (e) {
      setQuote(null);
      toast.error(apiErrorMessage(e, 'Gagal menghitung ongkir.'));
    } finally {
      setQuoting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await api.get('/merchandise/payment/status');
        setPaymentConfig(cfg.data);
        try {
          const revalidated = payload.length
            ? await api.post('/merchandise/cart/revalidate', { items: payload })
            : { data: null };
          setSummary(revalidated.data);
        } catch (err) {
          setSummary(null);
          toast.error(apiErrorMessage(err, 'Produk di keranjang tidak lagi tersedia.'));
        }
        try {
          const ship = await api.get('/merchandise/shipping/config');
          setShippingConfig(ship.data);
        } catch (err) {
          setShippingConfig({ configured: false, status: 'SHIPPING_NOT_CONFIGURED' });
        }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Gagal memuat data checkout.'));
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!customer) return;
    setForm((f) => ({
      ...f,
      customer: {
        name: f.customer.name || customer.full_name || '',
        email: f.customer.email || customer.email || '',
        phone: f.customer.phone || customer.phone || '',
      },
      shipping: { ...f.shipping, recipient: f.shipping.recipient || customer.full_name || '' },
    }));
  }, [customer]);

  const setField = (path, value) => {
    const [group, key] = path.split('.');
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const client = customer ? barayaApi : api;
      const { data } = await client.post('/merchandise/checkout', {
        items: payload,
        customer: form.customer,
        shipping: {
          ...form.shipping,
          ...(selectedOption && destination
            ? {
                destination_id: destination.destination_id,
                destination_label: destination.label,
                courier_code: selectedOption.courier_code,
                courier_name: selectedOption.courier_name,
                service_code: selectedOption.service_code,
                service_name: selectedOption.service_name,
                // Petunjuk untuk deteksi perubahan harga; server tetap
                // menghitung ulang ongkir dan menjadi sumber harga.
                shipping_cost: selectedOption.cost,
                shipping_etd: selectedOption.etd,
              }
            : {}),
        },
      });
      setResult(data);
      clear();
      if (data.payment?.redirect_url) {
        window.location.href = data.payment.redirect_url;
      }
    } catch (e) {
      const message = apiErrorMessage(e, 'Checkout gagal.');
      if (/ongkir|biaya kirim/i.test(message)) {
        setQuote(null);
        setSelectedKey('');
      }
      toast.error(message);
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
              {customer ? (
                <p
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
                  style={{ backgroundColor: 'rgba(252,207,43,0.16)', color: '#7A5A00' }}
                  data-testid="checkout-baraya-banner"
                >
                  <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Checkout sebagai member AL SABBAT ({customer.email}). Pesanan otomatis tersimpan di akun Anda.
                </p>
              ) : (
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="checkout-baraya-login-cta">
                  Punya akun?{' '}
                  <Link to="/login" state={{ from: '/checkout' }} className="font-semibold underline" style={{ color: 'var(--club-secondary)' }}>
                    Login sebagai member AL SABBAT
                  </Link>{' '}
                  agar pesanan tersimpan di riwayat akun. Checkout tanpa akun tetap bisa dilanjutkan.
                </p>
              )}
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

              {shippingEnabled ? (
                <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="checkout-shipping-block">
                  <p className="als-section-label">Pengiriman</p>
                  <div>
                    <Label className="mb-1.5 block">Cari Tujuan (kecamatan / kota)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={destQuery}
                        onChange={(e) => setDestQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchDestination();
                          }
                        }}
                        placeholder="Contoh: Cicendo Bandung"
                        className="min-w-[200px] flex-1"
                        data-testid="checkout-destination-search"
                      />
                      <Button variant="outline" onClick={searchDestination} disabled={destLoading} data-testid="checkout-destination-search-button">
                        {destLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Cari
                      </Button>
                    </div>
                  </div>

                  {destResults?.length ? (
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] p-2" style={{ backgroundColor: 'var(--surface-2)' }} data-testid="checkout-destination-results">
                      {destResults.map((item) => (
                        <button
                          key={item.destination_id}
                          type="button"
                          onClick={() => chooseDestination(item)}
                          className="als-focus block w-full rounded-[6px] px-3 py-2 text-left text-sm hover:bg-white"
                          data-testid={`checkout-destination-option-${item.destination_id}`}
                        >
                          {item.label}
                          {item.postal_code ? ` · ${item.postal_code}` : ''}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {destination ? (
                    <div className="rounded-[var(--radius-sm)] p-3 text-sm" style={{ backgroundColor: 'rgba(1,40,145,0.05)' }} data-testid="checkout-destination-selected">
                      <span className="font-semibold">Tujuan terpilih:</span> {destination.label}
                      {destination.postal_code ? ` · ${destination.postal_code}` : ''}
                    </div>
                  ) : null}

                  <Button variant="outline" onClick={calculateShipping} disabled={!destination || quoting} data-testid="checkout-calculate-shipping">
                    {quoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                    Hitung Ongkir
                  </Button>

                  {options.length ? (
                    <div className="space-y-2" data-testid="checkout-courier-options">
                      <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                        Berat kiriman {(quote.shipment_weight_grams / 1000).toFixed(2)} kg · pilih layanan pengiriman:
                      </p>
                      {options.map((option) => {
                        const key = `${option.courier_code}|${option.service_code}`;
                        const active = key === selectedKey;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedKey(key)}
                            className="als-focus flex w-full flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm"
                            style={{
                              border: active ? '2px solid var(--club-primary)' : '1px solid var(--border-soft)',
                              backgroundColor: active ? 'rgba(252,207,43,0.10)' : 'white',
                            }}
                            data-testid={`checkout-courier-${key}`}
                          >
                            <span className="min-w-0">
                              <span className="font-semibold">
                                {option.courier_name} · {option.service_code}
                              </span>
                              {option.description ? (
                                <span className="block text-xs" style={{ color: 'var(--muted-fg)' }}>
                                  {option.description}
                                  {option.etd ? ` · estimasi ${option.etd}` : ''}
                                </span>
                              ) : option.etd ? (
                                <span className="block text-xs" style={{ color: 'var(--muted-fg)' }}>
                                  Estimasi {option.etd}
                                </span>
                              ) : null}
                            </span>
                            <span className="font-display font-bold tabular-nums">{formatIDR(option.cost)}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="border-t pt-4 text-xs" style={{ borderColor: 'var(--border-soft)', color: 'var(--muted-fg)' }} data-testid="checkout-shipping-not-configured">
                  Perhitungan ongkir otomatis belum aktif. Admin akan mengonfirmasi biaya kirim setelah pesanan dibuat.
                </p>
              )}
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
              <div className="mt-4 space-y-1 border-t pt-4 text-sm" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-fg)' }}>Subtotal</span>
                  <span className="tabular-nums" data-testid="checkout-subtotal">{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-fg)' }}>
                    Ongkir{selectedOption ? ` · ${selectedOption.courier_name} ${selectedOption.service_code}` : ''}
                  </span>
                  <span className="tabular-nums" data-testid="checkout-shipping-cost">
                    {selectedOption ? formatIDR(shippingCost) : shippingEnabled ? 'Belum dihitung' : formatIDR(0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-display font-bold">Total</span>
                  <span className="font-display text-lg font-bold tabular-nums" data-testid="checkout-total">
                    {formatIDR(grandTotal)}
                  </span>
                </div>
              </div>

              {paymentConfig && !paymentConfig.configured ? (
                <p className="mt-4 flex items-start gap-2 text-xs" style={{ color: '#991B1B' }} data-testid="checkout-payment-status">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  PEMBAYARAN BELUM DIKONFIGURASI ({paymentConfig.provider}). Pesanan tetap tercatat sebagai PENDING dan admin akan menghubungi Anda.
                </p>
              ) : paymentConfig ? (
                <p className="mt-4 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="checkout-payment-status">
                  Pembayaran diproses oleh {paymentConfig.label} ({paymentConfig.environment}).
                </p>
              ) : null}

              <Button
                className="mt-5 w-full min-h-[44px] font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                disabled={submitting || !summary || (shippingEnabled && !selectedOption)}
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
