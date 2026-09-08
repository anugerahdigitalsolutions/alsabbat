import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { ChipRow, EmptyState, ErrorState, Loading } from '../components/States';
import { ProductCard } from '../components/ProductCard';
import { CartButton } from '../components/CartButton';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';

/**
 * Toko / katalog merchandise — `GET /api/merchandise/products` &
 * `GET /api/merchandise/categories/public`. Tidak ada produk, harga, atau
 * stok yang dibuat di klien.
 */
export default function StoreScreen({ navigation }) {
  const [categoryId, setCategoryId] = useState(null);
  const categories = useResourceList(() => endpoints.getProductCategories(), []);
  const products = useResourceList(
    () =>
      endpoints.getProducts(
        categoryId ? { limit: 40, category_id: categoryId } : { limit: 40 }
      ),
    [categoryId],
    { fallbackMessage: 'Gagal memuat katalog merchandise.' }
  );

  const categoryOptions = useMemo(
    () => [
      { label: 'Semua', value: null },
      ...categories.items.map((item) => ({ label: item.name, value: item.id })),
    ],
    [categories.items]
  );

  return (
    <Screen
      onRefresh={products.refresh}
      refreshing={products.refreshing}
      testID="store-screen"
      header={
        <TopBar
          title="Toko AL SABBAT"
          subtitle="Merchandise resmi klub"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
          right={<CartButton onPress={() => navigation.navigate('Cart')} />}
        />
      }
    >
      {categoryOptions.length > 1 ? (
        <View style={styles.chips}>
          <ChipRow
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            testID="store-categories"
          />
        </View>
      ) : null}

      {products.loading ? (
        <Loading rows={3} height={210} testID="store-loading" />
      ) : products.error ? (
        products.status === 404 ? (
          <EmptyState
            icon="bag-outline"
            title="Toko belum tersedia"
            description="Modul merchandise belum aktif pada server AL SABBAT yang terhubung dengan aplikasi ini."
            testID="store-unavailable"
          />
        ) : (
          <ErrorState message={products.error} onRetry={products.reload} testID="store-error" />
        )
      ) : products.items.length === 0 ? (
        <EmptyState
          icon="bag-outline"
          title="Belum ada produk"
          description="Merchandise resmi AL SABBAT akan tampil di sini begitu dipublikasikan klub."
          testID="store-empty"
        />
      ) : (
        <>
          <Txt variant="meta" tone="muted" style={styles.count}>
            {products.total} produk
          </Txt>
          <View style={styles.grid}>
            {products.items.map((product) => (
              <View key={product.id} style={styles.cell}>
                <ProductCard
                  product={product}
                  onPress={() =>
                    navigation.navigate('ProductDetail', {
                      slug: product.slug || product.id,
                      name: product.name,
                    })
                  }
                  testID={`store-product-${product.id}`}
                />
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { marginHorizontal: -16, marginBottom: 12 },
  count: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47.6%', minWidth: 0 },
});
