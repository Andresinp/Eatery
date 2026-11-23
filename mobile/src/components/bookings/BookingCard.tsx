import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Muted, Photo, Small } from '@/components/ui';
import type { Order } from '@/lib/api';
import { formatListingWhen, formatMoney } from '@/lib/format';
import { colors, fonts, radius, space, type } from '@/theme';

import { StatusBadge } from './status';

type Props = { order: Order; onPress: () => void };

export function BookingCard({ order, onPress }: Props) {
  const { t } = useTranslation();
  const listing = order.listing;
  const isTable = order.listing_type === 'table';
  const isConfirmed = order.status === 'confirmed';
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.clip}>
      <Photo uri={listing?.photos[0]} style={styles.photo} rounded={false} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <StatusBadge status={order.status} />
          <Small>{isTable ? t('bookings.seats', { count: order.quantity }) : t('bookings.items', { count: order.quantity })}</Small>
        </View>
        <Text style={type.heading} numberOfLines={2}>
          {listing?.title ?? t('bookings.unavailableListing')}
        </Text>
        {listing ? <Muted numberOfLines={1}>{formatListingWhen(listing)}</Muted> : null}
        <View style={styles.money}>
          <Small>{t('bookings.depositPaid', { amount: formatMoney(order.deposit_paid, order.currency) })}</Small>
          {isConfirmed && order.balance_due > 0 ? (
            <Text style={styles.balance}>{t('bookings.balanceInPerson', { amount: formatMoney(order.balance_due, order.currency) })}</Text>
          ) : null}
        </View>
      </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0 },
  clip: { borderRadius: radius.lg, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 16 / 9 },
  body: { padding: space.md, gap: space.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  money: { marginTop: space.sm, gap: 2 },
  balance: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.amberInk },
});
