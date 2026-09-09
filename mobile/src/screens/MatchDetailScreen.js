import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii, shadow } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Divider } from '../components/Card';
import { Crest } from '../components/Crest';
import { MatchTimeline } from '../components/MatchTimeline';
import { Countdown } from '../components/Countdown';
import { kickoffIso } from '../lib/countdown';
import { NewsCard } from '../components/NewsCard';
import { ChipRow, EmptyState, ErrorState, Loading } from '../components/States';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useClub } from '../context/ClubContext';
import { formatDateLong } from '../lib/format';
import {
  STATUS_LABEL,
  competitionLabel,
  hasScore,
  isLive,
  matchSides,
  matchTime,
} from '../lib/matchUtils';

const TABS = [
  { value: 'events', label: 'Jalannya Laga' },
  { value: 'info', label: 'Info' },
  { value: 'news', label: 'Berita' },
];

/**
 * Match Center detail — STRICTLY READ-ONLY.
 *
 * Source: `GET /api/matches/{id}/relations` (existing payload). `players` is
 * used ONLY to resolve names on existing match events. This screen never
 * offers line-up management, starting XI, substitutes, match squad or a
 * formation view of any kind.
 */
export default function MatchDetailScreen({ navigation, route }) {
  const matchId = route?.params?.matchId;
  const { club, shortName } = useClub();
  const [tab, setTab] = useState('events');

  const relations = useResource(() => endpoints.getMatchRelations(matchId), [matchId], {
    fallbackMessage: 'Pertandingan tidak ditemukan.',
  });

  const data = relations.data;
  const match = data?.match;
  const sides = useMemo(() => matchSides(match || {}, club, shortName), [match, club, shortName]);
  const competition = data?.competition?.name || competitionLabel(match || {});
  const events = data?.events || [];
  const news = (data?.news || []).filter((post) => post.status === 'PUBLISHED');
  const h2h = data?.head_to_head;
  const live = isLive(match || {});
  const scored = hasScore(match || {});
  // Kickoff nyata dari backend untuk hitungan mundur laga yang belum dimulai.
  const kickoff = useMemo(() => (match ? kickoffIso(match) : null), [match]);

  const openNews = useCallback(
    (post) => navigation.navigate('NewsDetail', { slug: post.slug, postId: post.id }),
    [navigation]
  );

  if (relations.loading) {
    return (
      <Screen
        scroll={false}
        testID="match-detail-screen"
        header={<TopBar title="Pertandingan" onBack={() => navigation.goBack()} />}
      >
        <View style={styles.padded}>
          <Loading rows={3} height={130} />
        </View>
      </Screen>
    );
  }

  if (relations.error || !match) {
    return (
      <Screen
        scroll={false}
        testID="match-detail-screen"
        header={<TopBar title="Pertandingan" onBack={() => navigation.goBack()} />}
      >
        <View style={styles.padded}>
          <ErrorState
            message={relations.error || 'Pertandingan tidak ditemukan.'}
            onRetry={relations.reload}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      testID="match-detail-screen"
      header={<TopBar title={competition} onBack={() => navigation.goBack()} />}
      onRefresh={relations.refresh}
      refreshing={relations.refreshing}
      bottomInset={40}
    >
        {/* ------------------------------------------------- scorecard */}
        <LinearGradient
          colors={[colors.surfaceSolid, 'rgba(1,40,145,0.35)']}
          style={[styles.card, shadow.card]}
        >
          <View style={styles.statusRow}>
            {live ? (
              <Badge label="Live" tone="live" />
            ) : (
              <Badge label={STATUS_LABEL[match.status] || match.status || 'Terjadwal'} />
            )}
          </View>
          <View style={styles.scoreRow}>
            <View style={styles.side}>
              <Crest name={sides.home.name} logo={sides.home.logo} size={58} />
              <Txt variant="smallStrong" numberOfLines={2} style={styles.sideName}>
                {sides.home.name}
              </Txt>
            </View>
            <View style={styles.middle}>
              {scored ? (
                <Txt variant="score">{`${match.home_score} - ${match.away_score ?? 0}`}</Txt>
              ) : (
                <Txt variant="h1" tone="accent">
                  {matchTime(match) || 'VS'}
                </Txt>
              )}
              <Txt variant="meta" tone="muted" style={styles.center}>
                {formatDateLong(match.date)}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={sides.away.name} logo={sides.away.logo} size={58} />
              <Txt variant="smallStrong" numberOfLines={2} style={styles.sideName}>
                {sides.away.name}
              </Txt>
            </View>
          </View>
          {!scored && kickoff ? (
            <Countdown
              target={kickoff}
              startedLabel={
                live ? 'SEDANG BERLANGSUNG' : (STATUS_LABEL[match.status] || 'SEDANG BERLANGSUNG').toUpperCase()
              }
              testID="match-detail-countdown"
            />
          ) : null}
          {match.venue ? (
            <View style={styles.venue}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Txt variant="meta" tone="muted" numberOfLines={1}>
                {match.venue}
                {match.venue_type ? ` · ${match.venue_type === 'AWAY' ? 'Tandang' : 'Kandang'}` : ''}
              </Txt>
            </View>
          ) : null}
        </LinearGradient>

        {/* ------------------------------------------------------ tabs */}
        <View style={styles.chips}>
          <ChipRow options={TABS} value={tab} onChange={setTab} testID="match-detail-tabs" />
        </View>

        {tab === 'events' ? (
          events.length ? (
            <View style={styles.block}>
              <MatchTimeline events={events} players={data?.players} testID="match-events" />
            </View>
          ) : (
            <EmptyState
              icon="time-outline"
              title="Belum ada catatan laga"
              description="Gol, kartu, dan pergantian akan tampil di sini setelah dicatat oleh tim klub."
              testID="match-events-empty"
            />
          )
        ) : null}

        {tab === 'info' ? (
          <View style={[styles.block, styles.infoCard]}>
            {[
              { label: 'Kompetisi', value: competition },
              { label: 'Tanggal', value: formatDateLong(match.date) },
              { label: 'Kick-off', value: matchTime(match) ? `${matchTime(match)} WIB` : null },
              { label: 'Venue', value: match.venue },
              {
                label: 'Tipe Laga',
                value: match.venue_type ? (match.venue_type === 'AWAY' ? 'Tandang' : 'Kandang') : null,
              },
              { label: 'Status', value: STATUS_LABEL[match.status] || match.status },
              { label: 'Musim', value: data?.season?.name },
              { label: 'Tim', value: data?.team?.name },
              { label: 'Catatan', value: match.notes },
            ]
              .filter((row) => row.value)
              .map((row, index, rows) => (
                <View key={row.label}>
                  <View style={styles.infoRow}>
                    <Txt variant="meta" tone="muted">
                      {row.label}
                    </Txt>
                    <Txt variant="smallStrong" style={styles.infoValue} numberOfLines={2}>
                      {row.value}
                    </Txt>
                  </View>
                  {index < rows.length - 1 ? <Divider style={styles.divider} /> : null}
                </View>
              ))}

            {h2h && (h2h.total || h2h.played) ? (
              <>
                <Divider style={styles.divider} />
                <Txt variant="meta" tone="muted" style={styles.h2hTitle}>
                  HEAD TO HEAD
                </Txt>
                <View style={styles.h2hRow}>
                  {[
                    { label: 'Main', value: h2h.played ?? h2h.total },
                    { label: 'Menang', value: h2h.wins ?? h2h.win },
                    { label: 'Seri', value: h2h.draws ?? h2h.draw },
                    { label: 'Kalah', value: h2h.losses ?? h2h.lose },
                  ]
                    .filter((item) => item.value !== undefined && item.value !== null)
                    .map((item) => (
                      <View key={item.label} style={styles.h2hItem}>
                        <Txt variant="h3" tone="accent">
                          {item.value}
                        </Txt>
                        <Txt variant="meta" tone="dim">
                          {item.label}
                        </Txt>
                      </View>
                    ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {tab === 'news' ? (
          news.length ? (
            <View style={styles.newsStack}>
              {news.map((post) => (
                <NewsCard key={post.id} post={post} onPress={() => openNews(post)} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="newspaper-outline"
              title="Belum ada berita terkait"
              description="Laporan pertandingan akan tampil di sini setelah dipublikasikan klub."
            />
          )
        ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1 },
  padded: { paddingHorizontal: gutter },
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSolid,
    padding: 16,
  },
  statusRow: { alignItems: 'center', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  side: { flex: 1, alignItems: 'center', gap: 8 },
  sideName: { textAlign: 'center' },
  middle: { width: 116, alignItems: 'center', gap: 4 },
  center: { textAlign: 'center' },
  venue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 },
  chips: { marginHorizontal: -gutter, marginTop: 18, marginBottom: 14 },
  block: { marginTop: 2 },
  infoCard: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoValue: { flex: 1, textAlign: 'right' },
  divider: { marginVertical: 10 },
  h2hTitle: { marginBottom: 10 },
  h2hRow: { flexDirection: 'row', justifyContent: 'space-between' },
  h2hItem: { alignItems: 'center', flex: 1 },
  newsStack: { gap: 12 },
});
