import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { gutter } from '../theme';
import Screen from '../components/Screen';
import TopBar, { SectionHeader } from '../components/TopBar';
import Txt from '../components/Txt';
import { PlayerCard } from '../components/PlayerCard';
import { Avatar } from '../components/Crest';
import { Card } from '../components/Card';
import { ChipRow, EmptyState, ErrorState, Loading } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { resolveMediaUrl } from '../api/client';

const POSITIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'GOALKEEPER', label: 'Kiper' },
  { value: 'DEFENDER', label: 'Bek' },
  { value: 'MIDFIELDER', label: 'Gelandang' },
  { value: 'FORWARD', label: 'Penyerang' },
];

/**
 * Squad — information only (`/api/players`, `/api/staff`).
 * Tapping a player opens their profile; there is no selection, starting XI or
 * formation behaviour anywhere in this screen.
 */
export default function SquadScreen({ navigation }) {
  const [position, setPosition] = useState('all');
  const players = useResourceList(() => endpoints.getPlayers({ limit: 80, status: 'ACTIVE' }), []);
  const staff = useResourceList(() => endpoints.getStaff({ limit: 40, status: 'ACTIVE' }), []);

  const list = useMemo(
    () =>
      position === 'all'
        ? players.items
        : players.items.filter((player) => player.position === position),
    [players.items, position]
  );

  const refresh = useCallback(() => {
    players.refresh();
    staff.refresh();
  }, [players, staff]);

  return (
    <Screen
      testID="squad-screen"
      header={<TopBar title="Skuad" onBack={() => navigation.goBack()} />}
      onRefresh={refresh}
      refreshing={players.refreshing}
      bottomInset={40}
    >
      <Txt variant="small" tone="muted" style={styles.intro}>
        Informasi pemain dan staf AL SABBAT Football Club.
      </Txt>

      <View style={styles.chips}>
        <ChipRow options={POSITIONS} value={position} onChange={setPosition} testID="squad-positions" />
      </View>

      {players.loading ? (
        <Loading rows={3} height={160} testID="squad-loading" />
      ) : players.error ? (
        <ErrorState message={players.error} onRetry={players.reload} testID="squad-error" />
      ) : list.length ? (
        <View style={styles.grid}>
          {list.map((player) => (
            <View key={player.id} style={styles.gridItem}>
              <PlayerCard
                player={player}
                onPress={() => navigation.navigate('PlayerDetail', { playerId: player.id })}
                testID={`player-${player.id}`}
              />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="people-outline"
          title="Belum ada data pemain"
          description="Skuad akan tampil di sini setelah dipublikasikan oleh klub."
          testID="squad-empty"
        />
      )}

      {staff.items.length ? (
        <>
          <SectionHeader title="Staf & Tim Pelatih" />
          <View style={styles.staffStack}>
            {staff.items.map((member) => (
              <Card key={member.id} style={styles.staffCard}>
                <View style={styles.staffRow}>
                  <Avatar name={member.name} photo={resolveMediaUrl(member.photo)} size={46} />
                  <View style={styles.staffText}>
                    <Txt variant="smallStrong" numberOfLines={1}>
                      {member.name}
                    </Txt>
                    <Txt variant="meta" tone="muted" numberOfLines={1}>
                      {member.role_label || member.role || 'Staf'}
                    </Txt>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 12 },
  chips: { marginHorizontal: -gutter, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47.6%' },
  staffStack: { gap: 10 },
  staffCard: { padding: 10 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffText: { flex: 1, gap: 2 },
});
