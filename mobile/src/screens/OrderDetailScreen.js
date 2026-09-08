import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import Field from '../components/Field';
import { GhostButton, PrimaryButton } from '../components/Buttons';
import { ErrorState, Loading } from '../components/States';
import { OrderTimeline } from '../components/OrderTimeline';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { apiErrorMessage, resolveMediaUrl } from '../api/client';
import {
  effectiveShipment,
  orderStatusLabel,
  orderStatusTone,
  paymentStatusLabel,
  refundStatusLabel,
} from '../lib/commerce';
import { formatDateMedium, formatIDR } from '../lib/format';
import { pickFromCamera, pickFromGallery, uploadOrderEvidencePhoto } from '../lib/photoUpload';

const Row = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Txt variant="meta" tone="muted">
        {label}
      </Txt>
      <Txt variant="smallStrong" style={styles.rowValue} numberOfLines={3}>
        {String(value)}
      </Txt>
    </View>
  );
};

/**
 * Detail pesanan milik akun — `GET /api/baraya/orders/{id}` + aksi pelanggan
 * EXISTING: konfirmasi terima, tolak barang (alasan + detail + bukti foto),
 * dan pengajuan refund. Kepemilikan & transisi status divalidasi server;
 * tombol hanya mengikuti flag `can_*` dari backend.
 */
