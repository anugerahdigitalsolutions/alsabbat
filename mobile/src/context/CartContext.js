/**
 * Keranjang merchandise (client-side saja, seperti web).
 *
 * Isi keranjang hanya REFERENSI produk (id + varian + jumlah). Harga, stok,
 * ongkir, biaya COD, dan total SELALU dihitung ulang oleh backend
 * (`/api/merchandise/cart/revalidate`, `/shipping/quote`, `/checkout`).
 * Disimpan di AsyncStorage supaya keranjang tidak hilang saat app ditutup.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'alsabbat.cart.v1';
const MAX_QTY = 50;

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (alive && Array.isArray(parsed)) setLines(parsed);
      } catch (e) {
        /* keranjang rusak/kosong → mulai dari kosong */
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, hydrated]);

  const addItem = useCallback((line) => {
    setLines((current) => {
      const index = current.findIndex(
        (item) =>
          item.product_id === line.product_id &&
          (item.variant_id || null) === (line.variant_id || null)
      );
      if (index >= 0) {
        return current.map((item, i) =>
          i === index
            ? { ...item, ...line, quantity: Math.min(MAX_QTY, item.quantity + (line.quantity || 1)) }
            : item
        );
      }
      return [...current, { ...line, quantity: Math.min(MAX_QTY, line.quantity || 1) }];
    });
  }, []);

  const updateQuantity = useCallback((index, quantity) => {
    setLines((current) =>
      current
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(0, Math.min(MAX_QTY, quantity)) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((index) => {
    setLines((current) => current.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      hydrated,
      count: lines.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      // Estimasi lokal hanya untuk tampilan; angka resmi dari server.
      estimatedSubtotal: lines.reduce(
        (sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
        0
      ),
      payload: lines.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
      })),
      addItem,
      updateQuantity,
      removeItem,
      clear,
    }),
    [lines, hydrated, addItem, updateQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export default CartContext;
