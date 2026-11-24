import { FlatList, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { Listing } from '@/lib/api';
import { bookability, matchingAllergens } from '@/lib/explore-filter-logic';
import { space } from '@/theme';

import { ListingPreview } from './ListingPreview';

const GAP = space.sm;
const PEEK = 20; // how much of the next card shows, so it is obvious the strip swipes

type Props = {
  // In swipe order; the first one is the pin that was tapped.
  listings: Listing[];
  myAllergens: readonly string[];
  userId: string | null;
  distanceTo: ((listing: Listing) => number) | null;
  onChange: (listing: Listing) => void;
  onOpen: (listing: Listing) => void;
  onBook: (listing: Listing) => void;
  onClose: () => void;
  onHeight: (height: number) => void;
};

// The map's listing cards as a strip: swipe left for the next nearest listing, right to go back.
// Each card snaps into place and the map follows the card in view.
export function PreviewCarousel({ listings, myAllergens, userId, distanceTo, onChange, onOpen, onBook, onClose, onHeight }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = listings.length > 1 ? width - space.md * 2 - PEEK : width - space.md * 2;
  const interval = cardWidth + GAP;
  const now = new Date();

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(listings.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / interval)));
    const listing = listings[index];
    if (listing) onChange(listing);
  };

  return (
    <View onLayout={(e) => onHeight(e.nativeEvent.layout.height)}>
      <FlatList
        horizontal
        data={listings}
        keyExtractor={(l) => l.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Gap}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <ListingPreview
              listing={item}
              allergens={matchingAllergens(item, myAllergens)}
              distanceKm={distanceTo ? distanceTo(item) : null}
              canBook={bookability(item, userId, now)}
              onPress={() => onOpen(item)}
              onBook={() => onBook(item)}
              onClose={onClose}
            />
          </View>
        )}
      />
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
    alignItems: 'flex-end',
  }, // top room for the card shadow
  gap: { width: GAP },
});
