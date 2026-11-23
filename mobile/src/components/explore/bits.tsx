import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { tagLabel } from '@/components/ui';
import type { Listing } from '@/lib/api';
import { availableCount, isSoldOut } from '@/lib/explore-filter-logic';
import { colors, fonts, radius, space } from '@/theme';

// "3 seats left", "5 left" or "Sold out".
export function availabilityText(t: TFunction, listing: Listing): string {
  if (isSoldOut(listing)) return t('listing.soldOut');
  const count = availableCount(listing);
  return listing.listing_type === 'table' ? t('listing.seatsLeft', { count }) : t('listing.itemsLeft', { count });
}

// "per seat" / "each".
export function unitText(t: TFunction, listing: Pick<Listing, 'listing_type'>): string {
  return listing.listing_type === 'table' ? t('listing.perSeat') : t('listing.perUnit');
}

type AllergenWarningProps = { allergens: string[]; isCompact?: boolean };

// A red strip naming the allergens this listing has that I avoid.
export function AllergenWarning({ allergens, isCompact }: AllergenWarningProps) {
  const { t } = useTranslation();
  if (allergens.length === 0) return null;
  const names = allergens.map(tagLabel).join(', ');
  return (
    <View style={[styles.warning, isCompact && styles.warningCompact]} accessibilityRole="alert">
      <Icon name="alert" size={isCompact ? 14 : 18} color={colors.danger} />
      <Text style={[styles.warningText, isCompact && styles.warningTextCompact]}>{t('explore.containsYourAllergens', { names })}</Text>
    </View>
  );
}

// A small "Table" / "Market" badge.
export function TypeBadge({ listing }: { listing: Pick<Listing, 'listing_type'> }) {
  const { t } = useTranslation();
  const isTable = listing.listing_type === 'table';
  return (
    <View style={[styles.badge, { backgroundColor: isTable ? colors.amberSoft : colors.leafSoft }]}>
      <Icon name={isTable ? 'plate' : 'bag'} size={13} color={isTable ? colors.amberInk : colors.leafInk} />
      <Text style={[styles.badgeText, { color: isTable ? colors.amberInk : colors.leafInk }]}>
        {isTable ? t('listing.table') : t('listing.market')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  warningCompact: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm, gap: space.xs },
  warningText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.danger },
  warningTextCompact: { fontSize: 12, lineHeight: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
