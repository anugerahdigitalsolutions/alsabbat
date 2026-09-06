import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import Field from '../components/Field';
import { Card } from '../components/Card';
import { GhostButton } from '../components/Buttons';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import { DELETION_REMOVED, DELETION_RETAINED, LEGAL_WEB_DELETE } from '../lib/legal';

const CONFIRM_WORD = 'HAPUS';

/** Hapus Akun — permanen, dua tahap konfirmasi, memakai sesi yang sedang login. */
export default function DeleteAccountScreen({ navigation }) {
  const { customer, deleteAccount } = useAuth();
  const [checked, setChecked] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const ready = checked && word.trim().toUpperCase() === CONFIRM_WORD;

  const execute = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      Alert.alert(
        'Akun dihapus',
        'Akun AL SABBAT Anda beserta data pribadi terkait telah dihapus. Terima kasih telah menjadi bagian dari AL SABBAT.'
      );
    } catch (e) {
      setError(apiErrorMessage(e, 'Penghapusan akun gagal. Coba lagi.'));
    } finally {
      setBusy(false);
    }
  }, [deleteAccount, navigation]);

  // Konfirmasi kedua sebelum eksekusi.
  const confirm = useCallback(() => {
    if (!ready) {
      setError(
        `Centang pernyataan dan tulis ${CONFIRM_WORD} untuk melanjutkan penghapusan akun.`
      );
      return;
    }
    Alert.alert(
      'Hapus akun secara permanen?',
      'Tindakan ini tidak dapat dibatalkan. Akun dan data pribadi Anda akan dihapus.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus Akun', style: 'destructive', onPress: execute },
      ]
    );
  }, [ready, execute]);

  return (
    <Screen testID="delete-account-screen" contentStyle={styles.content}>
      <TopBar title="Hapus Akun" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={18} color={colors.lose} />
          <Txt variant="small" tone="lose" style={styles.flex}>
            Penghapusan akun bersifat PERMANEN dan tidak dapat dibatalkan.
          </Txt>
        </View>

        <Txt variant="small" tone="muted" style={styles.intro}>
          Akun yang akan dihapus: {customer?.email || '-'}
          {customer?.member_number ? ` (member #${customer.member_number})` : ''}.
        </Txt>

        <Card style={styles.card}>
          <Txt variant="title">Data yang dihapus</Txt>
          {DELETION_REMOVED.map((item) => (
            <View key={item} style={styles.row}>
              <Ionicons name="close-circle-outline" size={15} color={colors.lose} />
              <Txt variant="small" tone="muted" style={styles.flex}>
                {item}
              </Txt>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Txt variant="title">Data yang dipertahankan</Txt>
          {DELETION_RETAINED.map((item) => (
            <View key={item} style={styles.row}>
              <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
              <Txt variant="small" tone="muted" style={styles.flex}>
                {item}
              </Txt>
            </View>
          ))}
          <Txt variant="meta" tone="muted" style={styles.note}>
            Permintaan yang sama juga tersedia tanpa aplikasi di {LEGAL_WEB_DELETE}.
          </Txt>
        </Card>

        <Pressable
          onPress={() => setChecked((prev) => !prev)}
          style={styles.checkRow}
          testID="delete-account-ack"
        >
          <View style={[styles.box, checked ? styles.boxChecked : null]}>
            {checked ? <Ionicons name="checkmark" size={13} color={colors.onAccent} /> : null}
          </View>
          <Txt variant="small" style={styles.flex}>
            Saya memahami penghapusan akun bersifat permanen dan tidak dapat dibatalkan.
          </Txt>
        </Pressable>

        <Field
          label={`TULIS "${CONFIRM_WORD}" UNTUK KONFIRMASI`}
          icon="create-outline"
          value={word}
          onChangeText={setWord}
          placeholder={CONFIRM_WORD}
          autoCapitalize="characters"
          testID="delete-account-word"
        />

        {error ? (
          <Txt variant="small" tone="lose" style={styles.error}>
            {error}
          </Txt>
        ) : null}

        <GhostButton
          label="Hapus Akun Saya"
          icon="trash-outline"
          tone="danger"
          onPress={confirm}
          loading={busy}
          testID="delete-account-submit"
        />
        <GhostButton
          label="Batal"
          onPress={() => navigation.goBack()}
          style={styles.cancel}
          testID="delete-account-cancel"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: gutter, paddingTop: 6 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 6,
  },
  intro: { marginTop: 12 },
  card: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  note: { marginTop: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  error: { marginBottom: 10 },
  cancel: { marginTop: 10 },
});
