import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import { eventLabel, eventMinute } from '../lib/matchUtils';
import Txt from './Txt';

const ICONS = {
  GOAL: 'football',
  OWN_GOAL: 'football-outline',
  PENALTY_GOAL: 'football',
  PENALTY_MISS: 'close-circle-outline',
  ASSIST: 'git-branch-outline',
  YELLOW_CARD: 'square',
  SECOND_YELLOW: 'copy',
  RED_CARD: 'square',
  SUBSTITUTION: 'swap-horizontal',
  INJURY: 'medkit-outline',
  SAVE: 'hand-left-outline',
  CLEAN_SHEET: 'shield-checkmark-outline',
};

const ICON_COLOR = {
  YELLOW_CARD: colors.accent,
  SECOND_YELLOW: colors.accent,
  RED_CARD: colors.live,
  GOAL: colors.win,
  PENALTY_GOAL: colors.win,
};

/**
 * Read-only match event timeline from `/api/matches/{id}/relations`.
 * Player names are only resolved for display — no line-up is derived here.
 */
export function MatchTimeline({ events = [], players = [], testID }) {
  const nameById = React.useMemo(() => {
    const map = {};
    (players || []).forEach((player) => {
      map[player.id] = player.display_name || player.full_name;
    });
    return map;
  }, [players]);

  return (
    <View style={styles.wrap} testID={testID}>
      {events.map((event, index) => {
        const player = event.player_name || nameById[event.player_id] || null;
        const related = event.related_player_name || nameById[event.related_player_id] || null;
        const isAway = event.side === 'AWAY';
        return (
          <View key={event.id || `${event.type}-${index}`} style={styles.item}>
            <View style={styles.minuteWrap}>
              <Txt variant="meta" tone="accent">
                {eventMinute(event) || '-'}
              </Txt>
            </View>
            <View style={styles.line}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={ICONS[event.type] || 'ellipse-outline'}
                  size={14}
                  color={ICON_COLOR[event.type] || colors.textMuted}
                />
              </View>
              {index < events.length - 1 ? <View style={styles.connector} /> : null}
            </View>
            <View style={styles.body}>
              <Txt variant="smallStrong" numberOfLines={1}>
                {eventLabel(event.type)}
                {isAway ? ' · Lawan' : ''}
              </Txt>
              {player ? (
                <Txt variant="small" tone="muted" numberOfLines={1}>
                  {player}
                  {related ? ` ← ${related}` : ''}
                </Txt>
              ) : null}
              {event.description ? (
                <Txt variant="small" tone="dim" numberOfLines={2}>
                  {event.description}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  minuteWrap: { width: 38, paddingTop: 6, alignItems: 'flex-end' },
  line: { width: 26, alignItems: 'center' },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: { width: 1, flex: 1, minHeight: 22, backgroundColor: colors.border },
  body: { flex: 1, paddingBottom: 14, paddingTop: 3, gap: 2 },
  badge: { borderRadius: radii.sm },
});

export default MatchTimeline;
