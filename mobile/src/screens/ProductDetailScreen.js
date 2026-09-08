import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import { GhostButton, PrimaryButton } from '../components/Buttons';
import { ErrorState, Loading } from '../components/States';
import { MediaGallery } from '../components/MediaGallery';
import { CartButton } from '../components/CartButton';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useCart } from '../context/CartContext';
import { formatIDR } from '../lib/format';

/**
 * Detail produk — `GET /api/merchandise/products/by-slug/{slug}` (menerima
 * slug maupun id, sama seperti web). Galeri foto+video, varian, stok, dan
 * harga seluruhnya dari backend.
 */
export default function ProductDetailScreen({ route, navigation }) {
  const { slug, name } = route.params || {};
  const product = useResource(() => endpoints.getProduct(slug), [slug], {
    fallbackMessage: 'Produk tidak ditemukan.',
  });
  const data = product.data;
  const { addItem, count } = useCart();

  const variants = useMemo(() => data?.variants || [], [data]);

  /**
   * Pilihan varian/jumlah diturunkan dari produk yang sedang dibuka: begitu
   * produk berubah, pilihan otomatis kembali ke varian pertama (perilaku sama
   * dengan web) tanpa setState di dalam effect.
   */
  const [choice, setChoice] = useState({ productId: null, variantId: '', quantity: 1, added: false });
  const current =
    choice.productId && choice.productId === data?.id
      ? choice
      : { productId: data?.id || null, variantId: variants[0]?.id || '', quantity: 1, added: false };
  const { variantId, quantity, added } = current;
  const setVariantId = (value) => setChoice({ ...current, variantId: value, added: false });
  const setQuantity = (updater) =>
    setChoice({
      ...current,
      quantity: typeof updater === 'function' ? updater(current.quantity) : updater,
    });
  const setAdded = (value) => setChoice({ ...current, added: value });

  const selected = variants.find((item) => item.id === variantId) || null;
  const price = selected?.price_override ?? data?.price ?? 0;
  const stock = selected ? Number(selected.stock_quantity || 0) : Number(data?.stock_quantity || 0);
  const outOfStock = data?.in_stock === false || stock <= 0;
  const needVariant = variants.length > 0 && !variantId;

  const media = useMemo(() => {
    const list = [];
    const seen = new Set();
    const push = (item) => {
      if (!item?.url || seen.has(item.url)) return;
      seen.add(item.url);
      list.push(item);
    };
    if (data?.cover_url) {
      push({ id: 'cover', url: data.cover_url, file_type: 'IMAGE', alt_text: data?.name });
    }
    (data?.gallery || []).forEach((item) => push({ ...item, file_type: item.file_type || 'IMAGE' }));
    return list;
  }, [data]);

  const addToCart = () => {
    addItem({
      product_id: data.id,
      variant_id: variantId || null,
      quantity,
      name: data.name,
      variant_name: selected?.name || null,
      unit_price: price,
      image: data.cover_url || null,
      slug: data.slug || data.id,
    });
    setAdded(true);
  };

  return (
    <Screen
      onRefresh={product.refresh}
      refreshing={product.refreshing}
      testID="product-detail-screen"
      header={
        <TopBar
          title={data?.name || name || 'Produk'}
          onBack={() => navigation.goBack()}
          right={<CartButton onPress={() => navigation.navigate('Cart')} />}
        />
      }
    >
      {product.loading ? (
        <Loading rows={2} height={220} testID="product-loading" />
      ) : product.error ? (
        <ErrorState message={product.error} onRetry={product.reload} testID="product-error" />
      ) : (
        <>
          <MediaGallery items={media} title={data?.name} testID="product-gallery" />

          <View style={styles.headerBlock}>
            {data?.category?.name ? <Badge label={data.category.name} /> : null}
            <Txt variant="h1" style={styles.title}>
              {data?.name}
            </Txt>
            <View style={styles.priceRow}>
              <Txt variant="h1" tone="accent" testID="product-price">
                {formatIDR(price)}
              </Txt>
              {data?.compare_at_price ? (
                <Txt variant="small" tone="dim" style={styles.strike}>
                  {formatIDR(data.compare_at_price)}
                </Txt>
              ) : null}
            </View>
            <Txt variant="small" tone={outOfStock ? 'lose' : 'muted'} testID="product-stock">
              {outOfStock ? 'Stok habis' : `Stok tersedia: ${stock}`}
            </Txt>
          </View>

          {variants.length ? (
            <Card style={styles.card}>
              <Txt variant="label" tone="muted">
                VARIAN / UKURAN
              </Txt>
              <View style={styles.variantRow} testID="product-variants">
                {variants.map((variant) => {
                  const disabled = Number(variant.stock_quantity || 0) <= 0;
                  const active = variant.id === variantId;
                  return (
                    <Pressable
                      key={variant.id}
                      disabled={disabled}
                      onPress={() => setVariantId(variant.id)}
                      style={[
                        styles.variant,
                        active ? styles.variantActive : null,
                        disabled ? styles.variantDisabled : null,
                      ]}
                      testID={`product-variant-${variant.id}`}
                    >
                      <Txt variant="smallStrong" tone={active ? 'onAccent' : disabled ? 'dim' : 'default'}>
                        {variant.name}
                        {disabled ? ' (habis)' : ''}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          ) : null}

          <Card style={styles.card}>
            <View style={styles.qtyRow}>
              <Txt variant="label" tone="muted">
                JUMLAH
              </Txt>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                  style={styles.stepButton}
                  testID="product-qty-minus"
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <Txt variant="h3" style={styles.qtyValue} testID="product-qty">
                  {quantity}
                </Txt>
                <Pressable
                  onPress={() =>
                    setQuantity((value) => Math.min(50, Math.max(1, stock || 50), value + 1))
                  }
                  style={styles.stepButton}
                  testID="product-qty-plus"
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>
            <Divider />
            <PrimaryButton
              label={needVariant ? 'Pilih varian dulu' : 'Tambah ke Keranjang'}
              icon="bag-add-outline"
              disabled={outOfStock || needVariant}
              onPress={addToCart}
              testID="product-add-to-cart"
            />
            {added ? (
              <GhostButton
                label={`Lihat Keranjang (${count})`}
                icon="cart-outline"
                onPress={() => navigation.navigate('Cart')}
                style={styles.secondary}
                testID="product-go-cart"
              />
            ) : null}
            {added ? (
              <Txt variant="small" tone="win" style={styles.addedNote}>
                Produk ditambahkan ke keranjang.
              </Txt>
            ) : null}
          </Card>

          <Card style={styles.card}>
            <Txt variant="label" tone="muted">
              DESKRIPSI
            </Txt>
            <Txt variant="body" tone="muted" style={styles.description}>
              {data?.description || data?.short_description || 'Deskripsi produk belum tersedia.'}
            </Txt>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: { marginTop: 14, gap: 6 },
  title: {},
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  card: { marginTop: 14 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  variant: {
    paddingHorizontal: 14,
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variantActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  variantDisabled: { opacity: 0.45 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { minWidth: 34, textAlign: 'center' },
  secondary: { marginTop: 10 },
  addedNote: { marginTop: 8 },
  description: { marginTop: 8 },
});
