import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Txt from './Txt';
import { useCart } from '../context/CartContext';

/** Tombol keranjang untuk TopBar (jumlah item dari CartContext). */
export function CartButton({ onPress, testID = 'cart-button' }) {
  const { count } = useCart();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.button} testID={testID}>
      <Ionicons name="bag-handle-outline" size={19} color={colors.text} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Txt variant="label" tone="onAccent" numberOfLines={1}>
            {count > 99 ? '99+' : String(count)}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CartButton;
