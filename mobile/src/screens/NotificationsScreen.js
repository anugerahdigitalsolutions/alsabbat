import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { LinkButton } from '../components/Buttons';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { relativeTime } from '../lib/format';

const ICONS = {
  MATCH: 'football-outline',
  NEWS: 'newspaper-outline',
  MEMBERSHIP: 'card-outline',
  APPLICATION: 'document-text-outline',
  ORDER: 'bag-handle-outline',
  SYSTEM: 'information-circle-outline',
};

/** Notifications — `/api/baraya/notifications` (+ read / read-all). */
export default function NotificationsScreen({ navigation }) {
  const { isAuthenticated, refreshUnread } = useAuth();
  const notifications = useResourceList(() => endpoints.getNotifications({ limit: 40 }), [], {
    enabled: isAuthenticated,
  });

  const markAll = useCallback(async () => {
    try {
      await endpoints.markAllNotificationsRead();
    } catch (e) {
      /* ignore — list reload reflects the truth */
    }
    notifications.reload();
    refreshUnread();
  }, [notifications, refreshUnread]);

  const openItem = useCallback(
    async (item) => {
      if (!item.read) {
        try {
          await endpoints.markNotificationRead(item.id);
        } catch (e) {
          /* ignore */
        }
        notifications.reload();
        refreshUnread();
      }
      if (item.reference_type === 'MATCH' && item.reference_id) {
        navigation.navigate('MatchDetail', { matchId: item.reference_id });
      } else if (item.reference_type === 'POST' && item.reference_id) {
        navigation.navigate('NewsDetail', { postId: item.reference_id });
      }
    },
    [notifications, refreshUnread, navigation]
  );

  return (
    <Screen
      testID="notifications-screen"
      header={
        <TopBar
          title="Notifikasi"
          onBack={() => navigation.goBack()}
          right={
            notifications.items.some((item) => !item.read) ? (
              <LinkButton label="Tandai" onPress={markAll} testID="notifications-read-all" />
            ) : null
          }
        />
      }
      onRefresh={notifications.refresh}
      refreshing={notifications.refreshing}
      bottomInset={40}
    >
      {!isAuthenticated ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Masuk untuk melihat notifikasi"
          description="Notifikasi klub tersedia setelah Anda masuk dengan akun AL SABBAT."
        />
      ) : notifications.loading ? (
        <Loading rows={4} height={78} />
      ) : notifications.error ? (
        <ErrorState message={notifications.error} onRetry={notifications.reload} />
      ) : notifications.items.length ? (
        <View style={styles.stack}>
          {notifications.items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => openItem(item)}
              style={({ pressed }) => [
                styles.item,
                item.read ? null : styles.unread,
                pressed ? styles.pressed : null,
              ]}
              testID={`notification-${item.id}`}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={ICONS[item.type] || 'notifications-outline'}
                  size={17}
                  color={colors.accent}
                />
              </View>
              <View style={styles.body}>
                <Txt variant="smallStrong" numberOfLines={2}>
                  {item.title}
                </Txt>
                {item.message ? (
                  <Txt variant="small" tone="muted" numberOfLines={3}>
                    {item.message}
                  </Txt>
                ) : null}
                <Txt variant="meta" tone="dim">
                  {relativeTime(item.created_at)}
                </Txt>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="notifications-off-outline"
          title="Belum ada notifikasi"
          description="Kabar penting dari klub akan tampil di sini."
          testID="notifications-empty"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: 'rgba(252,207,43,0.35)', backgroundColor: 'rgba(252,207,43,0.06)' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
  pressed: { opacity: 0.9 },
});
