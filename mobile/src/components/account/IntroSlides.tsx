import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { Heading, Muted } from '@/components/ui';
import { colors, space } from '@/theme';

type Slide = { id: string; icon: IconName; title: string; body: string };

// Three swipeable lines on what Eatery is, with page dots.
export function IntroSlides() {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const slides: Slide[] = [
    { id: 'table', icon: 'plate', title: t('welcome.slide1Title'), body: t('welcome.slide1Body') },
    { id: 'market', icon: 'bag', title: t('welcome.slide2Title'), body: t('welcome.slide2Body') },
    { id: 'host', icon: 'chef', title: t('welcome.slide3Title'), body: t('welcome.slide3Body') },
  ];

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScrollEnd}>
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]} accessible accessibilityLabel={`${slide.title} ${slide.body}`}>
            <View style={styles.icon}>
              <Icon name={slide.icon} size={22} color={colors.amberDeep} />
            </View>
            <Heading style={styles.center}>{slide.title}</Heading>
            <Muted style={styles.center}>{slide.body}</Muted>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {slides.map((slide, index) => (
          <View key={slide.id} style={[styles.dot, index === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.lg },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotActive: { width: 20, backgroundColor: colors.amberDeep },
});
