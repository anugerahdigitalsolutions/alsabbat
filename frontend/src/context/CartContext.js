import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'alsabbat_cart_v1';
const CartContext = createContext(null);

export const formatIDR = (value) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [lines, setLines] = useState(read);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const addItem = useCallback((line) => {
    setLines((current) => {
      const match = current.find(
        (l) => l.product_id === line.product_id && (l.variant_id || null) === (line.variant_id || null)
      );
      if (match) {
        return current.map((l) =>
          l === match ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l
        );
      }
      return [...current, line];
    });
  }, []);

  const updateQuantity = useCallback((index, quantity) => {
    setLines((current) =>
      current
        .map((l, i) => (i === index ? { ...l, quantity: Math.max(0, Math.min(50, quantity)) } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((index) => {
    setLines((current) => current.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clear,
      payload: lines.map((l) => ({
        product_id: l.product_id,
        variant_id: l.variant_id || null,
        quantity: l.quantity,
      })),
    }),
    [lines, addItem, updateQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
