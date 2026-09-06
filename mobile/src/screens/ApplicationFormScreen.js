import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import Field from '../components/Field';
import Selector from '../components/Selector';
import PhotoPicker from '../components/PhotoPicker';
import { PrimaryButton } from '../components/Buttons';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PLAYER_POSITIONS, departmentOptions, positionOptions } from '../lib/membership';

/**
 * Formulir pengajuan Pemain / Staf — field & payload PERSIS mengikuti alur
 * website (`BarayaApplicationPage`) dan endpoint existing
 * `POST /api/baraya/applications`. Tidak ada endpoint, status, atau aturan baru.
 */
export default function ApplicationFormScreen({ navigation, route }) {
  const type = route?.params?.type === 'STAFF' ? 'STAFF' : 'PEMAIN';
  const isPlayer = type === 'PEMAIN';
  const { customer, refreshProfile } = useAuth();
  const meta = useResource(() => endpoints.getMeta(), [], { enabled: !isPlayer });

  const [form, setForm] = useState({
    phone: customer?.phone || '',
    address: '',
    experience: '',
    motivation: '',
    player: {
      full_name: customer?.full_name || '',
      display_name: '',
      jersey_number: '',
      position: 'MIDFIELDER',
      date_of_birth: '',
      nationality: 'Indonesia',
      photo: null,
      height_cm: '',
      weight_kg: '',
      bio: '',
      instagram: '',
    },
    staff: {
      name: customer?.full_name || '',
      department: '',
      position_title: '',
      bio: '',
      instagram: '',
      photo: null,
    },
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setRoot = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setPlayer = (key) => (value) =>
    setForm((prev) => ({ ...prev, player: { ...prev.player, [key]: value } }));
  const setStaff = (patch) => setForm((prev) => ({ ...prev, staff: { ...prev.staff, ...patch } }));

  const departments = useMemo(() => departmentOptions(meta.data), [meta.data]);
  const positions = useMemo(
    () => positionOptions(meta.data, form.staff.department),
    [meta.data, form.staff.department]
  );

  const submit = useCallback(async () => {
    setError(null);
    if (!form.phone.trim()) {
      setError('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (form.motivation.trim().length < 10) {
      setError('Motivasi minimal 10 karakter.');
      return;
    }
    if (isPlayer && form.player.full_name.trim().length < 2) {
      setError('Nama lengkap pemain wajib diisi.');
      return;
    }
    if (!isPlayer) {
      if (form.staff.name.trim().length < 2) {
        setError('Nama staf wajib diisi.');
        return;
      }
      if (!form.staff.department || !form.staff.position_title) {
        setError('Bagian dan jabatan staf wajib dipilih.');
        return;
      }
    }

    const payload = {
      type,
      full_name: isPlayer ? form.player.full_name.trim() : form.staff.name.trim(),
      phone: form.phone.trim(),
      position: isPlayer ? form.player.position : form.staff.position_title,
      birth_date: isPlayer ? form.player.date_of_birth || null : null,
      address: form.address.trim() || null,
      experience: form.experience.trim() || null,
      motivation: form.motivation.trim(),
    };

    if (isPlayer) {
      const p = form.player;
      payload.player_data = {
        full_name: p.full_name.trim(),
        display_name: p.display_name.trim() || null,
        jersey_number: p.jersey_number === '' ? null : Number(p.jersey_number),
        position: p.position,
        date_of_birth: p.date_of_birth || null,
        nationality: p.nationality.trim() || null,
        height_cm: p.height_cm === '' ? null : Number(p.height_cm),
        weight_kg: p.weight_kg === '' ? null : Number(p.weight_kg),
        bio: p.bio.trim() || null,
        photo: p.photo || null,
        instagram: p.instagram.trim() || null,
      };
    } else {
      payload.staff_data = {
        name: form.staff.name.trim(),
        department: form.staff.department || null,
        position_title: form.staff.position_title || null,
        bio: form.staff.bio.trim() || null,
        photo: form.staff.photo || null,
        instagram: form.staff.instagram.trim() || null,
      };
    }

    setSubmitting(true);
    try {
      await endpoints.createApplication(payload);
      await refreshProfile();
      navigation.replace('Membership', { submitted: type });
    } catch (e) {
      setError(apiErrorMessage(e, 'Pengajuan gagal dikirim.'));
    } finally {
      setSubmitting(false);
    }
  }, [form, isPlayer, type, refreshProfile, navigation]);

  return (
    <Screen
      scroll={false}
      testID="application-form-screen"
      header={
        <TopBar
          title={isPlayer ? 'Daftar Pemain' : 'Daftar Staf'}
          subtitle="Pengajuan ditinjau pengurus klub"
          onBack={() => navigation.goBack()}
        />
      }
      bottomInset={0}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Txt variant="small" tone="muted" style={styles.intro}>
            {isPlayer
              ? 'Data pemain mengikuti formulir Pemain klub. Setelah disetujui pengurus, data ini menjadi profil Pemain Anda.'
              : 'Pilih bagian dan jabatan sesuai struktur klub. Satu akun boleh mengajukan beberapa bagian/jabatan berbeda.'}
          </Txt>

          {isPlayer ? (
            <>
              <Field
                label="NAMA LENGKAP"
                icon="person-outline"
                value={form.player.full_name}
                onChangeText={setPlayer('full_name')}
                placeholder="Nama sesuai identitas"
                autoCapitalize="words"
                testID="apply-player-name"
              />
              <PhotoPicker
                label="FOTO PEMAIN"
                value={form.player.photo}
                onChange={setPlayer('photo')}
                hint="Ambil foto dengan kamera atau pilih dari galeri. Foto tampil pada data pengajuan di Admin Panel."
                testID="apply-player-photo"
              />
              <Field
                label="NAMA PUNGGUNG (OPSIONAL)"
                icon="shirt-outline"
                value={form.player.display_name}
                onChangeText={setPlayer('display_name')}
                placeholder="Nama yang tampil di skuad"
                autoCapitalize="words"
              />
              <Selector
                label="POSISI"
                value={form.player.position}
                options={PLAYER_POSITIONS}
                onChange={setPlayer('position')}
                testID="apply-player-position"
              />
              <Field
                label="NOMOR PUNGGUNG (OPSIONAL)"
                icon="keypad-outline"
                value={form.player.jersey_number}
                onChangeText={(value) => setPlayer('jersey_number')(value.replace(/\D/g, '').slice(0, 2))}
                placeholder="0-99"
                keyboardType="number-pad"
              />
              <Field
                label="TANGGAL LAHIR (OPSIONAL)"
                icon="calendar-outline"
                value={form.player.date_of_birth}
                onChangeText={setPlayer('date_of_birth')}
                placeholder="YYYY-MM-DD"
                hint="Contoh: 1998-04-25"
              />
              <Field
                label="KEWARGANEGARAAN (OPSIONAL)"
                icon="flag-outline"
                value={form.player.nationality}
                onChangeText={setPlayer('nationality')}
                placeholder="Indonesia"
                autoCapitalize="words"
              />
              <View style={styles.row}>
                <Field
                  label="TINGGI (CM)"
                  value={form.player.height_cm}
                  onChangeText={(value) => setPlayer('height_cm')(value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="170"
                  keyboardType="number-pad"
                  style={styles.rowItem}
                />
                <Field
                  label="BERAT (KG)"
                  value={form.player.weight_kg}
                  onChangeText={(value) => setPlayer('weight_kg')(value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="65"
                  keyboardType="number-pad"
                  style={styles.rowItem}
                />
              </View>
              <Field
                label="BIO SINGKAT (OPSIONAL)"
                value={form.player.bio}
                onChangeText={setPlayer('bio')}
                placeholder="Ceritakan singkat tentang diri Anda"
                multiline
                inputStyle={styles.multiline}
              />
              <Field
                label="INSTAGRAM (OPSIONAL)"
                icon="logo-instagram"
                value={form.player.instagram}
                onChangeText={setPlayer('instagram')}
                placeholder="@username"
              />
            </>
          ) : (
            <>
              <Field
                label="NAMA LENGKAP"
                icon="person-outline"
                value={form.staff.name}
                onChangeText={(value) => setStaff({ name: value })}
                placeholder="Nama sesuai identitas"
                autoCapitalize="words"
                testID="apply-staff-name"
              />
              <PhotoPicker
                label="FOTO STAF"
                value={form.staff.photo}
                onChange={(url) => setStaff({ photo: url })}
                hint="Ambil foto dengan kamera atau pilih dari galeri. Foto tampil pada data pengajuan di Admin Panel."
                testID="apply-staff-photo"
              />
              <Selector
                label="BAGIAN"
                value={form.staff.department}
                options={departments}
                onChange={(value) => setStaff({ department: value, position_title: '' })}
                placeholder={meta.loading ? 'Memuat bagian…' : 'Pilih bagian…'}
                testID="apply-staff-department"
              />
              <Selector
                label="JABATAN"
                value={form.staff.position_title}
                options={positions}
                onChange={(value) => setStaff({ position_title: value })}
                placeholder={form.staff.department ? 'Pilih jabatan…' : 'Pilih bagian terlebih dahulu'}
                disabled={!form.staff.department}
                testID="apply-staff-position"
              />
              <Field
                label="BIO SINGKAT (OPSIONAL)"
                value={form.staff.bio}
                onChangeText={(value) => setStaff({ bio: value })}
                placeholder="Pengalaman atau keahlian Anda"
                multiline
                inputStyle={styles.multiline}
              />
              <Field
                label="INSTAGRAM (OPSIONAL)"
                icon="logo-instagram"
                value={form.staff.instagram}
                onChangeText={(value) => setStaff({ instagram: value })}
                placeholder="@username"
              />
            </>
          )}

          <Field
            label="NOMOR WHATSAPP"
            icon="logo-whatsapp"
            value={form.phone}
            onChangeText={setRoot('phone')}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
            testID="apply-phone"
          />
          <Field
            label="ALAMAT (OPSIONAL)"
            icon="home-outline"
            value={form.address}
            onChangeText={setRoot('address')}
            placeholder="Alamat domisili"
          />
          <Field
            label="PENGALAMAN (OPSIONAL)"
            value={form.experience}
            onChangeText={setRoot('experience')}
            placeholder="Pengalaman sepak bola atau organisasi"
            multiline
            inputStyle={styles.multiline}
          />
          <Field
            label="MOTIVASI"
            value={form.motivation}
            onChangeText={setRoot('motivation')}
            placeholder="Alasan Anda bergabung (minimal 10 karakter)"
            multiline
            inputStyle={styles.multiline}
            testID="apply-motivation"
          />

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.lose} />
              <Txt variant="small" tone="lose" style={styles.flex}>
                {error}
              </Txt>
            </View>
          ) : null}

          <PrimaryButton
            label="Kirim Pengajuan"
            onPress={submit}
            loading={submitting}
            testID="apply-submit"
          />
          <Txt variant="small" tone="dim" style={styles.note}>
            Pengajuan akan ditinjau pengurus klub melalui Admin Panel. Status terbaru tampil di halaman
            Keanggotaan.
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: 44 },
  intro: { marginBottom: 18 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
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
  note: { marginTop: 14 },
});
