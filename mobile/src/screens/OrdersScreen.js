import React from 'react';
import { StyleSheet, View } from 'react-native';

import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card } from '../components/Card';
import { GhostButton, PrimaryButton } from '../components/Buttons';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { orderStatusLabel, orderStatusTone, paymentStatusLabel } from '../lib/commerce';
import { formatDateMedium, formatIDR } from '../lib/format';

/**
 * Pesanan saya — `GET /api/baraya/orders` (server hanya mengembalikan pesanan
 * milik akun yang login; tidak ada filter kepemilikan di klien).
 */
export default function OrdersScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const orders = useResourceList(() => endpoints.getMyOrders({ limit: 30 }), [isAuthenticated], {
    enabled: isAuthenticated,
    fallbackMessage: 'Gagal memuat pesanan.',
  });

  return (
    <Screen
      onRefresh={orders.refresh}
      refreshing={orders.refreshing}
      testID="orders-screen"
      header={
        <TopBar
          title="Pesanan Saya"
          subtitle="Merchandise AL SABBAT"
          onBack={() => navigation.goBack()}
        />
      }
    >
      {!isAuthenticated ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Masuk untuk melihat pesanan"
          description="Riwayat pesanan hanya bisa dibuka oleh pemilik akun."
          testID="orders-guest"
          action={
            <PrimaryButton
              label="Masuk"
              onPress={() => navigation.navigate('Login')}
              style={styles.action}
            />
          }
        />
      ) : orders.loading ? (
        <Loading rows={3} height={110} testID="orders-loading" />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.reload} testID="orders-error" />
      ) : orders.items.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Belum ada pesanan"
          description="Pesanan merchandise Anda akan tampil di sini."
          testID="orders-empty"
          action={
            <PrimaryButton
              label="Buka Toko"
              icon="bag-handle-outline"
              onPress={() => navigation.navigate('Main', { screen: 'Store' })}
              style={styles.action}
            />
          }
        />
      ) : (
        <>
          {orders.items.map((order) => (
            <Card
              key={order.id}
              style={styles.item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
              testID={`order-${order.order_number}`}
            >
              <View style={styles.head}>
                <Txt variant="smallStrong" style={styles.flex} numberOfLines={1}>
                  {order.order_number}
                </Txt>
                <Badge
                  label={orderStatusLabel(order.order_status)}
                  tone={orderStatusTone(order.order_status)}
                />
              </View>
              <Txt variant="meta" tone="muted">
                {formatDateMedium(order.created_at)} · {paymentStatusLabel(order.payment_status)}
              </Txt>
              <Txt variant="meta" tone="dim" numberOfLines={2} style={styles.items}>
                {(order.items || [])
                  .map((item) => `${item.quantity}× ${item.product_name}`)
                  .join(', ')}
              </Txt>
              <Txt variant="h3" tone="accent">
                {formatIDR(order.total)}
              </Txt>
            </Card>
          ))}
          <GhostButton
            label="Lacak pesanan tanpa akun"
            icon="search-outline"
            onPress={() => navigation.navigate('OrderTrack')}
            style={styles.action}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  item: { marginBottom: 12, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  items: { marginTop: 2 },
  action: { alignSelf: 'stretch', marginTop: 16 },
});
