import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import Field from '../components/Field';
import { PrimaryButton } from '../components/Buttons';
import * as endpoints from '../api/endpoints';
import { apiErrorMessage } from '../api/client';

/**
 * Password reset via email OTP — existing endpoints
 * POST /api/baraya/forgot-password  and  POST /api/baraya/reset-password-otp.
 */
export default function ForgotPasswordScreen({ navigation, route }) {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestCode = useCallback(async () => {
    if (!email.trim()) {
      setError('Masukkan email akun Anda.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await endpoints.forgotPassword(email.trim().toLowerCase());
      setInfo('Kode reset dikirim ke email Anda bila terdaftar sebagai akun AL SABBAT.');
      setStep('reset');
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal mengirim kode reset.'));
    } finally {
      setBusy(false);
    }
  }, [email]);

  const submitReset = useCallback(async () => {
    if (code.trim().length !== 6) {
      setError('Kode reset terdiri dari 6 angka.');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await endpoints.resetPasswordOtp({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
        password_confirmation: confirmation,
      });
      navigation.replace('Login', { email: email.trim().toLowerCase() });
    } catch (e) {
      setError(apiErrorMessage(e, 'Reset kata sandi gagal.'));
    } finally {
      setBusy(false);
    }
  }, [code, password, confirmation, email, navigation]);

  return (
    <Screen scroll={false} testID="forgot-screen" bottomInset={0}>
      <TopBar title="Lupa Kata Sandi" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Txt variant="small" tone="muted" style={styles.intro}>
            {step === 'request'
              ? 'Masukkan email akun AL SABBAT Anda. Kami mengirim kode 6 digit untuk mengatur kata sandi baru.'
              : 'Masukkan kode dari email beserta kata sandi baru Anda.'}
          </Txt>

          <Field
            label="EMAIL"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@email.com"
            keyboardType="email-address"
            editable={step === 'request'}
            testID="forgot-email"
          />

          {step === 'reset' ? (
            <>
              <Field
                label="KODE RESET"
                icon="keypad-outline"
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                testID="forgot-code"
              />
              <Field
                label="KATA SANDI BARU"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Minimal 8 karakter"
                secure
                testID="forgot-password"
              />
              <Field
                label="ULANGI KATA SANDI"
                icon="lock-closed-outline"
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder="Ulangi kata sandi baru"
                secure
                testID="forgot-password-confirm"
              />
            </>
          ) : null}

          {info ? (
            <View style={styles.info}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <Txt variant="small" tone="muted" style={styles.flex}>
                {info}
              </Txt>
            </View>
          ) : null}

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.lose} />
              <Txt variant="small" tone="lose" style={styles.flex}>
                {error}
              </Txt>
            </View>
          ) : null}

          <PrimaryButton
            label={step === 'request' ? 'Kirim kode' : 'Simpan kata sandi baru'}
            onPress={step === 'request' ? requestCode : submitReset}
            loading={busy}
            testID="forgot-submit"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: 40 },
  intro: { marginBottom: 18 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(252,207,43,0.3)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 12,
  },
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
});
