import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Photo, tagLabel } from '@/components/ui';
import type { Listing } from '@/lib/api';
import { availableCount, isSoldOut } from '@/lib/explore-filter-logic';
import { formatDistance, formatListingWhen, formatPrice } from '@/lib/format';
import { colors, fonts, radius, shadow, space } from '@/theme';

import { AllergenWarning, availabilityText, unitText } from './bits';

type Props = {
  listing: Listing;
  distanceKm: number | null;
  allergens: string[];
  onPress: () => void;
};

const THUMB = 76;

// A listing in the list view, compact like the web app's rows: a square photo, then title, when,
// distance and area, food tags; price and places left on the right.
export function ListingCard({ listing, distanceKm, allergens, onPress }: Props) {
  const { t } = useTranslation();
  const isGone = isSoldOut(listing);
  const isLow = !isGone && availableCount(listing) <= 5;
  const isTable = listing.listing_type === 'table';
  const price = formatPrice(listing.price_per_unit, listing.currency);
  const when = formatListingWhen(listing);
  const tags = [...(isTable ? listing.cuisine_tags : listing.product_type_tags), ...listing.dietary_tags].slice(0, 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${when}, ${price} ${unitText(t, listing)}, ${availabilityText(t, listing)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View>
          <Photo uri={listing.photos[0]} style={[styles.thumb, isGone && styles.faded]} />
          <View style={[styles.typeDot, { backgroundColor: isTable ? colors.amber : colors.leaf }]}>
            <Icon name={isTable ? 'plate' : 'bag'} size={11} color={isTable ? colors.amberInk : colors.leafInk} />
          </View>
        </View>

        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          {when ? (
            <Text style={styles.when} numberOfLines={1}>
              {when}
            </Text>
          ) : null}
          <Text style={styles.muted} numberOfLines={1}>
            {distanceKm === null ? listing.location_display : `${formatDistance(distanceKm)} · ${listing.location_display}`}
          </Text>
          {tags.length > 0 ? (
            <Text style={styles.tags} numberOfLines={1}>
              {tags.map(tagLabel).join(' · ')}
            </Text>
          ) : null}
        </View>

        <View style={styles.side}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.unit}>{unitText(t, listing)}</Text>
          <Text style={[styles.left, isGone ? styles.leftGone : isLow ? styles.leftLow : null]} numberOfLines={1}>
            {availabilityText(t, listing)}
          </Text>
        </View>
      </View>
      {allergens.length > 0 ? (
        <View style={styles.allergens}>
          <AllergenWarning allergens={allergens} isCompact />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.sm + 2,
    gap: space.sm,
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.md },
  faded: { opacity: 0.5 },
  typeDot: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  main: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 19,
    color: colors.text,
  },
  when: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  muted: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  tags: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.leafDeep },
  side: { alignItems: 'flex-end', gap: 1 },
  price: {
    fontFamily: fonts.displayHeavy,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
  },
  unit: { fontFamily: fonts.body, fontSize: 10, color: colors.textFaint },
  left: {
    marginTop: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.leafDeep,
  },
  leftLow: { color: colors.amberDeep },
  leftGone: { color: colors.danger },
  allergens: {},
});
