import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import Field from '../components/Field';
import { GhostButton, LinkButton, PrimaryButton } from '../components/Buttons';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { apiErrorMessage, errorStatus } from '../api/client';

const LOGO = require('../../assets/logo.png');

/** Login — existing endpoint POST /api/baraya/login (no new auth system). */
export default function LoginScreen({ navigation, route }) {
  const { login, config, googleLogin } = useAuth();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [navigation]);

  const google = useGoogleAuth({
    config,
    onSuccess: async ({ code, redirectUri }) => {
      try {
        await googleLogin({ code, redirectUri });
        goHome();
      } catch (e) {
        setError(apiErrorMessage(e, 'Login Google gagal.'));
      }
    },
  });

  const submit = useCallback(async () => {
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      goHome();
    } catch (e) {
      if (errorStatus(e) === 403) {
        navigation.navigate('Otp', { email: email.trim().toLowerCase(), purpose: 'REGISTER' });
        return;
      }
      setError(apiErrorMessage(e, 'Email atau kata sandi tidak sesuai.'));
    } finally {
      setBusy(false);
    }
  }, [email, password, login, goHome, navigation]);

  return (
    <Screen scroll={false} testID="login-screen" bottomInset={0}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.canGoBack() ? navigation.goBack() : goHome()} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <LinkButton label="Jelajahi dulu" onPress={goHome} tone="muted" />
          </View>

          <View style={styles.brand}>
            <Image source={LOGO} style={styles.logo} contentFit="contain" />
            <Txt variant="h1" style={styles.center}>
              Masuk ke AL SABBAT
            </Txt>
            <Txt variant="small" tone="muted" style={styles.center}>
              Gunakan akun AL SABBAT Anda untuk kartu member, notifikasi klub, dan media khusus.
            </Txt>
          </View>

          <Field
            label="EMAIL"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@email.com"
            keyboardType="email-address"
            testID="login-email"
          />
          <Field
            label="KATA SANDI"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Kata sandi"
            secure
            testID="login-password"
          />

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.lose} />
              <Txt variant="small" tone="lose" style={styles.flex}>
                {error}
              </Txt>
            </View>
          ) : null}

          <View style={styles.forgot}>
            <LinkButton label="Lupa kata sandi?" onPress={() => navigation.navigate('ForgotPassword', { email })} />
          </View>

          <PrimaryButton label="Masuk" onPress={submit} loading={busy} testID="login-submit" />

          {google.enabled ? (
            <>
              <View style={styles.divider}>
                <View style={styles.line} />
                <Txt variant="meta" tone="dim">
                  atau
                </Txt>
                <View style={styles.line} />
              </View>
              <GhostButton
                label="Masuk dengan Google"
                icon="logo-google"
                onPress={google.promptAsync}
                loading={google.busy}
                testID="login-google"
              />
              {google.error ? (
                <Txt variant="small" tone="lose" style={styles.googleError}>
                  {google.error}
                </Txt>
              ) : null}
            </>
          ) : null}

          <View style={styles.registerRow}>
            <Txt variant="small" tone="muted">
              Belum punya akun?
            </Txt>
            <LinkButton label="Daftar sekarang" onPress={() => navigation.navigate('Register')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  brand: { alignItems: 'center', gap: 6, marginBottom: 24, marginTop: 6 },
  logo: { width: 92, height: 92, marginBottom: 6 },
  center: { textAlign: 'center' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 10,
  },
  forgot: { alignItems: 'flex-end', marginBottom: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  googleError: { marginTop: 8, textAlign: 'center' },
  registerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
});
