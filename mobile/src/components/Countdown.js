import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '../theme';
import Txt from './Txt';
import { useCountdown, pad2 } from '../lib/countdown';

/**
 * Hitungan mundur ke kickoff pertandingan.
 *
 * - `target` = timestamp pertandingan dari backend (ISO/Date).
 * - Update tiap 1 detik, satu interval, dibersihkan saat unmount (lihat
 *   `lib/countdown.js`).
 * - Tidak pernah menampilkan angka negatif: bila laga sudah dimulai/selesai,
 *   komponen mengembalikan `null` dan pemanggil menampilkan status existing.
 */
export function Countdown({
  target,
  tone = 'dark',
  label = 'KICK-OFF DALAM',
  startedLabel,
  testID,
}) {
  const { valid, started, days, hours, minutes, seconds } = useCountdown(target);
  const onLight = tone === 'light';

  if (!valid) return null;

  // Sudah dimulai / lewat → status existing, JANGAN angka negatif.
  if (started) {
    if (!startedLabel) return null;
    return (
      <View style={styles.wrap} testID={testID ? `${testID}-started` : undefined}>
        <View style={[styles.startedPill, onLight ? styles.cellLight : styles.cellDark]}>
          <Txt variant="label" tone={onLight ? 'onAccent' : 'accent'} numberOfLines={1}>
            {startedLabel}
          </Txt>
        </View>
      </View>
    );
  }

  const segments = [
    { value: days, unit: 'HARI' },
    { value: hours, unit: 'JAM' },
    { value: minutes, unit: 'MENIT' },
    { value: seconds, unit: 'DETIK' },
  ];

  return (
    <View style={styles.wrap} testID={testID}>
      {label ? (
        <Txt variant="label" tone={onLight ? 'onAccent' : 'muted'} style={styles.label} numberOfLines={1}>
          {label}
        </Txt>
      ) : null}
      <View style={styles.row}>
        {segments.map((segment) => (
          <View
            key={segment.unit}
            style={[styles.cell, onLight ? styles.cellLight : styles.cellDark]}
            testID={testID ? `${testID}-${segment.unit.toLowerCase()}` : undefined}
          >
            <Txt variant="h3" tone={onLight ? 'onAccent' : 'accent'} style={styles.value}>
              {pad2(segment.value)}
            </Txt>
            <Txt variant="label" tone={onLight ? 'onAccent' : 'dim'} style={styles.unit} numberOfLines={1}>
              {segment.unit}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, alignItems: 'center', width: '100%' },
  label: { marginBottom: 6, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  cellDark: { backgroundColor: colors.surface2, borderColor: colors.border },
  cellLight: { backgroundColor: 'rgba(8,18,46,0.12)', borderColor: 'rgba(8,18,46,0.18)' },
  startedPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  value: { fontVariant: ['tabular-nums'] },
  unit: { marginTop: 1, opacity: 0.85 },
});

export default Countdown;
