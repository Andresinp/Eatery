import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Photo } from '@/components/ui';
import { colors, space } from '@/theme';

type Props = { photos: string[]; height: number };

// Full-width paging photos with page dots. No photos → one warm placeholder.
export function PhotoCarousel({ photos, height }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  if (photos.length <= 1) {
    return <Photo uri={photos[0]} rounded={false} style={{ width, height }} />;
  }

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri) => uri}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item, index }) => (
          <View accessible accessibilityRole="image" accessibilityLabel={t('listingDetail.photoOf', { index: index + 1, total: photos.length })}>
            <Photo uri={item} rounded={false} style={{ width, height }} />
          </View>
        )}
      />
      <View style={styles.dots} pointerEvents="none">
        {photos.map((uri, i) => (
          <View key={uri} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', bottom: space.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 20, backgroundColor: colors.onPhoto },
});
