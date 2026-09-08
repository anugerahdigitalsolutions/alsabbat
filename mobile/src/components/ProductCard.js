import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadow } from '../theme';
import Txt from './Txt';
import { Badge } from './Card';
import { resolveMediaUrl } from '../api/client';
import { formatIDR } from '../lib/format';

/**
 * Kartu produk merchandise — presentasi 4:5 (sama dengan katalog web).
 * Harga, stok, dan varian selalu dari `/api/merchandise/products`.
 */
export function ProductCard({ product, onPress, width, testID }) {
  const cover = resolveMediaUrl(product?.cover_url);
  const outOfStock = product?.in_stock === false;
  // Harga katalog: bila tiap varian beda harga, tampilkan "Mulai dari" (tidak
  // menampilkan satu harga yang menyesatkan). Nilai dari backend.
  const priceVaries = Boolean(product?.price_varies);
  const price = product?.price_min ?? product?.price ?? 0;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        shadow.card,
        width ? { width } : styles.flex,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.media}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} contentFit="cover" transition={160} />
        ) : (
          <View style={[styles.image, styles.imageEmpty]}>
            <Ionicons name="bag-outline" size={26} color={colors.textDim} />
          </View>
        )}
        {outOfStock ? (
          <View style={styles.overlay}>
            <Badge label="Stok habis" tone="lose" />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        {product?.category?.name ? (
          <Txt variant="meta" tone="dim" numberOfLines={1}>
            {product.category.name}
          </Txt>
        ) : null}
        <Txt variant="smallStrong" numberOfLines={2}>
          {product?.name || 'Produk'}
        </Txt>
        {priceVaries ? (
          <Txt variant="meta" tone="dim" numberOfLines={1}>
            Mulai dari
          </Txt>
        ) : null}
        <Txt variant="title" tone="accent" numberOfLines={1}>
          {formatIDR(price)}
        </Txt>
        {product?.variant_count > 0 ? (
          <Txt variant="meta" tone="muted" numberOfLines={1}>
            {product.variant_count} varian
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minWidth: 0,
  },
  media: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surface },
  image: { width: '100%', height: '100%' },
  imageEmpty: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,9,26,0.55)',
  },
  body: { padding: 10, gap: 3 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
});

export default ProductCard;
