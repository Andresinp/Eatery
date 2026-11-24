import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Photo, tagLabel } from '@/components/ui';
import type { Listing } from '@/lib/api';
import { availableCount, isSoldOut } from '@/lib/explore-filter-logic';
import { eventStart, formatDay, formatDistance, formatListingWhen, formatPrice } from '@/lib/format';
import { colors, fonts, radius, shadow, space } from '@/theme';

import { AllergenWarning, availabilityText, unitText } from './bits';

type Props = {
  listing: Listing;
  allergens: string[];
  distanceKm: number | null;
  onPress: () => void;
  onClose: () => void;
};

// The sheet at the bottom of the map for the tapped pin, laid out like the web app's: the photo
// across the top with a close button, then title and date, area, rating and type, a line of
// description, tags and drinks on the left; price, seats left and distance on the right.
export function ListingPreview({ listing, allergens, distanceKm, onPress, onClose }: Props) {
  const { t } = useTranslation();
  const isTable = listing.listing_type === 'table';
  const isGone = isSoldOut(listing);
  const count = availableCount(listing);
  const isLow = !isGone && count <= 5;
  const price = formatPrice(listing.price_per_unit, listing.currency);
  const tags = [...(isTable ? listing.cuisine_tags : listing.product_type_tags), ...listing.dietary_tags].slice(0, 2);
  const rating = listing.host?.host_rating ?? null;
  const drinks = listing.drinks.map(tagLabel).join(', ');
  const start = eventStart(listing);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatListingWhen(listing)}, ${price} ${unitText(t, listing)}`}
      accessibilityHint={t('explore.openListingHint')}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.photoWrap}>
        <Photo uri={listing.photos[0]} style={styles.photo} rounded={false} />
        <View style={styles.handle} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={8}
          onPress={onClose}
          style={styles.close}>
          <Icon name="close" size={14} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.main}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {listing.title}
            </Text>
            {start ? (
              <Text style={styles.when} numberOfLines={1}>
                {formatDay(start)}
              </Text>
            ) : null}
          </View>
          <Text style={styles.muted} numberOfLines={1}>
            {listing.location_display}
          </Text>
          <View style={styles.ratingRow}>
            {rating !== null ? (
              <>
                <Text style={styles.star}>★</Text>
                <Text style={styles.small}>{rating.toFixed(1)}</Text>
                <Text style={styles.dotSep}>·</Text>
              </>
            ) : null}
            <Text style={styles.small}>{isTable ? t('listing.table') : t('listing.market')}</Text>
          </View>
          {listing.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {listing.description}
            </Text>
          ) : null}
          {tags.length > 0 ? (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tagLabel(tag)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {isTable ? (
            <Text style={[styles.drinks, listing.drinks_included ? styles.drinksYes : styles.drinksNo]} numberOfLines={1}>
              {listing.drinks_included ? `🍷 ${drinks || t('listingDetail.drinksIncluded')}` : `🚫 ${t('listingDetail.noDrinks')}`}
            </Text>
          ) : null}
        </View>

        <View style={styles.side}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.unit}>{unitText(t, listing)}</Text>
          <View style={[styles.badge, isGone ? styles.badgeGone : isLow ? styles.badgeLow : styles.badgeOk]}>
            <Text style={[styles.badgeText, isGone ? styles.badgeTextGone : isLow ? styles.badgeTextLow : styles.badgeTextOk]}>
              {availabilityText(t, listing)}
            </Text>
          </View>
          {distanceKm !== null ? <Text style={styles.unit}>{formatDistance(distanceKm)}</Text> : null}
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
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: 'rgba(22, 20, 19, 0.9)',
    overflow: 'hidden',
    ...shadow.float,
  },
  pressed: { opacity: 0.92 },
  photoWrap: { height: 112, backgroundColor: colors.surfaceRaised },
  photo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  handle: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 253, 247, 0.8)',
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: 'rgba(22, 20, 19, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexDirection: 'row', gap: space.md - 4, paddingHorizontal: space.md, paddingTop: space.md - 4, paddingBottom: space.sm },
  main: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1, fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.text },
  when: {
    flexShrink: 0,
    maxWidth: 130,
    fontFamily: fonts.body,
    fontSize: 10,
    color: 'rgba(22, 20, 19, 0.55)',
    backgroundColor: 'rgba(22, 20, 19, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  muted: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(22, 20, 19, 0.5)' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { fontSize: 11, color: colors.amber },
  dotSep: { fontSize: 11, color: 'rgba(22, 20, 19, 0.2)' },
  small: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(22, 20, 19, 0.55)' },
  description: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: 'rgba(22, 20, 19, 0.6)' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(22, 20, 19, 0.15)',
    backgroundColor: colors.card,
  },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.text },
  drinks: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  drinksYes: { color: colors.leafInk },
  drinksNo: { color: 'rgba(22, 20, 19, 0.4)' },
  side: { alignItems: 'flex-end', gap: 4 },
  price: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  unit: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(22, 20, 19, 0.4)', marginTop: -3 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  badgeOk: { backgroundColor: 'rgba(111, 185, 91, 0.15)' },
  badgeLow: { backgroundColor: 'rgba(245, 165, 36, 0.2)' },
  badgeGone: { backgroundColor: colors.dangerSoft },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 10 },
  badgeTextOk: { color: colors.leafInk },
  badgeTextLow: { color: colors.amberInk },
  badgeTextGone: { color: colors.danger },
  allergens: { paddingHorizontal: space.md, paddingBottom: space.sm },
});
