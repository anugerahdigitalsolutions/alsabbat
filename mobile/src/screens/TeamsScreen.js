import React from 'react';
import { StyleSheet, View } from 'react-native';

import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card } from '../components/Card';
import { Crest } from '../components/Crest';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { resolveMediaUrl } from '../api/client';

/** Daftar tim klub — `GET /api/teams` (read-only, data existing). */
export default function TeamsScreen({ navigation }) {
  const teams = useResourceList(() => endpoints.getTeams({ limit: 30 }), [], {
    fallbackMessage: 'Gagal memuat data tim.',
  });

  return (
    <Screen
      onRefresh={teams.refresh}
      refreshing={teams.refreshing}
      testID="teams-screen"
      header={<TopBar title="Tim AL SABBAT" onBack={() => navigation.goBack()} />}
    >
      {teams.loading ? (
        <Loading rows={3} height={90} testID="teams-loading" />
      ) : teams.error ? (
        <ErrorState message={teams.error} onRetry={teams.reload} testID="teams-error" />
      ) : teams.items.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Belum ada tim"
          description="Data tim akan tampil di sini begitu ditambahkan klub."
          testID="teams-empty"
        />
      ) : (
        teams.items.map((team) => (
          <Card
            key={team.id}
            style={styles.item}
            onPress={() => navigation.navigate('TeamDetail', { teamId: team.id, name: team.name })}
            testID={`team-${team.id}`}
          >
            <View style={styles.row}>
              <Crest name={team.short_name || team.name} logo={resolveMediaUrl(team.logo)} size={44} />
              <View style={styles.body}>
                <Txt variant="h3" numberOfLines={1}>
                  {team.name}
                </Txt>
                <Txt variant="meta" tone="muted" numberOfLines={1}>
                  {[team.category, team.gender, team.age_group].filter(Boolean).join(' · ') || 'Tim klub'}
                </Txt>
              </View>
              {team.status ? <Badge label={team.status} /> : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, minWidth: 0, gap: 2 },
});
