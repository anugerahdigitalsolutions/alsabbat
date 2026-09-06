import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii } from '../theme';
import Txt from './Txt';

/**
 * Native select (bottom sheet modal) — dipakai untuk posisi pemain, bagian &
 * jabatan staf. Pilihan selalu berasal dari data backend/`/api/meta`.
 */
export function Selector({ label, value, options = [], onChange, placeholder, disabled, hint, testID }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.block}>
      {label ? (
        <Txt variant="meta" tone="muted" style={styles.label}>
          {label}
        </Txt>
      ) : null}
      <Pressable
        onPress={() => (disabled ? null : setOpen(true))}
        style={[styles.box, disabled ? styles.boxDisabled : null]}
        testID={testID}
      >
        <Txt variant="bodyStrong" tone={selected ? 'default' : 'dim'} numberOfLines={1} style={styles.value}>
          {selected?.label || placeholder || 'Pilih…'}
        </Txt>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {hint ? (
        <Txt variant="small" tone="dim" style={styles.hint}>
          {hint}
        </Txt>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <SafeAreaView style={styles.sheetWrap} edges={['bottom']}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Txt variant="h3" numberOfLines={1} style={styles.sheetTitle}>
                {label || 'Pilih'}
              </Txt>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              style={styles.list}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={styles.option}
                  >
                    <Txt variant="bodyStrong" tone={active ? 'accent' : 'default'} style={styles.optionText}>
                      {item.label}
                    </Txt>
                    {active ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  label: { marginBottom: 6, marginLeft: 4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  boxDisabled: { opacity: 0.55 },
  value: { flex: 1 },
  hint: { marginTop: 5, marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(2,5,15,0.72)' },
  sheetWrap: { backgroundColor: colors.surfaceSolid },
  sheet: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 14,
    maxHeight: 420,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 12,
  },
  sheetTitle: { flex: 1 },
  list: { paddingHorizontal: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: radii.sm,
  },
  optionText: { flex: 1 },
});

export default Selector;
