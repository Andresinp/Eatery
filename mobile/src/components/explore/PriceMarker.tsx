import { StyleSheet, Text, View } from 'react-native';

import type { Listing } from '@/lib/api';
import { isSoldOut } from '@/lib/explore-filter-logic';
import { formatPrice } from '@/lib/format';
import { colors, fonts, radius, shadow } from '@/theme';

type Props = { listing: Listing; isSelected: boolean };

// The price pill on the map: amber for tables, leaf green for market, grey when sold out.
// Selected pills turn ink so the one in the preview card stands out.
export function PriceMarker({ listing, isSelected }: Props) {
  const isGone = isSoldOut(listing);
  const background = isSelected ? colors.text : isGone ? colors.surfaceRaised : listing.listing_type === 'table' ? colors.amber : colors.leaf;
  const color = isSelected ? colors.bg : isGone ? colors.textFaint : listing.listing_type === 'table' ? colors.amberInk : colors.leafInk;
  return (
    <View style={[styles.pill, { backgroundColor: background }, isSelected && styles.selected]}>
      <Text style={[styles.text, { color }]}>{formatPrice(listing.price_per_unit, listing.currency)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.card,
    ...shadow.card,
  },
  selected: { transform: [{ scale: 1.15 }] },
  text: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
