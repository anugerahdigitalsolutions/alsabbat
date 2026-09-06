import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import Field from '../components/Field';
import { LinkButton, PrimaryButton } from '../components/Buttons';
import TermsCheckbox from '../components/TermsCheckbox';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

/** Register — existing endpoint POST /api/baraya/register (OTP required). */
export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Persetujuan Syarat & Ketentuan — WAJIB, default tidak tercentang.
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = useCallback(async () => {
    setError(null);
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Nama, email, dan nomor WhatsApp wajib diisi.');
      return;
    }
    if (form.password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    if (!acceptedTerms) {
      // Tanpa persetujuan, request pembuatan akun TIDAK dikirim.
      setError('Anda harus menyetujui Syarat & Ketentuan AL SABBAT sebelum mendaftar.');
      return;
    }
    setBusy(true);
    try {
      const result = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        accepted_terms: true,
      });
      navigation.replace('Otp', {
        email: form.email.trim().toLowerCase(),
        purpose: 'REGISTER',
        otpDelivered: result?.otp_delivered,
      });
    } catch (e) {
      setError(apiErrorMessage(e, 'Pendaftaran gagal. Periksa data Anda.'));
    } finally {
      setBusy(false);
    }
  }, [form, acceptedTerms, register, navigation]);

  return (
    <Screen scroll={false} testID="register-screen" bottomInset={0}>
      <TopBar title="Daftar Akun" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Txt variant="small" tone="muted" style={styles.intro}>
            Buat akun AL SABBAT untuk kartu member digital, notifikasi klub, dan akses media khusus.
            Kami akan mengirim kode verifikasi 6 digit ke email Anda.
          </Txt>

          <Field
            label="NAMA LENGKAP"
            icon="person-outline"
            value={form.full_name}
            onChangeText={update('full_name')}
            placeholder="Nama sesuai identitas"
            autoCapitalize="words"
            testID="register-name"
          />
          <Field
            label="EMAIL"
            icon="mail-outline"
            value={form.email}
            onChangeText={update('email')}
            placeholder="nama@email.com"
            keyboardType="email-address"
            testID="register-email"
          />
          <Field
            label="NOMOR WHATSAPP"
            icon="logo-whatsapp"
            value={form.phone}
            onChangeText={update('phone')}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
            testID="register-phone"
          />
          <Field
            label="KATA SANDI"
            icon="lock-closed-outline"
            value={form.password}
            onChangeText={update('password')}
            placeholder="Minimal 8 karakter"
            secure
            hint="Gunakan kombinasi huruf besar, huruf kecil, dan angka."
            testID="register-password"
          />
          <Field
            label="ULANGI KATA SANDI"
            icon="lock-closed-outline"
            value={form.password_confirmation}
            onChangeText={update('password_confirmation')}
            placeholder="Ulangi kata sandi"
            secure
            testID="register-password-confirm"
          />

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.lose} />
              <Txt variant="small" tone="lose" style={styles.flex}>
                {error}
              </Txt>
            </View>
          ) : null}

          <TermsCheckbox
            value={acceptedTerms}
            onChange={setAcceptedTerms}
            onOpenTerms={() => navigation.navigate('Legal', { doc: 'terms' })}
            onOpenPrivacy={() => navigation.navigate('Legal', { doc: 'privacy' })}
            testID="register-terms-checkbox"
          />

          <PrimaryButton label="Daftar" onPress={submit} loading={busy} testID="register-submit" />

          <View style={styles.loginRow}>
            <Txt variant="small" tone="muted">
              Sudah punya akun?
            </Txt>
            <LinkButton label="Masuk" onPress={() => navigation.replace('Login')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: 40 },
  intro: { marginBottom: 18 },
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
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
});
