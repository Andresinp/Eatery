import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Listing } from '@/lib/api';
import { isSoldOut } from '@/lib/explore-filter-logic';
import { formatPrice } from '@/lib/format';
import { colors, fonts, radius } from '@/theme';

type Props = { listing: Listing; isSelected: boolean };

// The map pin, as on the web app: a small white pill with a coloured dot (amber with a plate for a
// table, bordeaux with a food bag for market food). The price shows only on the selected pin,
// which turns ink so it stands out above the preview card.
export function PriceMarker({ listing, isSelected }: Props) {
  const isTable = listing.listing_type === 'table';
  const isGone = isSoldOut(listing);
  return (
    <View style={[styles.pill, isSelected && styles.selected, isGone && !isSelected && styles.gone]}>
      <View style={[styles.dot, { backgroundColor: isTable ? colors.amber : colors.bordeaux }]}>
        {isTable ? <Text style={styles.plate}>🍽</Text> : <BagIcon />}
      </View>
      {isSelected ? <Text style={styles.price}>{formatPrice(listing.price_per_unit, listing.currency)}</Text> : null}
    </View>
  );
}

// Beige placemat, kraft bag with handles and a food-dome stamp (the web's PRODUCT_ICON).
function BagIcon() {
  return (
    <Svg viewBox="0 0 20 20" width={20} height={20}>
      <Circle cx={10} cy={10} r={7} fill={colors.placemat} />
      <Rect x={6.5} y={9.5} width={7} height={6} rx={0.6} fill="#C4924A" />
      <Rect x={6} y={8} width={8} height={2} rx={0.5} fill="#A97838" />
      <Path d="M7.5 8 Q7.5 6 10 6 Q12.5 6 12.5 8" fill="none" stroke="#7A5020" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M7.5 13.8 Q10 12 12.5 13.8" fill="#A97838" />
      <Rect x={7.5} y={13.8} width={5} height={0.7} rx={0.3} fill="#8B6030" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.text,
    shadowColor: '#140F08',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  selected: { backgroundColor: colors.text },
  gone: { opacity: 0.5 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plate: { fontSize: 13, lineHeight: 16, color: colors.amberInk },
  price: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.bg, paddingLeft: 5, paddingRight: 8 },
});
