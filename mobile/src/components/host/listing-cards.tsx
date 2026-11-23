import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Card, Gap, Heading, Label, Muted, Photo, Small, Tag, Title, tagLabel } from '@/components/ui';
import type { Listing } from '@/lib/api';
import { eventStart, formatListingWhen, formatPrice } from '@/lib/format';
import { parsePrice, type Draft } from '@/lib/host-draft';
import { colors, fonts, radius, space, type } from '@/theme';

import { diningLabel } from './labels';

// The listing as a guest would see it, from the draft: the wizard's last step.
export function DraftPreview({ draft }: { draft: Draft }) {
  const { t } = useTranslation();
  const isTable = draft.listingType === 'table';
  const cover = draft.photos[0];
  const price = parsePrice(draft.price) ?? 0;
  const when = formatListingWhen({
    listing_type: draft.listingType,
    meal_time: isTable ? draft.start.toISOString() : null,
    meal_end_time: isTable ? draft.end.toISOString() : null,
    pickup_window_start: isTable ? null : draft.start.toISOString(),
    pickup_window_end: isTable ? null : draft.end.toISOString(),
  });
  return (
    <View>
      <Title>{t('hostNew.review.title')}</Title>
      <Gap size="sm" />
      <Muted>{t('hostNew.review.body')}</Muted>
      <Gap />
      <Card style={styles.previewCard}>
        <Photo uri={cover?.url ?? cover?.localUri} style={styles.previewPhoto} rounded={false} />
        <View style={styles.previewBody}>
          <View style={styles.rowBetween}>
            <Tag title={isTable ? t('listing.table') : t('listing.market')} tone="amber" />
            <Text style={type.price}>
              {formatPrice(price, draft.currency)} <Text style={styles.per}>{isTable ? t('listing.perSeat') : t('listing.perUnit')}</Text>
            </Text>
          </View>
          <Heading>{draft.title.trim()}</Heading>
          <View style={styles.meta}>
            <Icon name="calendar" size={16} color={colors.textMuted} />
            <Small>{when}</Small>
          </View>
          <View style={styles.meta}>
            <Icon name="pin" size={16} color={colors.textMuted} />
            <Small>{draft.area.trim()}</Small>
          </View>
          <View style={styles.meta}>
            <Icon name={isTable ? 'user' : 'bag'} size={16} color={colors.textMuted} />
            <Small>
              {isTable
                ? `${t('listing.seatsLeft', { count: draft.seats })} · ${diningLabel(t, draft.diningSetting)}`
                : t('listing.itemsLeft', { count: draft.quantity })}
            </Small>
          </View>
          {isTable && draft.drinksIncluded && draft.drinks.length > 0 ? (
            <View style={styles.meta}>
              <Icon name="drink" size={16} color={colors.textMuted} />
              <Small>{draft.drinks.map(tagLabel).join(', ')}</Small>
            </View>
          ) : null}
          <Body numberOfLines={5}>{draft.description.trim()}</Body>
          {draft.tags.length + draft.dietary.length + draft.allergens.length > 0 ? (
            <View style={styles.tags}>
              {draft.dietary.map((v) => (
                <Tag key={`d-${v}`} title={tagLabel(v)} tone="leaf" />
              ))}
              {draft.allergens.map((v) => (
                <Tag key={`a-${v}`} title={tagLabel(v)} tone="danger" />
              ))}
              {draft.tags.map((v) => (
                <Tag key={`t-${v}`} title={tagLabel(v)} />
              ))}
            </View>
          ) : null}
        </View>
      </Card>
      <Gap />
      <View style={styles.private}>
        <Icon name="shield" size={18} color={colors.leafDeep} />
        <View style={styles.flex}>
          <Label>{t('hostNew.review.addressLabel')}</Label>
          <Body>{draft.address.trim()}</Body>
          <Small>{t('hostNew.where.addressHelp')}</Small>
        </View>
      </View>
    </View>
  );
}

function isPast(listing: Listing): boolean {
  const end = listing.listing_type === 'table' ? listing.meal_end_time ?? listing.meal_time : listing.pickup_window_end;
  return !!end && new Date(end).getTime() < Date.now();
}

// A host's own listing on the Host tab.
export function HostListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const { t } = useTranslation();
  const isTable = listing.listing_type === 'table';
  const left = (isTable ? listing.seats_available : listing.quantity_available) ?? 0;
  const isFull = listing.status === 'full' || left <= 0;
  const hasEnded = listing.status === 'completed' || isPast(listing);
  return (
    <Card onPress={onPress} style={styles.listCard}>
      <Photo uri={listing.photos[0]} style={styles.thumb} />
      <View style={styles.flex}>
        <Heading numberOfLines={2}>{listing.title}</Heading>
        <Small numberOfLines={1}>{formatListingWhen(listing) || '—'}</Small>
        <View style={styles.statusRow}>
          {hasEnded ? (
            <Tag title={t('host.ended')} />
          ) : isFull ? (
            <Tag title={t('host.full')} tone="amber" />
          ) : (
            <Tag
              title={isTable ? t('listing.seatsLeft', { count: left }) : t('listing.itemsLeft', { count: left })}
              tone="leaf"
            />
          )}
          <Small style={styles.price}>{formatPrice(listing.price_per_unit, listing.currency)}</Small>
        </View>
      </View>
    </Card>
  );
}

export function listingSortKey(listing: Listing): number {
  const start = eventStart(listing);
  const time = start ? new Date(start).getTime() : 0;
  // Upcoming first (soonest first), then past ones (most recent first).
  return isPast(listing) ? Number.MAX_SAFE_INTEGER - time : time;
}

export { isPast as hasListingEnded };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  previewCard: { padding: 0, overflow: 'hidden' },
  previewPhoto: { width: '100%', aspectRatio: 4 / 3 },
  previewBody: { padding: space.md, gap: space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  per: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  private: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.leafSoft },
  listCard: { flexDirection: 'row', gap: space.md, padding: space.sm + 4, alignItems: 'center' },
  thumb: { width: 88, height: 88 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  price: { fontFamily: fonts.bodyBold, color: colors.text },
});
