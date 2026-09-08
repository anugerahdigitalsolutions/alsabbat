import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { gutter } from '../theme';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import { MatchCard } from '../components/MatchCard';
import { ChipRow, EmptyState, ErrorState, Loading } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { hasScore, isUpcomingStatus, kickoffAt, pickNextMatch } from '../lib/matchUtils';

const FILTERS = [
  { value: 'upcoming', label: 'Jadwal' },
  { value: 'results', label: 'Hasil' },
  { value: 'all', label: 'Semua' },
];

/**
 * Match Center list — READ-ONLY information from `/api/matches`.
 * There is deliberately no line-up, formation or player-selection feature.
 */
export default function MatchesScreen({ navigation }) {
  const [filter, setFilter] = useState('upcoming');
  const matches = useResourceList(() => endpoints.getMatches({ limit: 100 }), []);

  const list = useMemo(() => {
    const items = [...matches.items];
    if (filter === 'results') {
      return items
        .filter((match) => hasScore(match) || match.status === 'FINISHED')
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    }
    if (filter === 'upcoming') {
      return items
        .filter((match) => isUpcomingStatus(match.status) && !hasScore(match))
        .sort((a, b) => (kickoffAt(a)?.getTime?.() ?? 0) - (kickoffAt(b)?.getTime?.() ?? 0));
    }
    return items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [matches.items, filter]);

  // Countdown hanya pada pertandingan terdekat yang belum dimulai.
  const nextMatchId = useMemo(() => pickNextMatch(matches.items)?.id || null, [matches.items]);

  const openMatch = useCallback(
    (match) => navigation.navigate('MatchDetail', { matchId: match.id }),
    [navigation]
  );

  return (
    <Screen onRefresh={matches.refresh} refreshing={matches.refreshing} testID="matches-screen">
      <View style={styles.header}>
        <Txt variant="display">Pertandingan</Txt>
        <Txt variant="small" tone="muted">
          Jadwal, hasil, dan jalannya laga AL SABBAT Football Club.
        </Txt>
      </View>

      <View style={styles.chips}>
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} testID="matches-filter" />
      </View>

      {matches.loading ? (
        <Loading rows={4} height={130} testID="matches-loading" />
      ) : matches.error ? (
        <ErrorState message={matches.error} onRetry={matches.reload} testID="matches-error" />
      ) : list.length ? (
        <View style={styles.stack}>
          {list.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              countdown={match.id === nextMatchId}
              onPress={() => openMatch(match)}
              testID={`match-card-${match.id}`}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title={filter === 'results' ? 'Belum ada hasil' : 'Belum ada jadwal'}
          description="Data pertandingan akan tampil di sini setelah dipublikasikan oleh klub."
          testID="matches-empty"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 14, gap: 2 },
  chips: { marginHorizontal: -gutter, marginBottom: 16 },
  stack: { gap: 12 },
});
