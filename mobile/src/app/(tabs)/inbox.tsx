import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationRow } from '@/components/bookings/NotificationRow';
import { Button, Empty, ErrorState, errorMessage, Loading, SignInGate, Title } from '@/components/ui';
import { api, type AppNotification } from '@/lib/api';
import { logError } from '@/lib/log';
import { routeForNotification } from '@/lib/push';
import { useSession, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, space } from '@/theme';

// Being on the inbox for this long counts as having seen everything in it.
const SEEN_AFTER_MS = 2000;

export default function InboxScreen() {
  const { t } = useTranslation();
  const { state } = useSession();
  const userId = useUserId();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {state.phase === 'loading' ? (
        <Loading />
      ) : userId ? (
        <Inbox userId={userId} />
      ) : (
        <>
          <View style={styles.titleRow}>
            <Title>{t('inbox.title')}</Title>
          </View>
          <SignInGate body={t('inbox.signInBody')} />
        </>
      )}
    </SafeAreaView>
  );
}

function Inbox({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const notifications = useAsync(() => api.notifications(), [userId]);
  const { reload } = notifications;
  // Ids marked read on this screen since the last load; shown read straight away.
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const list: AppNotification[] =
    notifications.status === 'ready' ? notifications.data.map((n) => (readIds.has(n.id) ? { ...n, read: true } : n)) : [];
  const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
  const hasUnread = unreadIds.length > 0;

  const markRead = useCallback(
    async (ids: readonly string[], isQuiet: boolean) => {
      if (ids.length === 0) return;
      try {
        await api.markNotificationsRead([...ids]);
        setReadIds((prev) => new Set([...prev, ...ids]));
      } catch (error) {
        logError('markNotificationsRead', error);
        if (!isQuiet) Alert.alert(t('inbox.markFailed'), errorMessage(error));
      }
    },
    [t],
  );

  // Reload on every return to the tab (not the first focus, which the initial load covers).
  const hasFocused = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) void reload();
      hasFocused.current = true;
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [reload]),
  );

  // Once the list has been on screen for a moment, everything in it counts as seen.
  const unreadKey = unreadIds.join(',');
  useEffect(() => {
    if (!isFocused || !unreadKey) return;
    const timer = setTimeout(() => void markRead(unreadKey.split(','), true), SEEN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [isFocused, unreadKey, markRead]);

  const handleMarkAll = async () => {
    setIsMarkingAll(true);
    await markRead(unreadIds, false);
    setIsMarkingAll(false);
  };

  const handleOpen = (n: AppNotification) => {
    if (!n.read) {
      void markRead([n.id], true);
    }
    routeForNotification({ type: n.type, order_id: n.data.order_id ?? null, listing_id: n.data.listing_id ?? null });
  };

  const handleRefresh = async () => {
    await reload();
    setReadIds(new Set());
  };

  const titleRow = (
    <View style={[styles.titleRow, styles.titleRowSplit]}>
      <Title>{t('inbox.title')}</Title>
      {hasUnread ? (
        <Button title={t('inbox.markAllRead')} variant="ghost" isLoading={isMarkingAll} onPress={() => void handleMarkAll()} />
      ) : null}
    </View>
  );

  if (notifications.status === 'loading') {
    return (
      <>
        {titleRow}
        <Loading />
      </>
    );
  }
  if (notifications.status === 'error') {
    return (
      <>
        {titleRow}
        <ErrorState error={notifications.error} onRetry={() => void reload()} />
      </>
    );
  }

  return (
    <>
      {titleRow}
      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, list.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={notifications.isRefreshing} onRefresh={() => void handleRefresh()} tintColor={colors.amberDeep} />}
        ListEmptyComponent={<Empty icon="bell" title={t('inbox.emptyTitle')} body={t('inbox.emptyBody')} />}
        renderItem={({ item }) => <NotificationRow notification={item} onPress={() => handleOpen(item)} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  titleRow: { paddingHorizontal: space.md + 4, paddingTop: space.sm, paddingBottom: space.sm, minHeight: 52 },
  titleRowSplit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { paddingHorizontal: space.sm, paddingBottom: space.xxl },
  listEmpty: { flexGrow: 1 },
  separator: { height: 2 },
});
