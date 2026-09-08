import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import Txt from './Txt';
import { timelineLabel } from '../lib/commerce';
import { formatDateTime } from '../lib/format';

/**
 * Riwayat pesanan / refund. Entri berasal langsung dari backend
 * (`timeline[]` immutable) — tidak ada langkah yang dibuat di klien.
 */
export function OrderTimeline({ entries, testID }) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) {
    return (
      <Txt variant="small" tone="muted" testID={testID ? `${testID}-empty` : undefined}>
        Belum ada riwayat pesanan.
      </Txt>
    );
  }
  return (
    <View testID={testID}>
      {list.map((entry, index) => {
        const last = index === list.length - 1;
        return (
          <View key={`${entry.event || entry.status}-${entry.at}-${index}`} style={styles.row}>
            <View style={styles.railWrap}>
              <View style={[styles.dot, last ? styles.dotActive : null]} />
              {!last ? <View style={styles.rail} /> : null}
            </View>
            <View style={styles.body}>
              <Txt variant="smallStrong">{entry.status_label || timelineLabel(entry)}</Txt>
              <Txt variant="meta" tone="dim">
                {formatDateTime(entry.at) || '—'}
                {entry.source ? ` · ${entry.source}` : ''}
              </Txt>
              {entry.note ? (
                <Txt variant="small" tone="muted" style={styles.note}>
                  {entry.note}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  railWrap: { width: 12, alignItems: 'center' },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: colors.borderStrong,
  },
  dotActive: { backgroundColor: colors.accent },
  rail: { flex: 1, width: 1.5, backgroundColor: colors.border, marginVertical: 2 },
  body: { flex: 1, minWidth: 0, paddingBottom: 14 },
  note: { marginTop: 2 },
});

export default OrderTimeline;
