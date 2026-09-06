import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import { GhostButton, PrimaryButton } from '../components/Buttons';
import { EmptyState, RestrictedNotice, Spinner } from '../components/States';
import * as endpoints from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDateMedium } from '../lib/format';

/** Ambil kode member dari isi QR (URL verifikasi resmi atau kode langsung). */
export const extractMemberCode = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return null;
  const match = value.match(/member\/verifikasi\/([^/?#\s]+)/i);
  if (match) return decodeURIComponent(match[1]);
  if (/^[A-Za-z0-9-]{4,64}$/.test(value)) return value;
  return null;
};

/**
 * Scanner kartu member — QR → backend verification → VALID / INVALID.
 * Memakai endpoint verifikasi EXISTING `GET /api/member/verify/{member_code}`
 * (data minimum, tanpa token/OTP/data sensitif) dan peran EXISTING: hanya akun
 * berperan STAF klub yang dapat membuka layar ini. Tidak ada role baru.
 */
export default function MemberScannerScreen({ navigation }) {
  const { roles, isAuthenticated } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);

  const allowed = isAuthenticated && roles.includes('STAFF');

  const onScanned = useCallback(
    async ({ data }) => {
      if (!scanning || busy) return;
      const code = extractMemberCode(data);
      setScanning(false);
      setError(null);
      if (!code) {
        setResult({ found: false, valid: false, status: null, reason: 'QR tidak dikenali.' });
        return;
      }
      setBusy(true);
      try {
        const verification = await endpoints.verifyMemberCode(code);
        setResult({ ...verification, code });
      } catch (e) {
        setError(apiErrorMessage(e, 'Verifikasi gagal. Coba lagi.'));
      } finally {
        setBusy(false);
      }
    },
    [scanning, busy]
  );

  const rescan = useCallback(() => {
    setResult(null);
    setError(null);
    setScanning(true);
  }, []);

  if (!allowed) {
    return (
      <Screen
        testID="member-scanner-screen"
        header={<TopBar title="Verifikasi Member" onBack={() => navigation.goBack()} />}
        bottomInset={40}
      >
        <RestrictedNotice
          feature="Scanner kartu member"
          onAction={isAuthenticated ? undefined : () => navigation.navigate('Login')}
          actionLabel="Masuk"
          testID="scanner-restricted"
        />
      </Screen>
    );
  }

  if (!permission) {
    return (
      <Screen
        testID="member-scanner-screen"
        header={<TopBar title="Verifikasi Member" onBack={() => navigation.goBack()} />}
        bottomInset={40}
      >
        <Spinner />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen
        testID="member-scanner-screen"
        header={<TopBar title="Verifikasi Member" onBack={() => navigation.goBack()} />}
        bottomInset={40}
      >
        <EmptyState
          icon="camera-outline"
          title="Izin kamera diperlukan"
          description="Aktifkan izin kamera untuk memindai QR kartu member AL SABBAT."
          action={<PrimaryButton label="Izinkan Kamera" onPress={requestPermission} style={styles.action} />}
        />
      </Screen>
    );
  }

  const verified = result?.valid;

  return (
    <Screen
      scroll={false}
      testID="member-scanner-screen"
      header={<TopBar title="Verifikasi Member" onBack={() => navigation.goBack()} />}
      bottomInset={0}
    >
      <View style={styles.body}>
        <View style={styles.cameraWrap}>
          {scanning ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onScanned}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cameraIdle]}>
              <Ionicons
                name={verified ? 'checkmark-circle' : 'close-circle'}
                size={64}
                color={verified ? colors.win : colors.lose}
              />
            </View>
          )}
          <View style={styles.frame} pointerEvents="none" />
        </View>

        {busy ? <Spinner style={styles.spinner} /> : null}

        {error ? (
          <Card style={styles.resultCard}>
            <Txt variant="smallStrong" tone="lose">
              {error}
            </Txt>
          </Card>
        ) : null}

        {result ? (
          <Card style={styles.resultCard} testID="scanner-result">
            <View style={styles.resultHeader}>
              <Txt variant="h3">{result.valid ? 'MEMBER VALID' : 'TIDAK VALID'}</Txt>
              <Badge
                label={
                  result.valid
                    ? 'VALID'
                    : result.found
                      ? String(result.status || 'TIDAK AKTIF')
                      : 'TIDAK DITEMUKAN'
                }
                tone={result.valid ? 'win' : 'lose'}
              />
            </View>
            <Divider style={styles.divider} />
            {result.found ? (
              [
                { label: 'Nama', value: result.full_name },
                { label: 'Nomor member', value: result.member_number ? `#${result.member_number}` : null },
                { label: 'Peran', value: result.role },
                { label: 'Status', value: result.status },
                { label: 'Bergabung', value: formatDateMedium(result.joined_at) },
              ]
                .filter((row) => row.value)
                .map((row) => (
                  <View key={row.label} style={styles.row}>
                    <Txt variant="meta" tone="muted">
                      {row.label}
                    </Txt>
                    <Txt variant="smallStrong" style={styles.rowValue} numberOfLines={1}>
                      {String(row.value)}
                    </Txt>
                  </View>
                ))
            ) : (
              <Txt variant="small" tone="muted">
                {result.reason || 'QR tidak terdaftar sebagai kartu member AL SABBAT.'}
              </Txt>
            )}
            <GhostButton label="Pindai lagi" icon="scan-outline" onPress={rescan} style={styles.action} />
          </Card>
        ) : (
          <Txt variant="small" tone="muted" style={styles.hint}>
            Arahkan kamera ke QR pada kartu member. Hasil verifikasi diambil langsung dari data klub.
          </Txt>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 6 },
  cameraWrap: {
    height: 320,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraIdle: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSolid },
  frame: {
    position: 'absolute',
    top: 60,
    bottom: 60,
    left: 60,
    right: 60,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.md,
  },
  spinner: { marginTop: 12 },
  resultCard: { marginTop: 14 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  divider: { marginVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  rowValue: { flex: 1, textAlign: 'right' },
  action: { marginTop: 14, alignSelf: 'stretch' },
  hint: { marginTop: 14 },
});
