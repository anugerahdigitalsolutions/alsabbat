import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar, { SectionHeader } from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import { ErrorState, Loading } from '../components/States';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { resolveMediaUrl } from '../api/client';
import { formatDateMedium, initials } from '../lib/format';
import { positionLabel } from '../components/PlayerCard';

/**
 * Player profile — information only (`/api/players/{id}` +
 * `/api/players/{id}/statistics`). Read-only by design.
 */
export default function PlayerDetailScreen({ navigation, route }) {
  const playerId = route?.params?.playerId;
  const player = useResource(() => endpoints.getPlayer(playerId), [playerId], {
    fallbackMessage: 'Pemain tidak ditemukan.',
  });
  const stats = useResource(() => endpoints.getPlayerStatistics(playerId), [playerId]);

  const data = player.data;
  const photo = resolveMediaUrl(data?.photo || data?.photo_url);
  const name = data?.display_name || data?.full_name || 'Pemain';

  const statItems = useMemo(() => {
    const source = stats.data?.totals || stats.data?.summary || stats.data || {};
    const mapping = [
      { key: 'appearances', label: 'Main' },
      { key: 'matches', label: 'Main' },
      { key: 'goals', label: 'Gol' },
      { key: 'assists', label: 'Assist' },
      { key: 'yellow_cards', label: 'Kuning' },
      { key: 'red_cards', label: 'Merah' },
      { key: 'minutes', label: 'Menit' },
      { key: 'clean_sheets', label: 'Clean Sheet' },
    ];
    const seen = new Set();
    return mapping
      .filter((item) => {
        const value = source?.[item.key];
        if (value === undefined || value === null) return false;
        if (seen.has(item.label)) return false;
        seen.add(item.label);
        return true;
      })
      .map((item) => ({ label: item.label, value: source[item.key] }));
  }, [stats.data]);

  const refresh = useCallback(() => {
    player.refresh();
    stats.refresh();
  }, [player, stats]);

  return (
    <Screen
      testID="player-detail-screen"
      header={<TopBar title="Profil Pemain" onBack={() => navigation.goBack()} />}
      onRefresh={refresh}
      refreshing={player.refreshing}
      bottomInset={40}
    >
      {player.loading ? (
        <Loading rows={2} height={180} />
      ) : player.error || !data ? (
        <ErrorState message={player.error || 'Pemain tidak ditemukan.'} onRetry={player.reload} />
      ) : (
        <>
          <View style={styles.hero}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient colors={[colors.navy, colors.navyDeep]} style={[styles.photo, styles.center]}>
                <Txt variant="score" tone="accent">
                  {initials(name)}
                </Txt>
              </LinearGradient>
            )}
            <LinearGradient colors={['transparent', 'rgba(4,9,26,0.95)']} style={styles.heroFade} />
            <View style={styles.heroBody}>
              {data.jersey_number !== null && data.jersey_number !== undefined ? (
                <Badge label={`#${data.jersey_number}`} tone="accent" />
              ) : null}
              <Txt variant="h1" numberOfLines={2}>
                {name}
              </Txt>
              <Txt variant="small" tone="muted">
                {[positionLabel(data.position), data.nationality].filter(Boolean).join(' · ')}
              </Txt>
            </View>
          </View>

          {statItems.length ? (
            <>
              <SectionHeader title="Statistik" />
              <Card style={styles.statsCard}>
                <View style={styles.statsRow}>
                  {statItems.map((item) => (
                    <View key={item.label} style={styles.statItem}>
                      <Txt variant="h2" tone="accent">
                        {item.value}
                      </Txt>
                      <Txt variant="meta" tone="dim">
                        {item.label}
                      </Txt>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : null}

          <SectionHeader title="Informasi" />
          <Card>
            {[
              { label: 'Nama lengkap', value: data.full_name },
              { label: 'Posisi', value: positionLabel(data.position) },
              { label: 'Nomor punggung', value: data.jersey_number },
              { label: 'Kewarganegaraan', value: data.nationality },
              { label: 'Tanggal lahir', value: formatDateMedium(data.date_of_birth) },
              { label: 'Tinggi', value: data.height ? `${data.height} cm` : null },
              { label: 'Berat', value: data.weight ? `${data.weight} kg` : null },
              { label: 'Kaki dominan', value: data.preferred_foot },
              { label: 'Status', value: data.status },
            ]
              .filter((row) => row.value !== null && row.value !== undefined && row.value !== '')
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

          {data.bio ? (
            <>
              <SectionHeader title="Tentang" />
              <Card>
                <Txt variant="body" tone="muted">
                  {data.bio}
                </Txt>
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.surfaceSolid },
  photo: { width: '100%', height: 300 },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 },
  heroBody: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 4 },
  statsCard: { paddingVertical: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  statItem: { width: '25%', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoValue: { flex: 1, textAlign: 'right' },
  divider: { marginVertical: 10 },
});
