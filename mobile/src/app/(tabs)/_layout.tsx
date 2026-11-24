import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { TAB_PILL_HEIGHT, useTabBarSpace, useTabPillBottom } from '@/lib/tab-bar';
import { useUnreadCount } from '@/lib/use-unread-count';
import { colors, fonts, radius, shadow, space } from '@/theme';

const TABS = ['explore', 'bookings', 'host', 'inbox', 'profile'] as const;
type TabName = (typeof TABS)[number];
const ICON: Record<TabName, IconName> = {
  explore: 'map',
  bookings: 'ticket',
  host: 'chef',
  inbox: 'bell',
  profile: 'user',
};

// A dark pill floating above the bottom edge, as in the web app's ink-and-amber style: the active
// tab is an amber chip with its name, the others are icons only (their names stay for VoiceOver).
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const bottom = useTabPillBottom();
  const unread = useUnreadCount();
  return (
    <View style={[styles.pill, { bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const name = route.name as TabName;
        const isFocused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={t(`tabs.${name}`)}
            hitSlop={4}
            onPress={() => {
              if (!isFocused) navigateToTab(route.key);
            }}
            style={[styles.tab, isFocused && styles.tabActive]}>
            <View>
              <Icon name={ICON[name]} size={22} color={isFocused ? colors.amberInk : colors.bg} strokeWidth={isFocused ? 2.4 : 2} />
              {name === 'inbox' && unread > 0 ? <View style={styles.dot} /> : null}
            </View>
            {isFocused ? (
              <Text style={styles.label} numberOfLines={1}>
                {t(`tabs.${name}`)}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const barSpace = useTabBarSpace();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        // The map runs under the pill; every other screen stops above it.
        sceneStyle: {
          backgroundColor: colors.bg,
          paddingBottom: route.name === 'explore' ? 0 : barSpace,
        },
      })}>
      {TABS.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    height: TAB_PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    ...shadow.float,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 48,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.amber, paddingHorizontal: 16 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.amberInk },
  dot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.text,
  },
});
