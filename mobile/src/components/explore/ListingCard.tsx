import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Photo, Small, Tag, tagLabel } from '@/components/ui';
import type { Listing } from '@/lib/api';
import { isSoldOut } from '@/lib/explore-filter-logic';
import { formatDistance, formatListingWhen, formatPrice } from '@/lib/format';
import { colors, fonts, radius, shadow, space, type } from '@/theme';

import { AllergenWarning, availabilityText, TypeBadge, unitText } from './bits';

type Props = { listing: Listing; distanceKm: number | null; allergens: string[]; onPress: () => void };

// A listing in the list view: big photo, then title, when, distance, price and tags.
export function ListingCard({ listing, distanceKm, allergens, onPress }: Props) {
  const { t } = useTranslation();
  const isGone = isSoldOut(listing);
  const price = formatPrice(listing.price_per_unit, listing.currency);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatListingWhen(listing)}, ${price} ${unitText(t, listing)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View>
        <Photo uri={listing.photos[0]} style={[styles.photo, isGone && styles.faded]} />
        <View style={styles.badge}>
          <TypeBadge listing={listing} />
        </View>
        <View style={styles.pricePill}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.unit}>{unitText(t, listing)}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <View style={styles.meta}>
          <Icon name="clock" size={14} color={colors.textMuted} />
          <Small numberOfLines={1} style={styles.metaText}>
            {formatListingWhen(listing)}
          </Small>
        </View>
        <View style={styles.meta}>
          <Icon name="pin" size={14} color={colors.textMuted} />
          <Small numberOfLines={1} style={styles.metaText}>
            {distanceKm === null ? listing.location_display : `${formatDistance(distanceKm)} · ${listing.location_display}`}
          </Small>
          <Small style={[styles.left, isGone && { color: colors.danger }]}>{availabilityText(t, listing)}</Small>
        </View>
        {listing.dietary_tags.length > 0 ? (
          <View style={styles.tags}>
            {listing.dietary_tags.slice(0, 4).map((tag) => (
              <Tag key={tag} title={tagLabel(tag)} tone="leaf" />
            ))}
          </View>
        ) : null}
        <AllergenWarning allergens={allergens} isCompact />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  pressed: { opacity: 0.85 },
  photo: { height: 180, width: '100%' },
  faded: { opacity: 0.55 },
  badge: { position: 'absolute', top: space.sm + 2, left: space.sm + 2 },
  pricePill: {
    position: 'absolute',
    right: space.sm + 2,
    bottom: space.sm + 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  price: { ...type.price, fontSize: 16 },
  unit: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  body: { padding: space.md, gap: 6 },
  title: { ...type.heading },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1 },
  left: { fontFamily: fonts.bodySemi, color: colors.leafDeep },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
