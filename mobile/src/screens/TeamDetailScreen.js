import React from 'react';
import { StyleSheet, View } from 'react-native';

import Screen from '../components/Screen';
import TopBar, { SectionHeader } from '../components/TopBar';
import Txt from '../components/Txt';
import { Card } from '../components/Card';
import { Crest, Avatar } from '../components/Crest';
import { PlayerCard } from '../components/PlayerCard';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useResource, useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { resolveMediaUrl } from '../api/client';

/**
 * Detail tim — `GET /api/teams/{id}` + skuad (`/players?team_id=`) dan staf
 * (`/staff?team_id=`) dari data existing.
 */
export default function TeamDetailScreen({ route, navigation }) {
  const { teamId, name } = route.params || {};
  const team = useResource(() => endpoints.getTeam(teamId), [teamId], {
    fallbackMessage: 'Tim tidak ditemukan.',
  });
  const players = useResourceList(
    () => endpoints.getPlayers({ limit: 60, team_id: teamId, status: 'ACTIVE' }),
    [teamId]
  );
  const staff = useResourceList(
    () => endpoints.getStaff({ limit: 40, team_id: teamId, status: 'ACTIVE' }),
    [teamId]
  );
  const data = team.data;

  return (
    <Screen
      onRefresh={() => {
        team.refresh();
        players.refresh();
        staff.refresh();
      }}
      refreshing={team.refreshing}
      testID="team-detail-screen"
      header={<TopBar title={data?.name || name || 'Tim'} onBack={() => navigation.goBack()} />}
    >
      {team.loading ? (
        <Loading rows={2} height={120} testID="team-loading" />
      ) : team.error ? (
        <ErrorState message={team.error} onRetry={team.reload} testID="team-error" />
      ) : (
        <>
          <Card>
            <View style={styles.header}>
              <Crest name={data?.short_name || data?.name} logo={resolveMediaUrl(data?.logo)} size={56} />
              <View style={styles.headerBody}>
                <Txt variant="h2" numberOfLines={2}>
                  {data?.name}
                </Txt>
                <Txt variant="meta" tone="muted" numberOfLines={2}>
                  {[data?.category, data?.gender, data?.age_group, data?.home_venue]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
              </View>
            </View>
            {data?.description ? (
              <Txt variant="small" tone="muted" style={styles.description}>
                {data.description}
              </Txt>
            ) : null}
          </Card>

          <SectionHeader title="Skuad" />
          {players.loading ? (
            <Loading rows={2} height={140} />
          ) : players.items.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Belum ada pemain"
              description="Pemain tim ini belum dipublikasikan klub."
              testID="team-players-empty"
            />
          ) : (
            <View style={styles.grid}>
              {players.items.map((player) => (
                <View key={player.id} style={styles.cell}>
                  <PlayerCard
                    player={player}
                    onPress={() => navigation.navigate('PlayerDetail', { playerId: player.id })}
                  />
                </View>
              ))}
            </View>
          )}

          {staff.items.length ? (
            <>
              <SectionHeader title="Staf Tim" />
              <Card>
                {staff.items.map((member) => (
                  <View key={member.id} style={styles.staffRow}>
                    <Avatar name={member.name} photo={resolveMediaUrl(member.photo)} size={38} />
                    <View style={styles.staffBody}>
                      <Txt variant="smallStrong" numberOfLines={1}>
                        {member.name}
                      </Txt>
                      <Txt variant="meta" tone="muted" numberOfLines={1}>
                        {member.position_title || member.role_label || member.department || 'Staf'}
                      </Txt>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerBody: { flex: 1, minWidth: 0, gap: 3 },
  description: { marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47.6%', minWidth: 0 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  staffBody: { flex: 1, minWidth: 0 },
});
