import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import Field from '../components/Field';
import { PrimaryButton } from '../components/Buttons';
import { OrderTimeline } from '../components/OrderTimeline';
import * as endpoints from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import {
  effectiveShipment,
  orderStatusLabel,
  orderStatusTone,
  paymentStatusLabel,
} from '../lib/commerce';
import { formatDateMedium, formatIDR } from '../lib/format';

/**
 * Lacak pesanan tanpa akun — `GET /api/merchandise/orders/track`
 * (nomor pesanan + email harus cocok; server yang memvalidasi).
 */
export default function OrderTrackScreen({ route, navigation }) {
  const params = route.params || {};
  const [orderNumber, setOrderNumber] = useState(params.orderNumber || '');
  const [email, setEmail] = useState(params.email || '');
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const track = useCallback(async () => {
    if (!orderNumber.trim() || !email.trim()) {
      setError('Nomor pesanan dan email wajib diisi.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setOrder(await endpoints.trackOrder(orderNumber.trim(), email.trim()));
    } catch (e) {
      setOrder(null);
      setError(apiErrorMessage(e, 'Pesanan tidak ditemukan.'));
    } finally {
      setBusy(false);
    }
  }, [orderNumber, email]);

  useEffect(() => {
    // Auto-lacak bila layar dibuka dari hasil checkout (ditunda satu tick).
    if (!params.orderNumber || !params.email) return undefined;
    const timer = setTimeout(track, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shipment = effectiveShipment(order);

  return (
    <Screen
      testID="order-track-screen"
      header={
        <TopBar
          title="Lacak Pesanan"
          subtitle="Tanpa perlu masuk akun"
          onBack={() => navigation.goBack()}
        />
      }
    >
      <Card style={styles.card}>
        <Field
          label="NOMOR PESANAN"
          icon="receipt-outline"
          value={orderNumber}
          onChangeText={setOrderNumber}
          placeholder="ALS-2026-000123"
          autoCapitalize="characters"
          testID="track-order-number"
        />
        <Field
          label="EMAIL PEMESAN"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          testID="track-email"
        />
        {error ? (
          <Txt variant="small" tone="lose" style={styles.error} testID="track-error">
            {error}
          </Txt>
        ) : null}
        <PrimaryButton
          label="Lacak Pesanan"
          icon="search-outline"
          loading={busy}
          onPress={track}
          testID="track-submit"
        />
      </Card>

      {order ? (
        <>
          <Card style={styles.card} testID="track-result">
            <View style={styles.badges}>
              <Badge
                label={orderStatusLabel(order.order_status)}
                tone={orderStatusTone(order.order_status)}
              />
              <Badge label={paymentStatusLabel(order.payment_status)} />
            </View>
            <Divider />
            <Txt variant="h3">{order.order_number}</Txt>
            <Txt variant="small" tone="muted">
              {formatDateMedium(order.created_at)} · Total {formatIDR(order.total)}
            </Txt>
            {shipment.courier_name || shipment.awb_number ? (
              <Txt variant="small" tone="muted" style={styles.shipment}>
                {[shipment.courier_name || shipment.courier_code, shipment.service_name, shipment.awb_number]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            ) : null}
          </Card>

          <Card style={styles.card}>
            <Txt variant="label" tone="muted" style={styles.sectionLabel}>
              PROGRES PESANAN
            </Txt>
            <OrderTimeline entries={order.timeline} testID="track-timeline" />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  sectionLabel: { marginBottom: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shipment: { marginTop: 6 },
  error: { marginBottom: 10 },
});
