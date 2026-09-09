import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import Field from '../components/Field';
import { GhostButton, PrimaryButton } from '../components/Buttons';
import { EmptyState } from '../components/States';
import * as endpoints from '../api/endpoints';
import { apiErrorMessage, isEndpointMissing } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { codFeeForOption, optionKey, paymentStatusLabel } from '../lib/commerce';
import { formatIDR } from '../lib/format';

/**
 * Checkout — seluruh angka dihitung SERVER:
 *  - subtotal & stok  : `POST /api/merchandise/cart/revalidate`
 *  - ongkir real-time : `GET /shipping/destinations` + `POST /shipping/quote`
 *  - total akhir      : `POST /api/merchandise/checkout` (harga klien diabaikan)
 * COD hanya muncul bila backend menyatakan tersedia (config + kapabilitas
 * layanan pada hasil quote). Pembayaran hanya lewat gateway resmi (Midtrans).
 */
export default function CheckoutScreen({ navigation }) {
  const { lines, payload, clear } = useCart();
  const { customer, isAuthenticated } = useAuth();

  const [summary, setSummary] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [shippingConfig, setShippingConfig] = useState(null);
  const [codConfig, setCodConfig] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Prefill dari profil akun (bila sudah login) langsung saat state dibuat.
  const [form, setForm] = useState(() => ({
    customer: {
      name: customer?.full_name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
    },
    shipping: {
      recipient: customer?.full_name || '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      notes: '',
    },
  }));
  const prefilled = useRef(Boolean(customer));

  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState(null);
  const [destLoading, setDestLoading] = useState(false);
  const [destination, setDestination] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [methodChoice, setMethodChoice] = useState('MIDTRANS');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  /* ------------------------------------------------------------ loading */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const payment = await endpoints.getPaymentStatus();
        if (alive) setPaymentConfig(payment);
      } catch (e) {
        if (alive) setPaymentConfig(null);
      }
      try {
        const data = payload.length ? await endpoints.revalidateCart(payload) : null;
        if (alive) setSummary(data);
      } catch (e) {
        if (alive) {
          setSummary(null);
          setLoadError(apiErrorMessage(e, 'Produk di keranjang tidak lagi tersedia.'));
        }
      }
      try {
        const shipping = await endpoints.getShippingConfig();
        if (alive) setShippingConfig(shipping);
      } catch (e) {
        // Server lama tanpa modul ongkir → perilaku lama (tanpa ongkir).
        if (alive) {
          setShippingConfig({
            configured: false,
            status: isEndpointMissing(e) ? 'SHIPPING_MODULE_UNAVAILABLE' : 'SHIPPING_NOT_CONFIGURED',
          });
        }
      }
      try {
        const cod = await endpoints.getCodStatus();
        if (alive) setCodConfig(cod);
      } catch (e) {
        if (alive) setCodConfig({ configured: false, status: 'COD_NOT_CONFIGURED' });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Profil bisa selesai dimuat setelah layar terbuka → prefill sekali saja.
    if (!customer || prefilled.current) return undefined;
    prefilled.current = true;
    const timer = setTimeout(() => {
      setForm((current) => ({
        ...current,
        customer: {
          name: current.customer.name || customer.full_name || '',
          email: current.customer.email || customer.email || '',
          phone: current.customer.phone || customer.phone || '',
        },
        shipping: {
          ...current.shipping,
          recipient: current.shipping.recipient || customer.full_name || '',
        },
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [customer]);

  const setField = useCallback((group, key) => (value) => {
    setForm((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }, []);

  /* ----------------------------------------------------------- shipping */
  const shippingEnabled = Boolean(shippingConfig?.configured);
  const allOptions = quote?.options || [];
  const codAvailableInQuote = allOptions.some((option) => option.cod_available);
  const codBlockedNote = (allOptions.find((option) => option.cod_note) || {}).cod_note;
  // COD hanya ditawarkan bila backend menyatakan siap DAN layanan mendukung.
  const codAllowed = Boolean(codConfig?.configured) && (!quote || codAvailableInQuote);
  // Metode efektif diturunkan: COD otomatis batal bila backend menyatakan
  // COD tidak tersedia (tanpa setState di dalam effect).
  const paymentMethod = codAllowed ? methodChoice : 'MIDTRANS';
  const options = paymentMethod === 'COD' ? allOptions.filter((o) => o.cod_available) : allOptions;
  const selectedOption = options.find((option) => optionKey(option) === selectedKey) || null;

  const subtotal = summary?.subtotal ?? 0;
  const shippingCost = selectedOption?.cost || 0;
  const codFee = paymentMethod === 'COD' ? codFeeForOption(selectedOption, subtotal) : 0;
  const grandTotal = subtotal + shippingCost + codFee;

  const searchDestination = async () => {
    if (destQuery.trim().length < 3) {
      setError('Kata kunci pencarian tujuan minimal 3 karakter.');
      return;
    }
    setError(null);
    setDestLoading(true);
    try {
      const data = await endpoints.searchShippingDestinations(destQuery.trim());
      setDestResults(data.items || []);
      if (!(data.items || []).length) {
        setError('Tujuan tidak ditemukan. Coba nama kecamatan/kota lain.');
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal mencari tujuan pengiriman.'));
    } finally {
      setDestLoading(false);
    }
  };

  const chooseDestination = (item) => {
    setDestination(item);
    setDestResults(null);
    setQuote(null);
    setSelectedKey('');
    setForm((current) => ({
      ...current,
      shipping: {
        ...current.shipping,
        city: item.city || item.district || current.shipping.city,
        province: item.province || current.shipping.province,
        postal_code: item.postal_code || current.shipping.postal_code,
      },
    }));
  };

  const calculateShipping = async () => {
    if (!destination) {
      setError('Pilih tujuan pengiriman terlebih dahulu.');
      return;
    }
    setError(null);
    setQuoting(true);
    setSelectedKey('');
    try {
      const data = await endpoints.getShippingQuote({
        items: payload,
        destination_id: destination.destination_id,
      });
      setQuote(data);
    } catch (e) {
      setQuote(null);
      setError(apiErrorMessage(e, 'Gagal menghitung ongkir.'));
    } finally {
      setQuoting(false);
    }
  };

  /* ------------------------------------------------------------- submit */
  const missingFields = useMemo(() => {
    const required = [
      [form.customer.name.trim().length >= 2, 'Nama lengkap'],
      [/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customer.email.trim()), 'Email'],
      [form.customer.phone.trim().length >= 6, 'Nomor telepon'],
      [form.shipping.recipient.trim().length >= 2, 'Nama penerima'],
      [form.shipping.address.trim().length >= 5, 'Alamat lengkap'],
      [form.shipping.city.trim().length >= 2, 'Kota'],
      [form.shipping.province.trim().length >= 2, 'Provinsi'],
      [form.shipping.postal_code.trim().length >= 3, 'Kode pos'],
    ];
    return required.filter(([ok]) => !ok).map(([, label]) => label);
  }, [form]);

  const shippingReady = !shippingEnabled || Boolean(selectedOption);
  const canSubmit =
    lines.length > 0 && !missingFields.length && shippingReady && !submitting && !loadError;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await endpoints.checkout({
        items: payload,
        payment_method: paymentMethod,
        customer: {
          name: form.customer.name.trim(),
          email: form.customer.email.trim(),
          phone: form.customer.phone.trim(),
        },
        shipping: {
          recipient: form.shipping.recipient.trim(),
          address: form.shipping.address.trim(),
          city: form.shipping.city.trim(),
          province: form.shipping.province.trim(),
          postal_code: form.shipping.postal_code.trim(),
          notes: form.shipping.notes.trim() || null,
          ...(selectedOption && destination
            ? {
                destination_id: destination.destination_id,
                destination_label: destination.label,
                courier_code: selectedOption.courier_code,
                courier_name: selectedOption.courier_name,
                service_code: selectedOption.service_code,
                service_name: selectedOption.service_name,
                // Hanya petunjuk deteksi perubahan harga; server tetap otoritas.
                shipping_cost: selectedOption.cost,
                shipping_etd: selectedOption.etd,
              }
            : {}),
        },
      });
      setResult(data);
      clear();
      if (data?.payment?.redirect_url) {
        await WebBrowser.openBrowserAsync(data.payment.redirect_url);
      }
    } catch (e) {
      const message = apiErrorMessage(e, 'Checkout gagal.');
      if (/ongkir|biaya kirim/i.test(message)) {
        setQuote(null);
        setSelectedKey('');
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------- views */
  if (result) {
    const order = result.order || {};
    return (
      <Screen
        testID="checkout-screen"
        header={<TopBar title="Pesanan Dibuat" onBack={() => navigation.navigate('Main', { screen: 'Store' })} />}
      >
        <Card testID="checkout-result">
          <Txt variant="label" tone="muted">
            NOMOR PESANAN
          </Txt>
          <Txt variant="h1" style={styles.orderNumber}>
            {order.order_number}
          </Txt>
          <Txt variant="small" tone="muted">
            Total {formatIDR(order.total)} · {paymentStatusLabel(order.payment_status)}
          </Txt>
          {result.payment?.cod ? (
            <Badge label="COD · bayar saat barang diterima" tone="accent" style={styles.resultBadge} />
          ) : null}
          {result.payment && result.payment.configured === false ? (
            <Txt variant="small" tone="lose" style={styles.resultNote} testID="checkout-payment-not-configured">
              PEMBAYARAN BELUM DIKONFIGURASI — {result.payment?.error_message || 'hubungi admin toko.'}
            </Txt>
          ) : null}
          {result.payment?.redirect_url ? (
            <PrimaryButton
              label="Buka Halaman Pembayaran"
              icon="card-outline"
              onPress={() => WebBrowser.openBrowserAsync(result.payment.redirect_url)}
              style={styles.resultButton}
              testID="checkout-pay"
            />
          ) : null}
          <GhostButton
            label={isAuthenticated ? 'Lihat Pesanan Saya' : 'Lacak Pesanan'}
            icon="receipt-outline"
            onPress={() =>
              isAuthenticated
                ? navigation.navigate('Orders')
                : navigation.navigate('OrderTrack', {
                    orderNumber: order.order_number,
                    email: order.customer?.email,
                  })
            }
            style={styles.resultButton}
            testID="checkout-track"
          />
        </Card>
      </Screen>
    );
  }

  if (!lines.length) {
    return (
      <Screen testID="checkout-screen" header={<TopBar title="Checkout" onBack={() => navigation.goBack()} />}>
        <EmptyState
          icon="cart-outline"
          title="Keranjang Anda kosong"
          description="Tambahkan produk sebelum checkout."
          testID="checkout-empty"
          action={
            <PrimaryButton
              label="Kunjungi Toko"
              onPress={() => navigation.navigate('Main', { screen: 'Store' })}
              style={styles.resultButton}
            />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      bottomInset={0}
      testID="checkout-screen"
      header={
        <TopBar
          title="Checkout"
          subtitle="Total dihitung ulang oleh server"
          onBack={() => navigation.goBack()}
        />
      }
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loadError ? (
            <Card style={styles.warning}>
              <Txt variant="smallStrong" tone="lose">
                {loadError}
              </Txt>
            </Card>
          ) : null}

          {/* ------------------------------------------ data pembeli */}
          <Card style={styles.card}>
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              DATA PEMBELI
            </Txt>
            <Field
              label="NAMA LENGKAP"
              icon="person-outline"
              value={form.customer.name}
              onChangeText={setField('customer', 'name')}
              autoCapitalize="words"
              testID="checkout-name"
            />
            <Field
              label="EMAIL"
              icon="mail-outline"
              value={form.customer.email}
              onChangeText={setField('customer', 'email')}
              keyboardType="email-address"
              testID="checkout-email"
            />
            <Field
              label="NOMOR TELEPON"
              icon="call-outline"
              value={form.customer.phone}
              onChangeText={setField('customer', 'phone')}
              keyboardType="phone-pad"
              testID="checkout-phone"
            />
          </Card>

          {/* -------------------------------------- alamat pengiriman */}
          <Card style={styles.card}>
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              ALAMAT PENGIRIMAN
            </Txt>
            <Field
              label="NAMA PENERIMA"
              icon="person-circle-outline"
              value={form.shipping.recipient}
              onChangeText={setField('shipping', 'recipient')}
              autoCapitalize="words"
              testID="checkout-recipient"
            />
            <Field
              label="ALAMAT LENGKAP"
              value={form.shipping.address}
              onChangeText={setField('shipping', 'address')}
              placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
              multiline
              inputStyle={styles.multiline}
              testID="checkout-address"
            />
            <View style={styles.row}>
              <Field
                label="KOTA"
                value={form.shipping.city}
                onChangeText={setField('shipping', 'city')}
                autoCapitalize="words"
                style={styles.rowItem}
                testID="checkout-city"
              />
              <Field
                label="PROVINSI"
                value={form.shipping.province}
                onChangeText={setField('shipping', 'province')}
                autoCapitalize="words"
                style={styles.rowItem}
                testID="checkout-province"
              />
            </View>
            <Field
              label="KODE POS"
              value={form.shipping.postal_code}
              onChangeText={(value) => setField('shipping', 'postal_code')(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              testID="checkout-postal"
            />
            <Field
              label="CATATAN (OPSIONAL)"
              value={form.shipping.notes}
              onChangeText={setField('shipping', 'notes')}
              placeholder="Catatan untuk kurir / toko"
              multiline
              inputStyle={styles.multiline}
            />
          </Card>

          {/* ----------------------------------------- tujuan & ongkir */}
          <Card style={styles.card}>
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              TUJUAN & ONGKIR
            </Txt>
            {!shippingEnabled ? (
              <Txt variant="small" tone="muted">
                {shippingConfig?.status === 'SHIPPING_MODULE_UNAVAILABLE'
                  ? 'Modul ongkir belum tersedia pada server yang terhubung.'
                  : 'ONGKIR BELUM DIKONFIGURASI — admin toko belum mengaktifkan layanan ongkir, jadi biaya kirim belum bisa dihitung.'}
              </Txt>
            ) : (
              <>
                <Field
                  label="CARI KECAMATAN / KOTA"
                  icon="search-outline"
                  value={destQuery}
                  onChangeText={setDestQuery}
                  placeholder="Contoh: Cileunyi"
                  onSubmitEditing={searchDestination}
                  testID="checkout-dest-query"
                />
                <GhostButton
                  label="Cari Tujuan"
                  icon="navigate-outline"
                  loading={destLoading}
                  onPress={searchDestination}
                  testID="checkout-dest-search"
                />

                {destResults?.length ? (
                  <View style={styles.list} testID="checkout-dest-results">
                    {destResults.map((item) => (
                      <Pressable
                        key={item.destination_id}
                        onPress={() => chooseDestination(item)}
                        style={styles.listItem}
                      >
                        <Ionicons name="location-outline" size={16} color={colors.accent} />
                        <Txt variant="small" style={styles.flex} numberOfLines={2}>
                          {item.label}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {destination ? (
                  <View style={styles.selectedDest}>
                    <Txt variant="meta" tone="muted">
                      TUJUAN TERPILIH
                    </Txt>
                    <Txt variant="smallStrong" numberOfLines={2}>
                      {destination.label}
                    </Txt>
                    <PrimaryButton
                      label="Hitung Ongkir"
                      icon="calculator-outline"
                      loading={quoting}
                      onPress={calculateShipping}
                      style={styles.quoteButton}
                      testID="checkout-quote"
                    />
                  </View>
                ) : null}

                {quote ? (
                  <View style={styles.list} testID="checkout-shipping-options">
                    {options.length === 0 ? (
                      <Txt variant="small" tone="lose">
                        {paymentMethod === 'COD'
                          ? codBlockedNote || 'Tidak ada layanan yang mendukung COD untuk tujuan ini.'
                          : 'Tidak ada layanan pengiriman untuk tujuan ini.'}
                      </Txt>
                    ) : (
                      options.map((option) => {
                        const key = optionKey(option);
                        const active = key === selectedKey;
                        return (
                          <Pressable
                            key={key}
                            onPress={() => setSelectedKey(key)}
                            style={[styles.option, active ? styles.optionActive : null]}
                            testID={`checkout-option-${key}`}
                          >
                            <View style={styles.flex}>
                              <Txt variant="smallStrong" numberOfLines={1}>
                                {option.courier_name} · {option.service_name}
                              </Txt>
                              <Txt variant="meta" tone="muted" numberOfLines={1}>
                                {[option.description, option.etd ? `ETD ${option.etd}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Txt>
                            </View>
                            <Txt variant="smallStrong" tone="accent">
                              {formatIDR(option.cost)}
                            </Txt>
                          </Pressable>
                        );
                      })
                    )}
                    {quote.shipment_weight_grams ? (
                      <Txt variant="meta" tone="dim">
                        Berat kiriman {quote.shipment_weight_grams} gram (dihitung server).
                      </Txt>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </Card>

          {/* ------------------------------------- metode pembayaran */}
          <Card style={styles.card}>
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              METODE PEMBAYARAN
            </Txt>
            <Pressable
              onPress={() => setMethodChoice('MIDTRANS')}
              style={[styles.option, paymentMethod === 'MIDTRANS' ? styles.optionActive : null]}
              testID="checkout-method-midtrans"
            >
              <Ionicons name="card-outline" size={18} color={colors.accent} />
              <View style={styles.flex}>
                <Txt variant="smallStrong">{paymentConfig?.label || 'Pembayaran Online'}</Txt>
                <Txt variant="meta" tone="muted">
                  {paymentConfig?.configured
                    ? 'Transfer / e-wallet / kartu lewat gerbang pembayaran resmi.'
                    : 'PEMBAYARAN BELUM DIKONFIGURASI oleh admin toko.'}
                </Txt>
              </View>
            </Pressable>

            {codAllowed ? (
              <Pressable
                onPress={() => setMethodChoice('COD')}
                style={[styles.option, paymentMethod === 'COD' ? styles.optionActive : null]}
                testID="checkout-method-cod"
              >
                <Ionicons name="cash-outline" size={18} color={colors.accent} />
                <View style={styles.flex}>
                  <Txt variant="smallStrong">COD (Bayar di Tempat)</Txt>
                  <Txt variant="meta" tone="muted">
                    Tersedia untuk layanan kurir yang mendukung COD.
                  </Txt>
                </View>
              </Pressable>
            ) : (
              <Txt variant="meta" tone="dim" style={styles.codNote}>
                {codBlockedNote ||
                  'COD belum tersedia menurut penyedia pengiriman/konfigurasi toko.'}
              </Txt>
            )}
          </Card>

          {/* -------------------------------------------- ringkasan */}
          <Card style={styles.card}>
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              RINGKASAN
            </Txt>
            {[
              ['Subtotal', formatIDR(subtotal)],
              ['Ongkir', selectedOption ? formatIDR(shippingCost) : 'Belum dihitung'],
              ...(paymentMethod === 'COD' ? [['Biaya COD', formatIDR(codFee)]] : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.summaryRow}>
                <Txt variant="small" tone="muted">
                  {label}
                </Txt>
                <Txt variant="smallStrong">{value}</Txt>
              </View>
            ))}
            <Divider />
            <View style={styles.summaryRow}>
              <Txt variant="h3">Total</Txt>
              <Txt variant="h3" tone="accent" testID="checkout-total">
                {formatIDR(grandTotal)}
              </Txt>
            </View>
            <Txt variant="meta" tone="dim" style={styles.codNote}>
              Total final selalu dihitung ulang server saat pesanan dibuat.
            </Txt>
          </Card>

          {missingFields.length ? (
            <Txt variant="small" tone="muted" style={styles.hint}>
              Lengkapi: {missingFields.join(', ')}.
            </Txt>
          ) : null}
          {shippingEnabled && !selectedOption ? (
            <Txt variant="small" tone="muted" style={styles.hint}>
              Pilih tujuan dan layanan pengiriman untuk melanjutkan.
            </Txt>
          ) : null}
          {error ? (
            <Txt variant="small" tone="lose" style={styles.hint} testID="checkout-error">
              {error}
            </Txt>
          ) : null}

          <PrimaryButton
            label={paymentMethod === 'COD' ? 'Buat Pesanan COD' : 'Buat Pesanan & Bayar'}
            icon="lock-closed-outline"
            loading={submitting}
            disabled={!canSubmit}
            onPress={submit}
            style={styles.submit}
            testID="checkout-submit"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: gutter, paddingTop: 6, paddingBottom: 40 },
  card: { marginBottom: 12 },
  sectionLabel: { marginBottom: 10 },
  warning: { marginBottom: 12, borderColor: 'rgba(248,113,113,0.4)' },
  row: { flexDirection: 'row', gap: 10 },
  rowItem: { flex: 1, minWidth: 0 },
  multiline: { minHeight: 78, textAlignVertical: 'top' },
  list: { marginTop: 10, gap: 8 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedDest: {
    marginTop: 10,
    padding: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.sunken,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  quoteButton: { marginTop: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
  },
  optionActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  codNote: { marginTop: 8 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  hint: { marginBottom: 8 },
  submit: { marginTop: 6 },
  orderNumber: { marginTop: 4, marginBottom: 6 },
  resultBadge: { marginTop: 10 },
  resultNote: { marginTop: 10 },
  resultButton: { marginTop: 14, alignSelf: 'stretch' },
});
