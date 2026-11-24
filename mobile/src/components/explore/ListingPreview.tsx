import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Photo, tagLabel } from '@/components/ui';
import type { Listing } from '@/lib/api';
import { availableCount, isSoldOut, type Bookability } from '@/lib/explore-filter-logic';
import { formatDistance, formatListingWhen, formatPrice } from '@/lib/format';
import { colors, fonts, radius, shadow, space } from '@/theme';

import { AllergenWarning, availabilityText, bookLabel, drinksText, unitText } from './bits';

type Props = {
  listing: Listing;
  allergens: string[];
  distanceKm: number | null;
  canBook: Bookability;
  onPress: () => void;
  onBook: () => void;
  onClose: () => void;
};

// The card at the bottom of the map for the selected pin: the basics everyone needs before
// opening it — when, where, what food, drinks, price and places left — and a Book button.
export function ListingPreview({ listing, allergens, distanceKm, canBook, onPress, onBook, onClose }: Props) {
  const { t } = useTranslation();
  const isTable = listing.listing_type === 'table';
  const isGone = isSoldOut(listing);
  const isLow = !isGone && availableCount(listing) <= 5;
  const price = formatPrice(listing.price_per_unit, listing.currency);
  const when = formatListingWhen(listing);
  const tags = [...(isTable ? listing.cuisine_tags : listing.product_type_tags), ...listing.dietary_tags].slice(0, isTable ? 2 : 3);
  const rating = listing.host?.host_rating ?? null;
  const isBookable = canBook === 'ok';
  const hasDrinks = listing.drinks_included || listing.drinks.length > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${when}, ${price} ${unitText(t, listing)}, ${availabilityText(t, listing)}`}
      accessibilityHint={t('explore.openListingHint')}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.photoWrap}>
        <Photo uri={listing.photos[0]} style={styles.photo} rounded={false} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} onPress={onClose} style={styles.close}>
          <Icon name="close" size={14} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          {when ? (
            <View style={styles.whenRow}>
              <Icon name="clock" size={14} color={colors.text} />
              <Text style={styles.when} numberOfLines={1}>
                {when}
              </Text>
            </View>
          ) : null}
          <Text style={styles.muted} numberOfLines={1}>
            {rating !== null ? `★ ${rating.toFixed(1)} · ` : ''}
            {distanceKm !== null ? `${formatDistance(distanceKm)} · ` : ''}
            {listing.location_display}
          </Text>
          {tags.length > 0 || isTable ? (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tagLabel(tag)}</Text>
                </View>
              ))}
              {isTable ? (
                <View style={[styles.tag, styles.drinksTag]}>
                  <Text style={[styles.tagText, hasDrinks ? styles.drinksYes : styles.drinksNo]} numberOfLines={1}>
                    {hasDrinks ? '🍷 ' : '🥤 '}
                    {drinksText(t, listing)}
                  </Text>
                </View>
              ) : null}
            </View>
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
        </View>
      </View>

      {/* Pushes the button to the bottom, so every card in the strip is the same height. */}
      <View style={styles.flex} />
      {allergens.length > 0 ? (
        <View style={styles.allergens}>
          <AllergenWarning allergens={allergens} isCompact />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !isBookable }}
        accessibilityLabel={bookLabel(t, listing, canBook)}
        disabled={!isBookable}
        onPress={onBook}
        style={({ pressed }) => [styles.book, !isBookable && styles.bookDisabled, pressed && styles.pressed]}>
        <Text style={[styles.bookText, !isBookable && styles.bookTextDisabled]}>{bookLabel(t, listing, canBook)}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: 'rgba(22, 20, 19, 0.9)',
    overflow: 'hidden',
    ...shadow.float,
  },
  pressed: { opacity: 0.9 },
  flex: { flex: 1 },
  photoWrap: { height: 124, backgroundColor: colors.surfaceRaised },
  photo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: 'rgba(22, 20, 19, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexDirection: 'row',
    gap: space.sm + 4,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
  main: { flex: 1, minWidth: 0, gap: 3 },
  title: {
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
  },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  when: {
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(22, 20, 19, 0.55)',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 1 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(22, 20, 19, 0.15)',
    backgroundColor: colors.card,
  },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.text },
  drinksTag: { flexShrink: 1 },
  drinksYes: { color: colors.leafInk },
  drinksNo: { color: colors.textMuted },
  side: { alignItems: 'flex-end', gap: 3 },
  price: {
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
  },
  unit: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(22, 20, 19, 0.5)',
    marginTop: -3,
  },
  badge: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeOk: { backgroundColor: 'rgba(111, 185, 91, 0.18)' },
  badgeLow: { backgroundColor: 'rgba(245, 165, 36, 0.25)' },
  badgeGone: { backgroundColor: colors.dangerSoft },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  badgeTextOk: { color: colors.leafInk },
  badgeTextLow: { color: colors.amberInk },
  badgeTextGone: { color: colors.danger },
  allergens: { paddingHorizontal: space.md, paddingTop: space.sm },
  book: {
    margin: space.sm,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.lineStrong,
  },
  bookText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.amberInk,
  },
  bookTextDisabled: { color: colors.textMuted },
});
