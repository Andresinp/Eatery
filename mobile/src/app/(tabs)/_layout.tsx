import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icons';
import { api } from '@/lib/api';
import { logError } from '@/lib/log';
import { useNotificationStream } from '@/lib/realtime';
import { useUserId } from '@/lib/session';
import { colors, fonts, space } from '@/theme';

const TABS = ['explore', 'bookings', 'host', 'inbox', 'profile'] as const;
type TabName = (typeof TABS)[number];
const ICON: Record<TabName, IconName> = { explore: 'map', bookings: 'ticket', host: 'chef', inbox: 'bell', profile: 'user' };

function useUnreadCount(): number {
  const userId = useUserId();
  // Tagged with whose count it is, so signing out or switching accounts never shows a stale dot.
  const [count, setCount] = useState<{ userId: string; n: number } | null>(null);
  const refresh = useCallback(() => {
    if (!userId) return;
    api.unreadNotificationCount().then(
      (n) => setCount({ userId, n }),
      (error: unknown) => logError('unreadNotificationCount', error),
    );
  }, [userId]);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  useNotificationStream(userId, refresh);
  return userId && count?.userId === userId ? count.n : 0;
}

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const name = route.name as TabName;
        const isFocused = state.index === index;
        const tint = isFocused ? colors.text : colors.textFaint;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={t(`tabs.${name}`)}
            onPress={() => {
              if (!isFocused) navigateToTab(route.key);
            }}
            style={styles.tab}>
            <View>
              <Icon name={ICON[name]} size={24} color={tint} />
              {name === 'inbox' && unread > 0 ? <View style={styles.dot} /> : null}
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>{t(`tabs.${name}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      {TABS.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textFaint },
  labelActive: { color: colors.text },
  dot: { position: 'absolute', top: -1, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.bg },
});
