import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { colors, fonts, radius, shadow, space } from '@/theme';

// The amber block with the plate mark and the Eatery wordmark, top of the welcome sheet.
export function BrandHero() {
  const { t } = useTranslation();
  return (
    <View style={styles.hero} accessibilityRole="header" accessibilityLabel={t('app.name')}>
      <View style={styles.mark}>
        <Icon name="plate" size={34} color={colors.amberInk} />
      </View>
      <Text style={styles.wordmark}>{t('app.name')}</Text>
      <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.amber,
    borderRadius: radius.xl,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.sm,
    ...shadow.card,
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 54, letterSpacing: -1.2, color: colors.amberInk },
  tagline: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.amberInk, textAlign: 'center', opacity: 0.85 },
});
