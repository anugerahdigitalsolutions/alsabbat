import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import { SectionHeader } from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import { Avatar } from '../components/Crest';
import Field from '../components/Field';
import { GhostButton, PrimaryButton } from '../components/Buttons';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { apiErrorMessage, resolveMediaUrl } from '../api/client';
import { formatDateMedium } from '../lib/format';

const LOGO = require('../../assets/logo.png');

/** Profile / account — `/api/baraya/me` (+ update) and session actions. */
export default function ProfileScreen({ navigation }) {
  const { customer, isAuthenticated, roleLabel, unreadCount, logout, updateProfile, refreshProfile, loading } =
    useAuth();
  const { clubName } = useClub();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const startEdit = useCallback(() => {
    setForm({ full_name: customer?.full_name || '', phone: customer?.phone || '' });
    setError(null);
    setEditing(true);
  }, [customer]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ full_name: form.full_name.trim(), phone: form.phone.trim() });
      setEditing(false);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal menyimpan profil.'));
    } finally {
      setSaving(false);
    }
  }, [form, updateProfile]);

  if (!isAuthenticated) {
    return (
      <Screen testID="profile-screen">
        <View style={styles.guest}>
          <Image source={LOGO} style={styles.guestLogo} contentFit="contain" />
          <Txt variant="h1" style={styles.center}>
            Akun AL SABBAT
          </Txt>
          <Txt variant="small" tone="muted" style={styles.center}>
            Masuk untuk kartu member digital, notifikasi klub, dan akses galeri khusus Pemain & Staf
            {clubName ? ` ${clubName}` : ''}.
          </Txt>
          <PrimaryButton
            label="Masuk"
            icon="log-in-outline"
            onPress={() => navigation.navigate('Login')}
            style={styles.guestButton}
            testID="profile-login"
          />
          <GhostButton
            label="Daftar akun baru"
            icon="person-add-outline"
            onPress={() => navigation.navigate('Register')}
            style={styles.guestButton}
            testID="profile-register"
          />
        </View>

        <SectionHeader title="Jelajahi tanpa akun" />
        <Card>
          {[
            { icon: 'football-outline', label: 'Pertandingan & hasil', target: 'Match' },
            { icon: 'newspaper-outline', label: 'Berita resmi klub', target: 'News' },
            { icon: 'people-outline', label: 'Skuad & profil pemain', target: 'Squad' },
            { icon: 'shield-outline', label: 'Profil klub & prestasi', target: 'ClubInfo' },
          ].map((item, index, rows) => (
            <View key={item.label}>
              <Pressable onPress={() => navigation.navigate(item.target)} style={styles.menuRow}>
                <Ionicons name={item.icon} size={18} color={colors.accent} />
                <Txt variant="smallStrong" style={styles.flex}>
                  {item.label}
                </Txt>
                <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
              </Pressable>
              {index < rows.length - 1 ? <Divider style={styles.divider} /> : null}
            </View>
          ))}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refreshProfile} refreshing={loading} testID="profile-screen">
      <View style={styles.header}>
        <Avatar name={customer?.full_name} photo={resolveMediaUrl(customer?.photo_url)} size={62} />
        <View style={styles.headerText}>
          <Txt variant="h2" numberOfLines={1}>
            {customer?.full_name || 'Member'}
          </Txt>
          <Txt variant="small" tone="muted" numberOfLines={1}>
            {customer?.email}
          </Txt>
          <View style={styles.badgeRow}>
            <Badge label={roleLabel} tone="accent" />
            {customer?.member_number ? <Badge label={`#${customer.member_number}`} /> : null}
          </View>
        </View>
      </View>

      <SectionHeader title="Akun" />
      <Card>
        {[
          {
            icon: 'card-outline',
            label: 'Kartu Member',
            onPress: () => navigation.navigate('MemberCard'),
          },
          {
            icon: 'notifications-outline',
            label: 'Notifikasi',
            badge: unreadCount > 0 ? String(unreadCount) : null,
            onPress: () => navigation.navigate('Notifications'),
          },
          {
            icon: 'shield-outline',
            label: 'Info Klub',
            onPress: () => navigation.navigate('ClubInfo'),
          },
          {
            icon: 'create-outline',
            label: 'Ubah Profil',
            onPress: startEdit,
          },
        ].map((item, index, rows) => (
          <View key={item.label}>
            <Pressable onPress={item.onPress} style={styles.menuRow} testID={`profile-menu-${index}`}>
              <Ionicons name={item.icon} size={18} color={colors.accent} />
              <Txt variant="smallStrong" style={styles.flex}>
                {item.label}
              </Txt>
              {item.badge ? <Badge label={item.badge} tone="live" /> : null}
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </Pressable>
            {index < rows.length - 1 ? <Divider style={styles.divider} /> : null}
          </View>
        ))}
      </Card>

      {editing ? (
        <>
          <SectionHeader title="Ubah Profil" />
          <Card>
            <Field
              label="NAMA LENGKAP"
              value={form.full_name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, full_name: value }))}
              autoCapitalize="words"
              icon="person-outline"
            />
            <Field
              label="NOMOR WHATSAPP"
              value={form.phone}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
              keyboardType="phone-pad"
              icon="logo-whatsapp"
            />
            {error ? (
              <Txt variant="small" tone="lose" style={styles.error}>
                {error}
              </Txt>
            ) : null}
            <PrimaryButton label="Simpan" onPress={save} loading={saving} />
            <GhostButton label="Batal" onPress={() => setEditing(false)} style={styles.cancel} />
          </Card>
        </>
      ) : null}

      <SectionHeader title="Detail Akun" />
      <Card>
        {[
          { label: 'Email', value: customer?.email },
          { label: 'Telepon', value: customer?.phone },
          { label: 'Nomor member', value: customer?.member_number },
          { label: 'Kode member', value: customer?.member_code },
          { label: 'Verifikasi', value: customer?.email_verified ? 'Email terverifikasi' : 'Belum terverifikasi' },
          { label: 'Status', value: customer?.status },
          { label: 'Bergabung', value: formatDateMedium(customer?.joined_at || customer?.created_at) },
        ]
          .filter((row) => row.value)
          .map((row, index, rows) => (
            <View key={row.label}>
              <View style={styles.infoRow}>
                <Txt variant="meta" tone="muted">
                  {row.label}
                </Txt>
                <Txt variant="smallStrong" style={styles.infoValue} numberOfLines={2}>
                  {String(row.value)}
                </Txt>
              </View>
              {index < rows.length - 1 ? <Divider style={styles.divider} /> : null}
            </View>
          ))}
      </Card>

      <GhostButton
        label="Keluar"
        icon="log-out-outline"
        tone="danger"
        onPress={logout}
        style={styles.logout}
        testID="profile-logout"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  guest: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 26,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  guestLogo: { width: 88, height: 88, marginBottom: 4 },
  guestButton: { alignSelf: 'stretch', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  headerText: { flex: 1, gap: 3 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  divider: { marginVertical: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoValue: { flex: 1, textAlign: 'right' },
  error: { marginBottom: 10 },
  cancel: { marginTop: 10 },
  logout: { marginTop: 24 },
});