export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const order = useResource(() => endpoints.getMyOrder(orderId), [orderId], {
    fallbackMessage: 'Pesanan tidak ditemukan.',
  });
  const data = order.data;

  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // 'reject' | 'refund'
  const [form, setForm] = useState({ reason: '', detail: '' });
  const [evidence, setEvidence] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const shipment = effectiveShipment(data);
  const refund = data?.refund || null;
  const delivery = data?.delivery || {};

  const addEvidence = useCallback(
    async (source) => {
      setError(null);
      const picked = source === 'camera' ? await pickFromCamera() : await pickFromGallery();
      if (picked.canceled) return;
      if (picked.error) {
        setError(picked.error);
        return;
      }
      setBusy(true);
      try {
        const stored = await uploadOrderEvidencePhoto(orderId, picked.asset);
        setEvidence((current) => [...current, stored.url].slice(0, 5));
        setMessage('Bukti foto terunggah.');
      } catch (e) {
        setError(apiErrorMessage(e, e?.message || 'Gagal mengunggah bukti.'));
      } finally {
        setBusy(false);
      }
    },
    [orderId]
  );

  const runAction = useCallback(
    async (action) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        if (action === 'receive') {
          await endpoints.confirmOrderReceived(orderId);
          setMessage('Terima kasih, pesanan ditandai diterima.');
        } else if (action === 'reject') {
          await endpoints.rejectOrderDelivery(orderId, {
            reason: form.reason.trim(),
            detail: form.detail.trim(),
            evidence_urls: evidence,
          });
          setMessage('Penolakan tercatat. Tim toko akan menindaklanjuti.');
        } else if (action === 'refund') {
          await endpoints.requestOrderRefund(orderId, {
            reason: form.reason.trim(),
            detail: form.detail.trim(),
            evidence_urls: evidence,
          });
          setMessage('Pengajuan refund terkirim.');
        }
        setMode(null);
        setForm({ reason: '', detail: '' });
        setEvidence([]);
        order.reload();
      } catch (e) {
        setError(apiErrorMessage(e, 'Aksi gagal diproses.'));
      } finally {
        setBusy(false);
      }
    },
    [orderId, form, evidence, order]
  );

  const formValid = form.reason.trim().length >= 3 && form.detail.trim().length >= 5;

  return (
    <Screen
      onRefresh={order.refresh}
      refreshing={order.refreshing}
      testID="order-detail-screen"
      header={
        <TopBar
          title={data?.order_number || 'Detail Pesanan'}
          onBack={() => navigation.goBack()}
        />
      }
    >
      {order.loading ? (
        <Loading rows={3} height={120} testID="order-detail-loading" />
      ) : order.error ? (
        <ErrorState message={order.error} onRetry={order.reload} testID="order-detail-error" />
      ) : (
        <>
          {/* -------------------------------------------------- status */}
          <Card style={styles.card} testID="order-status">
            <View style={styles.badges}>
              <Badge
                label={orderStatusLabel(data.order_status)}
                tone={orderStatusTone(data.order_status)}
              />
              <Badge label={paymentStatusLabel(data.payment_status)} />
              {data.payment_method_choice === 'COD' ? <Badge label="COD" tone="accent" /> : null}
            </View>
            <Divider />
            <Row label="Nomor Pesanan" value={data.order_number} />
            <Row label="Tanggal" value={formatDateMedium(data.created_at)} />
            <Row label="Metode" value={data.payment_method || data.payment_method_choice} />
            {data.payment_redirect_url && data.payment_status === 'PENDING' ? (
              <PrimaryButton
                label="Lanjutkan Pembayaran"
                icon="card-outline"
                onPress={() => WebBrowser.openBrowserAsync(data.payment_redirect_url)}
                style={styles.actionButton}
                testID="order-pay"
              />
            ) : null}
          </Card>

          {/* --------------------------------------------------- item */}
          <Card style={styles.card} testID="order-items">
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              ITEM PESANAN
            </Txt>
            {(data.items || []).map((item) => (
              <View key={`${item.product_id}-${item.variant_id || 'base'}`} style={styles.itemRow}>
                <View style={styles.flex}>
                  <Txt variant="smallStrong" numberOfLines={2}>
                    {item.product_name}
                  </Txt>
                  <Txt variant="meta" tone="muted">
                    {item.variant_name ? `${item.variant_name} · ` : ''}
                    {item.quantity} × {formatIDR(item.unit_price)}
                  </Txt>
                </View>
                <Txt variant="smallStrong">{formatIDR(item.subtotal)}</Txt>
              </View>
            ))}
            <Divider />
            <View style={styles.totalRow}>
              <Txt variant="small" tone="muted">
                Subtotal
              </Txt>
              <Txt variant="smallStrong">{formatIDR(data.subtotal)}</Txt>
            </View>
            <View style={styles.totalRow}>
              <Txt variant="small" tone="muted">
                Pengiriman
              </Txt>
              <Txt variant="smallStrong">{formatIDR(data.shipping_cost)}</Txt>
            </View>
            {data.cod_fee ? (
              <View style={styles.totalRow}>
                <Txt variant="small" tone="muted">
                  Biaya COD
                </Txt>
                <Txt variant="smallStrong">{formatIDR(data.cod_fee)}</Txt>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Txt variant="h3">Total</Txt>
              <Txt variant="h3" tone="accent" testID="order-total">
                {formatIDR(data.total)}
              </Txt>
            </View>
          </Card>

          {/* --------------------------------------------- pengiriman */}
          <Card style={styles.card} testID="order-shipping">
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              PENGIRIMAN
            </Txt>
            <Row label="Penerima" value={data.shipping?.recipient} />
            <Row label="Alamat" value={data.shipping?.address} />
            <Row label="Kota" value={data.shipping?.city} />
            <Row label="Provinsi" value={data.shipping?.province} />
            <Row label="Kode Pos" value={data.shipping?.postal_code} />
            <Row label="Tujuan" value={data.shipping?.destination_label} />
            <Row
              label="Kurir"
              value={[shipment.courier_name || shipment.courier_code, shipment.service_name || shipment.service_code]
                .filter(Boolean)
                .join(' · ')}
            />
            <Row label="Nomor Resi (AWB)" value={shipment.awb_number} />
            <Row label="Info Kurir" value={shipment.shipping_note} />
            <Row label="Estimasi" value={data.shipping?.shipping_etd} />
            <Row label="Catatan" value={data.shipping?.notes} />
          </Card>

          {/* --------------------------------------------------- aksi */}
          {data.can_confirm_received || data.can_reject || data.can_request_refund ? (
            <Card style={styles.card} testID="order-actions">
              <Txt variant="label" tone="muted" style={styles.sectionLabel}>
                AKSI
              </Txt>
              {data.can_confirm_received ? (
                <PrimaryButton
                  label="Barang Diterima"
                  icon="checkmark-done-outline"
                  loading={busy && !mode}
                  disabled={busy}
                  onPress={() => runAction('receive')}
                  testID="order-receive"
                />
              ) : null}
              {data.can_reject ? (
                <GhostButton
                  label={mode === 'reject' ? 'Batal Tolak Barang' : 'Tolak Barang'}
                  icon="close-circle-outline"
                  disabled={busy}
                  onPress={() => setMode(mode === 'reject' ? null : 'reject')}
                  style={styles.actionButton}
                  testID="order-reject-open"
                />
              ) : null}
              {data.can_request_refund ? (
                <GhostButton
                  label={mode === 'refund' ? 'Batal Ajukan Refund' : 'Ajukan Refund'}
                  icon="cash-outline"
                  disabled={busy}
                  onPress={() => setMode(mode === 'refund' ? null : 'refund')}
                  style={styles.actionButton}
                  testID="order-refund-open"
                />
              ) : null}

              {mode ? (
                <View style={styles.form} testID={`order-${mode}-form`}>
                  <Divider />
                  <Field
                    label="ALASAN"
                    value={form.reason}
                    onChangeText={(value) => setForm((f) => ({ ...f, reason: value }))}
                    placeholder="Contoh: Barang rusak"
                    maxLength={80}
                    testID={`order-${mode}-reason`}
                  />
                  <Field
                    label="DETAIL"
                    value={form.detail}
                    onChangeText={(value) => setForm((f) => ({ ...f, detail: value }))}
                    placeholder="Jelaskan kondisi barang seterang mungkin."
                    multiline
                    inputStyle={styles.multiline}
                    maxLength={1000}
                    testID={`order-${mode}-detail`}
                  />
                  <Txt variant="meta" tone="muted">
                    BUKTI FOTO (OPSIONAL, MAKS 5)
                  </Txt>
                  <View style={styles.evidenceRow}>
                    {evidence.map((url) => (
                      <Image
                        key={url}
                        source={{ uri: resolveMediaUrl(url) }}
                        style={styles.evidenceThumb}
                        contentFit="cover"
                      />
                    ))}
                    {evidence.length < 5 ? (
                      <>
                        <Pressable
                          onPress={() => addEvidence('camera')}
                          disabled={busy}
                          style={styles.evidenceAdd}
                          testID={`order-${mode}-evidence-camera`}
                        >
                          <Ionicons name="camera-outline" size={20} color={colors.accent} />
                        </Pressable>
                        <Pressable
                          onPress={() => addEvidence('gallery')}
                          disabled={busy}
                          style={styles.evidenceAdd}
                          testID={`order-${mode}-evidence-gallery`}
                        >
                          <Ionicons name="images-outline" size={20} color={colors.accent} />
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                  <PrimaryButton
                    label={mode === 'reject' ? 'Kirim Penolakan' : 'Kirim Pengajuan Refund'}
                    loading={busy}
                    disabled={busy || !formValid}
                    onPress={() => runAction(mode)}
                    style={styles.actionButton}
                    testID={`order-${mode}-submit`}
                  />
                </View>
              ) : null}

              {message ? (
                <Txt variant="small" tone="win" style={styles.feedback}>
                  {message}
                </Txt>
              ) : null}
              {error ? (
                <Txt variant="small" tone="lose" style={styles.feedback} testID="order-action-error">
                  {error}
                </Txt>
              ) : null}
            </Card>
          ) : null}

          {/* ------------------------------------------ penolakan lama */}
          {delivery.reject_reason ? (
            <Card style={styles.card} testID="order-rejection">
              <Txt variant="label" tone="muted" style={styles.sectionLabel}>
                PENOLAKAN BARANG
              </Txt>
              <Row label="Alasan" value={delivery.reject_reason} />
              <Row label="Detail" value={delivery.reject_detail} />
              <Row label="Waktu" value={formatDateMedium(delivery.rejected_at)} />
              {(delivery.evidence_urls || []).length ? (
                <View style={styles.evidenceRow}>
                  {(delivery.evidence_urls || []).map((url) => (
                    <Image
                      key={url}
                      source={{ uri: resolveMediaUrl(url) }}
                      style={styles.evidenceThumb}
                      contentFit="cover"
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* ------------------------------------------------- refund */}
          {refund ? (
            <Card style={styles.card} testID="order-refund">
              <Txt variant="label" tone="muted" style={styles.sectionLabel}>
                REFUND
              </Txt>
              <Row label="Status" value={refund.status_label || refundStatusLabel(refund.status)} />
              <Row label="Nominal" value={formatIDR(refund.amount)} />
              <Row label="Alasan" value={refund.reason} />
              <Row label="Detail" value={refund.detail} />
              <Row label="Metode" value={refund.method} />
              <Row label="Catatan Toko" value={refund.decision_note} />
              <Row label="Referensi Transfer" value={refund.transfer_reference} />
              {(refund.timeline || []).length ? (
                <View style={styles.timeline}>
                  <OrderTimeline entries={refund.timeline} testID="refund-timeline" />
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* ----------------------------------------------- timeline */}
          <Card style={styles.card} testID="order-timeline">
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              PROGRES PESANAN
            </Txt>
            <OrderTimeline entries={data.timeline} testID="order-timeline-list" />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { marginBottom: 12 },
  sectionLabel: { marginBottom: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 5,
  },
  rowValue: { flex: 1, textAlign: 'right' },
  itemRow: { flexDirection: 'row', gap: 12, paddingVertical: 5, alignItems: 'flex-start' },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 3,
  },
  actionButton: { marginTop: 10 },
  form: { marginTop: 10, gap: 4 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  evidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  evidenceThumb: {
    width: 58,
    height: 58,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  evidenceAdd: {
    width: 58,
    height: 58,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedback: { marginTop: 10 },
  timeline: { marginTop: 12 },
});
