import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Photo, Small, Stars } from '@/components/ui';
import type { Listing } from '@/lib/api';
import { isSoldOut } from '@/lib/explore-filter-logic';
import { formatListingWhen, formatPrice } from '@/lib/format';
import { colors, fonts, radius, shadow, space, type } from '@/theme';

import { AllergenWarning, availabilityText, unitText } from './bits';

type Props = { listing: Listing; allergens: string[]; onPress: () => void };

// The card at the bottom of the map for the selected marker.
export function ListingPreview({ listing, allergens, onPress }: Props) {
  const { t } = useTranslation();
  const isGone = isSoldOut(listing);
  const price = formatPrice(listing.price_per_unit, listing.currency);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatListingWhen(listing)}, ${price} ${unitText(t, listing)}`}
      accessibilityHint={t('explore.openListingHint')}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Photo uri={listing.photos[0]} style={styles.photo} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Small numberOfLines={1}>{formatListingWhen(listing)}</Small>
        <View style={styles.host}>
          <Avatar uri={listing.host?.avatar_url} name={listing.host?.full_name} size={20} />
          <Small numberOfLines={1} style={styles.hostName}>
            {listing.host?.full_name ?? ''}
          </Small>
          <Stars rating={listing.host?.host_rating ?? null} size={12} />
        </View>
        <View style={styles.bottom}>
          <Small style={[styles.left, isGone && { color: colors.danger }]}>{availabilityText(t, listing)}</Small>
          <Text style={styles.price}>
            {price}
            <Text style={styles.unit}> {unitText(t, listing)}</Text>
          </Text>
        </View>
        <AllergenWarning allergens={allergens} isCompact />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.sm + 2,
    ...shadow.float,
  },
  pressed: { opacity: 0.85 },
  photo: { width: 104, height: 120 },
  body: { flex: 1, gap: 4, paddingVertical: 2, paddingRight: space.xs },
  title: { ...type.heading, fontSize: 17, lineHeight: 21 },
  host: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hostName: { flexShrink: 1 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' },
  left: { fontFamily: fonts.bodySemi, color: colors.leafDeep },
  price: { ...type.price },
  unit: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
