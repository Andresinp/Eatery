import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, shadow } from '@/theme';

// The web app's Guest/Host switch. On the map it reads "Guest | Host" and Host opens the hosting
// tab; on the hosting tab it reads "Host | Map" and Map returns to the map. The active half is
// a label, only the other half is a button.
export function ModeSwitch({ mode }: { mode: 'guest' | 'host' }) {
  const { t } = useTranslation();
  const isHost = mode === 'host';
  const activeLabel = isHost ? t('tabs.host') : t('mode.guest');
  const otherLabel = isHost ? t('mode.map') : t('tabs.host');
  const handlePress = () => router.navigate(isHost ? '/(tabs)/explore' : '/(tabs)/host');

  return (
    <View style={styles.track}>
      <View style={[styles.segment, styles.segmentActive]} accessible accessibilityRole="text" accessibilityState={{ selected: true }}>
        <Text style={[styles.label, styles.labelActive]} numberOfLines={1}>
          {activeLabel}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={otherLabel} hitSlop={6} onPress={handlePress} style={styles.segment}>
        <Text style={styles.label} numberOfLines={1}>
          {otherLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.bg,
    ...shadow.float,
  },
  segment: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.text },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
  labelActive: { color: colors.bg },
});
