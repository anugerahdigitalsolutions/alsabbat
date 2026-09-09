import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Card, Divider } from '../components/Card';
import { GhostButton, PrimaryButton } from '../components/Buttons';
import { EmptyState, Loading } from '../components/States';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useCart } from '../context/CartContext';
import { resolveMediaUrl } from '../api/client';
import { formatIDR } from '../lib/format';

/**
 * Keranjang — harga & stok divalidasi ulang server lewat
 * `POST /api/merchandise/cart/revalidate`. Klien tidak pernah menjadi
 * sumber harga; galat stok/produk ditampilkan apa adanya dari backend.
 */
export default function CartScreen({ navigation }) {
  const { lines, payload, updateQuantity, removeItem, clear, estimatedSubtotal } = useCart();

  const summary = useResource(
    () => (payload.length ? endpoints.revalidateCart(payload) : Promise.resolve(null)),
    [payload],
    { fallbackMessage: 'Produk di keranjang tidak lagi tersedia.' }
  );

  const serverItems = useMemo(() => summary.data?.items || [], [summary.data]);
  const subtotal = summary.data?.subtotal ?? estimatedSubtotal;

  const serverLine = (line) =>
    serverItems.find(
      (item) =>
        item.product_id === line.product_id &&
        (item.variant_id || null) === (line.variant_id || null)
    ) || null;

  return (
    <Screen
      onRefresh={summary.refresh}
      refreshing={summary.refreshing}
      testID="cart-screen"
      header={
        <TopBar
          title="Keranjang"
          subtitle={lines.length ? `${lines.length} produk` : undefined}
          onBack={() => navigation.goBack()}
        />
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="Keranjang masih kosong"
          description="Tambahkan merchandise resmi AL SABBAT terlebih dahulu."
          testID="cart-empty"
          action={
            <PrimaryButton
              label="Kunjungi Toko"
              icon="bag-handle-outline"
              onPress={() => navigation.navigate('Main', { screen: 'Store' })}
              style={styles.emptyButton}
            />
          }
        />
      ) : (
        <>
          {summary.loading ? <Loading rows={1} height={60} testID="cart-loading" /> : null}
          {summary.error ? (
            <Card style={styles.warning}>
              <Txt variant="smallStrong" tone="lose">
                {summary.error}
              </Txt>
              <Txt variant="small" tone="muted" style={styles.warningNote}>
                Perbarui jumlah atau hapus produk yang tidak tersedia.
              </Txt>
            </Card>
          ) : null}

          {lines.map((line, index) => {
            const server = serverLine(line);
            const unitPrice = server?.unit_price ?? line.unit_price ?? 0;
            const priceChanged =
              server && Number(server.unit_price) !== Number(line.unit_price || 0);
            return (
              <Card key={`${line.product_id}-${line.variant_id || 'base'}`} style={styles.item}>
                <View style={styles.itemRow}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('ProductDetail', { slug: line.slug || line.product_id })
                    }
                  >
                    {line.image ? (
                      <Image
                        source={{ uri: resolveMediaUrl(line.image) }}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <Ionicons name="bag-outline" size={20} color={colors.textDim} />
                      </View>
                    )}
                  </Pressable>
                  <View style={styles.itemBody}>
                    <Txt variant="smallStrong" numberOfLines={2}>
                      {server?.product_name || line.name}
                    </Txt>
                    {(server?.variant_name || line.variant_name) ? (
                      <Txt variant="meta" tone="muted" numberOfLines={1}>
                        {server?.variant_name || line.variant_name}
                      </Txt>
                    ) : null}
                    <Txt variant="title" tone="accent">
                      {formatIDR(unitPrice)}
                    </Txt>
                    {priceChanged ? (
                      <Txt variant="meta" tone="lose">
                        Harga diperbarui oleh toko.
                      </Txt>
                    ) : null}
                  </View>
                </View>

                <Divider style={styles.itemDivider} />

                <View style={styles.itemActions}>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => updateQuantity(index, line.quantity - 1)}
                      style={styles.stepButton}
                      testID={`cart-minus-${index}`}
                    >
                      <Ionicons name="remove" size={17} color={colors.text} />
                    </Pressable>
                    <Txt variant="h3" style={styles.qty} testID={`cart-qty-${index}`}>
                      {line.quantity}
                    </Txt>
                    <Pressable
                      onPress={() => updateQuantity(index, line.quantity + 1)}
                      style={styles.stepButton}
                      testID={`cart-plus-${index}`}
                    >
                      <Ionicons name="add" size={17} color={colors.text} />
                    </Pressable>
                  </View>
                  <View style={styles.itemTotals}>
                    <Txt variant="smallStrong">
                      {formatIDR(server?.subtotal ?? unitPrice * line.quantity)}
                    </Txt>
                    <Pressable
                      onPress={() => removeItem(index)}
                      hitSlop={8}
                      testID={`cart-remove-${index}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.lose} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}

          <Card style={styles.item}>
            <View style={styles.summaryRow}>
              <Txt variant="small" tone="muted">
                Subtotal (dihitung server)
              </Txt>
              <Txt variant="h3" testID="cart-subtotal">
                {formatIDR(subtotal)}
              </Txt>
            </View>
            <Txt variant="meta" tone="dim" style={styles.note}>
              Ongkir, biaya COD, dan total akhir dihitung pada langkah checkout.
            </Txt>
          </Card>

          <PrimaryButton
            label="Lanjut ke Checkout"
            icon="arrow-forward-outline"
            disabled={Boolean(summary.error)}
            onPress={() => navigation.navigate('Checkout')}
            style={styles.cta}
            testID="cart-checkout"
          />
          <GhostButton
            label="Lanjut belanja"
            icon="bag-handle-outline"
            onPress={() => navigation.navigate('Main', { screen: 'Store' })}
            style={styles.secondary}
          />
          <GhostButton
            label="Kosongkan keranjang"
            icon="trash-outline"
            tone="danger"
            onPress={clear}
            style={styles.secondary}
            testID="cart-clear"
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyButton: { alignSelf: 'stretch', marginTop: 16 },
  warning: { marginBottom: 12, borderColor: 'rgba(248,113,113,0.4)' },
  warningNote: { marginTop: 4 },
  item: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 64, height: 80, borderRadius: radii.sm, backgroundColor: colors.surface },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, minWidth: 0, gap: 2 },
  itemDivider: { marginVertical: 10 },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { minWidth: 30, textAlign: 'center' },
  itemTotals: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  note: { marginTop: 6 },
  cta: { marginTop: 6 },
  secondary: { marginTop: 10 },
});
