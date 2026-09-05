import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar, { SectionHeader } from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import { EmptyState, Loading } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useClub } from '../context/ClubContext';
import { resolveMediaUrl } from '../api/client';
import { formatDateMedium } from '../lib/format';

const LOGO = require('../../assets/logo.png');

/** Club profile, achievements and sponsors — all from existing endpoints. */
export default function ClubInfoScreen({ navigation }) {
  const { club, clubName, clubLogo, loading } = useClub();
  const achievements = useResourceList(() => endpoints.getAchievements({ limit: 30 }), []);
  const sponsors = useResourceList(() => endpoints.getSponsors({ limit: 30, status: 'ACTIVE' }), []);

  const refresh = useCallback(() => {
    achievements.refresh();
    sponsors.refresh();
  }, [achievements, sponsors]);

  return (
    <Screen
      testID="club-info-screen"
      header={<TopBar title="Profil Klub" onBack={() => navigation.goBack()} />}
      onRefresh={refresh}
      refreshing={achievements.refreshing}
      bottomInset={40}
    >
      {loading ? (
        <Loading rows={2} height={140} />
      ) : (
        <>
          <View style={styles.hero}>
            <Image source={clubLogo ? { uri: clubLogo } : LOGO} style={styles.logo} contentFit="contain" />
            <Txt variant="h1" style={styles.center} numberOfLines={2}>
              {clubName}
            </Txt>
            {club?.founded_date || club?.founded_year ? (
              <Badge label={`Sejak ${formatDateMedium(club.founded_date) || club.founded_year}`} tone="accent" />
            ) : null}
          </View>

          {club?.description ? (
            <Card style={styles.block}>
              <Txt variant="body" tone="muted">
                {club.description}
              </Txt>
            </Card>
          ) : null}

          <SectionHeader title="Identitas Klub" />
          <Card>
            {[
              { label: 'Nama', value: club?.name },
              { label: 'Nama pendek', value: club?.short_name },
              { label: 'Lokasi', value: club?.location || club?.contact?.address },
              { label: 'Stadion', value: club?.stadium },
              { label: 'Berdiri', value: formatDateMedium(club?.founded_date) || club?.founded_year },
              { label: 'Email', value: club?.contact?.email || club?.email },
              { label: 'Telepon', value: club?.contact?.phone || club?.phone },
              { label: 'WhatsApp', value: club?.contact?.whatsapp },
              { label: 'Instagram', value: club?.social_media?.instagram },
              { label: 'Website', value: club?.official_website || club?.social_media?.website },
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

          <SectionHeader title="Prestasi" />
          {achievements.loading ? (
            <Loading rows={2} height={70} />
          ) : achievements.items.length ? (
            <View style={styles.stack}>
              {achievements.items.map((item) => (
                <Card key={item.id} style={styles.achievement}>
                  <Txt variant="smallStrong" numberOfLines={2}>
                    {item.title || item.name}
                  </Txt>
                  <Txt variant="meta" tone="muted" numberOfLines={2}>
                    {[item.competition_name, item.level, item.year].filter(Boolean).join(' · ')}
                  </Txt>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="trophy-outline"
              title="Belum ada prestasi"
              description="Daftar prestasi klub akan tampil di sini setelah diisi oleh pengurus."
            />
          )}

          {sponsors.items.length ? (
            <>
              <SectionHeader title="Sponsor & Mitra" />
              <View style={styles.sponsorGrid}>
                {sponsors.items.map((sponsor) => (
                  <View key={sponsor.id} style={styles.sponsor}>
                    {resolveMediaUrl(sponsor.logo || sponsor.logo_url) ? (
                      <Image
                        source={{ uri: resolveMediaUrl(sponsor.logo || sponsor.logo_url) }}
                        style={styles.sponsorLogo}
                        contentFit="contain"
                      />
                    ) : (
                      <Txt variant="meta" tone="muted" numberOfLines={2} style={styles.center}>
                        {sponsor.name}
                      </Txt>
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 8 },
  logo: { width: 104, height: 104 },
  center: { textAlign: 'center' },
  block: { marginTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoValue: { flex: 1, textAlign: 'right' },
  divider: { marginVertical: 10 },
  stack: { gap: 10 },
  achievement: { gap: 3 },
  sponsorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sponsor: {
    width: '30.8%',
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  sponsorLogo: { width: '100%', height: '100%' },
});
