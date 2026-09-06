import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar, { SectionHeader } from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import { PrimaryButton } from '../components/Buttons';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useResource, useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { formatDateMedium } from '../lib/format';
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_TYPE_LABEL,
  buildStages,
} from '../lib/membership';

const STATE_META = {
  DONE: { icon: 'checkmark-circle', tone: 'win', label: 'Selesai' },
  PENDING: { icon: 'time', tone: 'accent', label: 'Diproses' },
  AVAILABLE: { icon: 'arrow-forward-circle', tone: 'accent', label: 'Tersedia' },
  REJECTED: { icon: 'close-circle', tone: 'lose', label: 'Ditolak' },
  LOCKED: { icon: 'lock-closed', tone: 'default', label: 'Terkunci' },
};

/**
 * Status keanggotaan bertahap: Member → Pemain → Staf.
 * Semua status dibaca dari backend existing (`/baraya/me`, `/baraya/access`,
 * `/baraya/applications/mine`) — tombol pengajuan hanya muncul bila backend
 * mengizinkan (`can_apply_player` / `can_apply_staff`).
 */
export default function MembershipScreen({ navigation }) {
  const { customer, roles, isAuthenticated, refreshProfile } = useAuth();
  const access = useResource(() => endpoints.getAccess(), [], { enabled: isAuthenticated });
  const applications = useResourceList(() => endpoints.getMyApplications(), [], {
    enabled: isAuthenticated,
  });

  const stages = useMemo(
    () =>
      buildStages({
        customer,
        roles,
        access: access.data,
        applications: applications.items,
      }),
    [customer, roles, access.data, applications.items]
  );

  const refresh = useCallback(() => {
    refreshProfile();
    access.refresh();
    applications.refresh();
  }, [refreshProfile, access, applications]);

  const openForm = useCallback(
    (type) => navigation.navigate('ApplicationForm', { type }),
    [navigation]
  );

  return (
    <Screen
      testID="membership-screen"
      header={<TopBar title="Keanggotaan" onBack={() => navigation.goBack()} />}
      onRefresh={isAuthenticated ? refresh : undefined}
      refreshing={applications.refreshing}
      bottomInset={40}
    >
      {!isAuthenticated ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Masuk untuk melihat keanggotaan"
          description="Tahapan Member, Pemain, dan Staf tersedia setelah Anda masuk dengan akun AL SABBAT."
          action={
            <PrimaryButton label="Masuk" onPress={() => navigation.navigate('Login')} style={styles.action} />
          }
        />
      ) : (
        <>
          <Txt variant="small" tone="muted" style={styles.intro}>
            Tahapan keanggotaan AL SABBAT Football Club mengikuti alur resmi klub. Persetujuan setiap
            tahap dilakukan pengurus klub melalui Admin Panel.
          </Txt>

          {access.loading || applications.loading ? (
            <Loading rows={3} height={110} />
          ) : (
            <View style={styles.stack}>
              {stages.map((stage, index) => {
                const meta = STATE_META[stage.state] || STATE_META.LOCKED;
                return (
                  <Card key={stage.key} style={styles.stageCard} testID={`stage-${stage.key}`}>
                    <View style={styles.stageHeader}>
                      <View style={[styles.stepBubble, stage.state === 'DONE' ? styles.stepBubbleDone : null]}>
                        <Txt variant="smallStrong" tone={stage.state === 'DONE' ? 'onAccent' : 'accent'}>
                          {stage.step}
                        </Txt>
                      </View>
                      <View style={styles.stageTitle}>
                        <Txt variant="h3" numberOfLines={1}>
                          {stage.title}
                        </Txt>
                        <Txt variant="meta" tone="muted" numberOfLines={2}>
                          {stage.status}
                        </Txt>
                      </View>
                      <Ionicons
                        name={meta.icon}
                        size={20}
                        color={
                          meta.tone === 'win'
                            ? colors.win
                            : meta.tone === 'lose'
                              ? colors.lose
                              : meta.tone === 'accent'
                                ? colors.accent
                                : colors.textDim
                        }
                      />
                    </View>

                    <Txt variant="small" tone="muted" style={styles.stageDescription}>
                      {stage.description}
                    </Txt>

                    {stage.application?.status === 'REJECTED' && stage.application?.review_note ? (
                      <View style={styles.note}>
                        <Txt variant="meta" tone="lose">
                          Catatan pengurus: {stage.application.review_note}
                        </Txt>
                      </View>
                    ) : null}

                    {stage.canApply ? (
                      <PrimaryButton
                        label={stage.key === 'PEMAIN' ? 'Daftar Pemain' : 'Daftar Staf'}
                        icon="person-add-outline"
                        onPress={() => openForm(stage.key)}
                        style={styles.action}
                        testID={`apply-${stage.key}`}
                      />
                    ) : null}

                    {index < stages.length - 1 ? <View style={styles.connector} /> : null}
                  </Card>
                );
              })}
            </View>
          )}

          <SectionHeader title="Riwayat Pengajuan" />
          {applications.loading ? (
            <Loading rows={2} height={80} />
          ) : applications.error ? (
            <ErrorState message={applications.error} onRetry={applications.reload} />
          ) : applications.items.length ? (
            <Card>
              {applications.items.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.historyRow}>
                    <View style={styles.historyText}>
                      <Txt variant="smallStrong" numberOfLines={1}>
                        {APPLICATION_TYPE_LABEL[item.type] || item.type}
                        {item.staff_data?.position_title ? ` · ${item.staff_data.position_title}` : ''}
                      </Txt>
                      <Txt variant="meta" tone="dim" numberOfLines={1}>
                        {formatDateMedium(item.created_at)}
                        {item.staff_data?.department ? ` · ${item.staff_data.department}` : ''}
                      </Txt>
                    </View>
                    <Badge
                      label={APPLICATION_STATUS_LABEL[item.status] || item.status}
                      tone={
                        item.status === 'APPROVED' ? 'win' : item.status === 'REJECTED' ? 'lose' : 'accent'
                      }
                    />
                  </View>
                  {index < applications.items.length - 1 ? <Divider style={styles.divider} /> : null}
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon="document-text-outline"
              title="Belum ada pengajuan"
              description="Pengajuan Pemain atau Staf yang Anda kirim akan tampil di sini beserta statusnya."
              testID="membership-history-empty"
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 8, marginBottom: 16 },
  stack: { gap: 12 },
  stageCard: { gap: 8 },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(252,207,43,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  stageTitle: { flex: 1, gap: 2 },
  stageDescription: { marginTop: 2 },
  note: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderColor: 'rgba(248,113,113,0.3)',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 10,
  },
  action: { marginTop: 10, alignSelf: 'stretch' },
  connector: { height: 2, width: 24, backgroundColor: colors.border, marginTop: 6, marginLeft: 15 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  historyText: { flex: 1, gap: 2 },
  divider: { marginVertical: 10 },
});
