import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import Field from '../components/Field';
import { LinkButton, PrimaryButton } from '../components/Buttons';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

/**
 * Email OTP — existing endpoints POST /api/baraya/otp/request and
 * POST /api/baraya/otp/verify. Verifying returns the session token.
 */
export default function OtpScreen({ navigation, route }) {
  const { verifyOtp, requestOtp } = useAuth();
  const email = route?.params?.email || '';
  const purpose = route?.params?.purpose || 'REGISTER';
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(
    route?.params?.otpDelivered === false
      ? 'Kode sudah dibuat, namun pengiriman email belum aktif di server. Hubungi pengurus klub bila kode tidak diterima.'
      : `Kami mengirim kode 6 digit ke ${email}.`
  );
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(45);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = useCallback(async () => {
    if (code.trim().length !== 6) {
      setError('Kode OTP terdiri dari 6 angka.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyOtp({ email, code });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setError(apiErrorMessage(e, 'Kode OTP tidak sesuai atau sudah kedaluwarsa.'));
    } finally {
      setBusy(false);
    }
  }, [code, email, verifyOtp, navigation]);

  const resend = useCallback(async () => {
    setError(null);
    try {
      const result = await requestOtp(email, purpose);
      setCooldown(45);
      setInfo(
        result?.delivered === false
          ? 'Kode baru dibuat, namun pengiriman email belum aktif di server.'
          : `Kode baru dikirim ke ${email}.`
      );
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal mengirim ulang kode.'));
    }
  }, [email, requestOtp, purpose]);

  return (
    <Screen scroll={false} testID="otp-screen" bottomInset={0}>
      <TopBar title="Verifikasi Email" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="mail-open-outline" size={30} color={colors.accent} />
          </View>
          <Txt variant="h2" style={styles.center}>
            Masukkan kode verifikasi
          </Txt>
          <Txt variant="small" tone="muted" style={[styles.center, styles.info]}>
            {info}
          </Txt>

          <Field
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            inputStyle={styles.codeInput}
            testID="otp-code"
          />

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.lose} />
              <Txt variant="small" tone="lose" style={styles.flex}>
                {error}
              </Txt>
            </View>
          ) : null}

          <PrimaryButton label="Verifikasi" onPress={submit} loading={busy} testID="otp-submit" />

          <View style={styles.resend}>
            {cooldown > 0 ? (
              <Txt variant="small" tone="dim">
                Kirim ulang kode dalam {cooldown}s
              </Txt>
            ) : (
              <LinkButton label="Kirim ulang kode" onPress={resend} testID="otp-resend" />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: 40, paddingTop: 10 },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  center: { textAlign: 'center' },
  info: { marginTop: 6, marginBottom: 22 },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 20 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 12,
  },
  resend: { alignItems: 'center', marginTop: 18 },
});
