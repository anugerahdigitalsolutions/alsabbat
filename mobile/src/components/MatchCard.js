import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, gradients, radii, shadow } from '../theme';
import { useClub } from '../context/ClubContext';
import Txt from './Txt';
import { Badge } from './Card';
import { Crest } from './Crest';
import { Countdown } from './Countdown';
import { kickoffIso } from '../lib/countdown';
import {
  STATUS_LABEL,
  clubResult,
  competitionLabel,
  hasScore,
  isLive,
  matchSides,
  matchSubtitle,
  matchTime,
} from '../lib/matchUtils';
import { formatDateShort } from '../lib/format';

/**
 * Match card — read-only information from `/api/matches`.
 *  - variant="featured": gold hero card with the competition pill on the edge.
 *  - variant="row": dark list card.
 * No line-up, formation or player-selection affordance exists here by design.
 */
export function MatchCard({ match, variant = 'row', onPress, countdown = false, testID }) {
  const { club, shortName } = useClub();
  const { home, away } = matchSides(match, club, shortName);
  const live = isLive(match);
  const scored = hasScore(match);
  const time = matchTime(match);
  const competition = competitionLabel(match);
  const result = clubResult(match);

  // Timestamp kickoff nyata dari backend (`date` + `time`, zona WIB).
  const kickoff = useMemo(() => kickoffIso(match), [match]);
  const showCountdown = countdown && !scored && Boolean(kickoff);
  const startedLabel = live
    ? 'SEDANG BERLANGSUNG'
    : (STATUS_LABEL[match?.status] || 'SEDANG BERLANGSUNG').toUpperCase();

  if (variant === 'featured') {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.featured, shadow.accent, pressed ? styles.pressed : null]}
      >
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          <View style={styles.pill}>
            {live ? <View style={styles.liveDot} /> : null}
            <Txt variant="meta" tone={live ? 'live' : 'muted'} numberOfLines={1}>
              {live ? 'Live' : competition}
            </Txt>
          </View>
          <View style={styles.featuredRow}>
            <View style={styles.side}>
              <Crest name={home.name} logo={home.logo} size={46} onLight />
              <Txt variant="smallStrong" tone="onAccent" numberOfLines={1} style={styles.sideName}>
                {home.name}
              </Txt>
            </View>
            <View style={styles.middle}>
              <Txt variant="score" tone="onAccent">
                {scored ? `${match.home_score} - ${match.away_score ?? 0}` : time || 'VS'}
              </Txt>
              <Txt variant="meta" style={styles.middleMeta} numberOfLines={1}>
                {scored ? formatDateShort(match.date) : matchSubtitle(match)}
              </Txt>
            </View>
            <View style={styles.side}>
              <Crest name={away.name} logo={away.logo} size={46} onLight />
              <Txt variant="smallStrong" tone="onAccent" numberOfLines={1} style={styles.sideName}>
                {away.name}
              </Txt>
            </View>
          </View>
          {match.venue ? (
            <View style={styles.venueRow}>
              <Ionicons name="location-outline" size={12} color="rgba(8,18,46,0.7)" />
              <Txt variant="meta" style={styles.middleMeta} numberOfLines={1}>
                {match.venue}
              </Txt>
            </View>
          ) : null}
          {showCountdown ? (
            <Countdown
              target={kickoff}
              tone="light"
              startedLabel={startedLabel}
              testID={testID ? `${testID}-countdown` : 'match-countdown'}
            />
          ) : null}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, shadow.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowHeader}>
        <Txt variant="meta" tone="muted" numberOfLines={1} style={styles.flex}>
          {competition}
        </Txt>
        {live ? (
          <Badge label="Live" tone="live" />
        ) : result ? (
          <Badge
            label={result === 'W' ? 'Menang' : result === 'L' ? 'Kalah' : 'Seri'}
            tone={result === 'W' ? 'win' : result === 'L' ? 'lose' : 'default'}
          />
        ) : (
          <Badge label={STATUS_LABEL[match.status] || match.status || 'Terjadwal'} />
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.side}>
          <Crest name={home.name} logo={home.logo} size={40} />
          <Txt variant="smallStrong" numberOfLines={1} style={styles.sideName}>
            {home.name}
          </Txt>
        </View>
        <View style={styles.middle}>
          {scored ? (
            <Txt variant="h1">{`${match.home_score} - ${match.away_score ?? 0}`}</Txt>
          ) : (
            <Txt variant="h2" tone="accent">
              {time || 'VS'}
            </Txt>
          )}
          <Txt variant="meta" tone="dim" numberOfLines={1}>
            {formatDateShort(match.date)}
          </Txt>
        </View>
        <View style={styles.side}>
          <Crest name={away.name} logo={away.logo} size={40} />
          <Txt variant="smallStrong" numberOfLines={1} style={styles.sideName}>
            {away.name}
          </Txt>
        </View>
      </View>
      {match.venue ? (
        <View style={styles.rowFooter}>
          <Ionicons name="location-outline" size={12} color={colors.textDim} />
          <Txt variant="meta" tone="dim" numberOfLines={1}>
            {match.venue}
          </Txt>
        </View>
      ) : null}
      {showCountdown ? (
        <Countdown
          target={kickoff}
          tone="dark"
          startedLabel={startedLabel}
          testID={testID ? `${testID}-countdown` : 'match-countdown'}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  featured: { borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.accentTo },
  // Blok waktu/skor diberi jarak lebih dari pill di tepi atas kartu.
  fill: { paddingTop: 40, paddingBottom: 12, paddingHorizontal: 12 },
  pill: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '78%',
    backgroundColor: colors.surfaceSolid,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  featuredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  side: { flex: 1, alignItems: 'center', gap: 6, minWidth: 0 },
  sideName: { textAlign: 'center', width: '100%' },
  middle: { width: 100, alignItems: 'center', gap: 2 },
  middleMeta: { color: 'rgba(8,18,46,0.68)', textAlign: 'center' },
  venueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  row: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowBody: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
});

export default MatchCard;
