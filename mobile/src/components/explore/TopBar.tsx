import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/icons';
import { ModeSwitch } from '@/components/ModeSwitch';
import { Avatar } from '@/components/ui';
import { useMyProfile } from '@/lib/session';
import { useUnreadCount } from '@/lib/use-unread-count';
import { colors, fonts, radius, shadow, space } from '@/theme';

// Below this width the wordmark does not fit beside the switch, bell and avatar (iPhone SE 1st
// gen is 320pt), so only the "e" mark shows.
const WORDMARK_MIN_WIDTH = 370;

// The map's top bar, as on the web: logo, Guest/Host switch, notifications, profile.
export function ExploreTopBar({ paddingTop }: { paddingTop: number }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const profile = useMyProfile();
  const unread = useUnreadCount();

  return (
    <View style={[styles.bar, { paddingTop }]} pointerEvents="box-none">
      <View style={styles.logo} accessible accessibilityRole="header" accessibilityLabel="eatery">
        <View style={styles.mark}>
          <Text style={styles.markText}>e</Text>
        </View>
        {width >= WORDMARK_MIN_WIDTH ? (
          <Text style={styles.wordmark}>
            eatery<Text style={styles.dot}>.</Text>
          </Text>
        ) : null}
      </View>
      <View style={styles.flex} pointerEvents="none" />
      <ModeSwitch mode="guest" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.inbox')}
        hitSlop={4}
        onPress={() => router.navigate('/(tabs)/inbox')}
        style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
        <Icon name="bell" size={18} color={colors.text} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.profile')}
        hitSlop={4}
        onPress={() => router.navigate('/(tabs)/profile')}
        style={({ pressed }) => [styles.round, styles.avatarRing, pressed && styles.pressed]}>
        {profile ? <Avatar uri={profile.avatar_url} name={profile.full_name} size={36} /> : <Icon name="user" size={18} color={colors.text} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm + 4,
  },
  flex: { flex: 1 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mark: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  markText: {
    fontFamily: fonts.displayHeavy,
    fontSize: 18,
    color: colors.bg,
    marginTop: -2,
  },
  wordmark: {
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    letterSpacing: -0.5,
    color: colors.text,
  },
  dot: { color: colors.amber },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  avatarRing: { overflow: 'hidden' },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.amberInk,
  },
});
