import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';

import { hasListingEnded } from '@/components/host/listing-cards';
import { statusLabel } from '@/components/host/labels';
import { Icon } from '@/components/icons';
import {
  Avatar,
  Body,
  Button,
  Card,
  Empty,
  ErrorState,
  errorMessage,
  Gap,
  Header,
  Heading,
  IconButton,
  Label,
  Loading,
  Muted,
  Photo,
  Screen,
  Section,
  SignInGate,
  Small,
  Tag,
  Title,
} from '@/components/ui';
import { api, type Listing, type Order } from '@/lib/api';
import { eventStart, formatListingWhen, formatMoney, formatPrice } from '@/lib/format';
import { logError } from '@/lib/log';
import { useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, space } from '@/theme';

function hasEventStarted(listing: Listing): boolean {
  const start = eventStart(listing);
  return !!start && new Date(start).getTime() <= Date.now();
}

type GuestProps = {
  order: Order;
  hasStarted: boolean;
  isBusy: boolean;
  onDone: () => void;
  onNoShow: () => void;
  onCancel: () => void;
};

function GuestCard({ order, hasStarted, isBusy, onDone, onNoShow, onCancel }: GuestProps) {
  const { t } = useTranslation();
  const name = order.guest?.full_name ?? t('hostManage.guest');
  const isConfirmed = order.status === 'confirmed';
  const guestId = order.guest?.id;
  return (
    <Card>
      <View style={styles.guestTop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('hostManage.openProfile', { name })}
          disabled={!guestId}
          onPress={() => guestId && router.push({ pathname: '/user/[id]', params: { id: guestId } })}
          style={({ pressed }) => [styles.guestWho, pressed && styles.pressed]}>
          <Avatar uri={order.guest?.avatar_url} name={name} />
          <View style={styles.flex}>
            <Heading numberOfLines={1}>{name}</Heading>
            <Small>
              {order.listing_type === 'table'
                ? t('hostManage.seats', { count: order.quantity })
                : t('hostManage.items', { count: order.quantity })}
            </Small>
          </View>
        </Pressable>
        <Tag title={statusLabel(t, order.status)} tone={isConfirmed ? 'leaf' : order.status === 'completed' ? 'amber' : 'neutral'} />
      </View>
      <View style={styles.money}>
        <View style={styles.flex}>
          <Label>{t('hostManage.depositPaid')}</Label>
          <Body>{formatMoney(order.deposit_paid, order.currency)}</Body>
        </View>
        <View style={styles.flex}>
          <Label>{t('hostManage.toCollect')}</Label>
          <Text style={styles.collect}>{isConfirmed ? formatMoney(order.balance_due, order.currency) : '—'}</Text>
        </View>
      </View>
      {isConfirmed ? (
        <View style={styles.actions}>
          <Button
            title={t('hostManage.chat')}
            variant="outline"
            icon={<Icon name="chat" size={18} color={colors.text} />}
            onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: order.id } })}
          />
          {hasStarted ? (
            <>
              <Button title={t('hostManage.markDone')} variant="dark" isLoading={isBusy} onPress={onDone} />
              <Button title={t('hostManage.noShow')} variant="ghost" isDisabled={isBusy} onPress={onNoShow} />
            </>
          ) : (
            <Button title={t('hostManage.cancelBooking')} variant="ghost" isLoading={isBusy} onPress={onCancel} />
          )}
        </View>
      ) : (
        <View style={styles.actions}>
          <Button
            title={t('hostManage.viewBooking')}
            variant="ghost"
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
          />
        </View>
      )}
    </Card>
  );
}

type LoadedProps = { listing: Listing; orders: Order[]; address: string | null; onReload: () => Promise<void>; isRefreshing: boolean };

function ManageListing({ listing, orders, address, onReload, isRefreshing }: LoadedProps) {
  const { t } = useTranslation();
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const isTable = listing.listing_type === 'table';
  const hasStarted = hasEventStarted(listing);
  const hasEnded = hasListingEnded(listing);
  const isOpen = listing.status === 'active' || listing.status === 'full';
  const total = (isTable ? listing.seats_total : listing.quantity_total) ?? 0;
  const left = (isTable ? listing.seats_available : listing.quantity_available) ?? 0;
  const confirmed = orders.filter((o) => o.status === 'confirmed');
  const others = orders.filter((o) => o.status !== 'confirmed');

  const runOrderAction = async (orderId: string, action: () => Promise<unknown>, where: string) => {
    setBusyOrder(orderId);
    try {
      await action();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onReload();
    } catch (error) {
      logError(where, error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setBusyOrder(null);
    }
  };

  const handleDone = (order: Order) => void runOrderAction(order.id, () => api.markOrderDone(order.id), 'markOrderDone');

  const handleNoShow = (order: Order) => {
    Alert.alert(t('hostManage.noShowTitle'), t('hostManage.noShowBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('hostManage.noShowConfirm'),
        style: 'destructive',
        onPress: () => void runOrderAction(order.id, () => api.cancelOrder(order.id, 'no_show_guest'), 'cancelOrder no_show'),
      },
    ]);
  };

  const handleCancelBooking = (order: Order) => {
    Alert.alert(t('hostManage.cancelBookingTitle'), t('hostManage.cancelBookingBody'), [
      { text: t('hostManage.keep'), style: 'cancel' },
      {
        text: t('hostManage.cancelBookingConfirm'),
        style: 'destructive',
        onPress: () => void runOrderAction(order.id, () => api.cancelOrder(order.id, 'by_host'), 'cancelOrder by_host'),
      },
    ]);
  };

  const cancelListing = async () => {
    setIsCancelling(true);
    try {
      await api.cancelListing(listing.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissTo('/(tabs)/host');
    } catch (error) {
      logError('cancelListing', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelListing = () => {
    Alert.alert(
      t('hostManage.cancelListingTitle'),
      confirmed.length > 0 ? t('hostManage.cancelListingBodyGuests', { count: confirmed.length }) : t('hostManage.cancelListingBody'),
      [
        { text: t('hostManage.keep'), style: 'cancel' },
        { text: t('hostManage.cancelListingConfirm'), style: 'destructive', onPress: () => void cancelListing() },
      ],
    );
  };

  const handleShare = async () => {
    try {
      const url = `https://eatery.app/listing/${listing.id}`;
      await Share.share({ message: t('hostManage.shareMessage', { title: listing.title, when: formatListingWhen(listing), url }) });
    } catch (error) {
      logError('share listing', error);
    }
  };

  return (
    <Screen
      header={
        <Header
          title={isTable ? t('listing.table') : t('listing.market')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/host'))}
          right={<IconButton name="share" label={t('common.share')} onPress={() => void handleShare()} />}
        />
      }
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void onReload()} tintColor={colors.amberDeep} />}>
      <Photo uri={listing.photos[0]} style={styles.cover} />
      <Gap />
      <Title>{listing.title}</Title>
      <Gap size="sm" />
      <View style={styles.tagRow}>
        {listing.status === 'cancelled' ? (
          <Tag title={t('hostManage.statusCancelled')} />
        ) : hasEnded || listing.status === 'completed' ? (
          <Tag title={t('host.ended')} />
        ) : listing.status === 'full' || left <= 0 ? (
          <Tag title={t('host.full')} tone="amber" />
        ) : (
          <Tag title={t('hostManage.statusOpen')} tone="leaf" />
        )}
        <Small>{formatPrice(listing.price_per_unit, listing.currency)} {isTable ? t('listing.perSeat') : t('listing.perUnit')}</Small>
      </View>
      <Gap />
      <Card>
        <View style={styles.fact}>
          <Icon name="calendar" size={18} color={colors.textMuted} />
          <Body style={styles.flex}>{formatListingWhen(listing)}</Body>
        </View>
        <View style={styles.fact}>
          <Icon name={isTable ? 'user' : 'bag'} size={18} color={colors.textMuted} />
          <Body style={styles.flex}>
            {isTable ? t('hostManage.seatsBooked', { booked: total - left, total }) : t('hostManage.itemsOrdered', { booked: total - left, total })}
          </Body>
        </View>
        <View style={styles.fact}>
          <Icon name="pin" size={18} color={colors.textMuted} />
          <View style={styles.flex}>
            <Body>{listing.location_display}</Body>
            {address ? <Small>{address}</Small> : null}
            <Small style={styles.faint}>{t('hostManage.addressPrivate')}</Small>
          </View>
        </View>
      </Card>

      {isOpen && !hasEnded ? (
        <>
          <Gap />
          <Button
            title={t('common.edit')}
            variant="outline"
            onPress={() => router.push({ pathname: '/host/edit/[id]', params: { id: listing.id } })}
          />
        </>
      ) : null}

      <Section label={isTable ? t('hostManage.guests') : t('hostManage.orders')}>
        {orders.length === 0 ? (
          <View style={styles.noGuests}>
            <Muted>{isTable ? t('hostManage.noGuests') : t('hostManage.noOrders')}</Muted>
          </View>
        ) : (
          <>
            {confirmed.length > 0 && !hasStarted ? <Small>{t('hostManage.collectNote')}</Small> : null}
            {[...confirmed, ...others].map((order) => (
              <GuestCard
                key={order.id}
                order={order}
                hasStarted={hasStarted}
                isBusy={busyOrder === order.id}
                onDone={() => handleDone(order)}
                onNoShow={() => handleNoShow(order)}
                onCancel={() => handleCancelBooking(order)}
              />
            ))}
          </>
        )}
      </Section>

      {isOpen && !hasStarted ? (
        <>
          <Gap size="xl" />
          <Button title={t('hostManage.cancelListing')} variant="danger" isLoading={isCancelling} onPress={handleCancelListing} />
          <Small style={styles.cancelHelp}>{t('hostManage.cancelListingHelp')}</Small>
        </>
      ) : null}
    </Screen>
  );
}

export default function HostListingScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const data = useAsync(async () => {
    if (!userId || !id) return null;
    const listing = await api.listing(id);
    if (!listing || listing.host_id !== userId) return null;
    const [orders, address] = await Promise.all([api.ordersForListing(id), api.listingAddress(id)]);
    return { listing, orders, address };
  }, [id, userId]);

  // Back from editing or from a chat: show what changed.
  const isFirstFocus = useRef(true);
  const { reload } = data;
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );

  if (!userId) {
    return (
      <Screen scroll={false} header={<Header />}>
        <SignInGate title={t('host.signedOutTitle')} body={t('host.signedOutBody')} />
      </Screen>
    );
  }
  if (data.status === 'loading') {
    return (
      <Screen scroll={false} header={<Header />}>
        <Loading />
      </Screen>
    );
  }
  if (data.status === 'error') {
    return (
      <Screen scroll={false} header={<Header />}>
        <ErrorState error={data.error} onRetry={() => void data.reload()} />
      </Screen>
    );
  }
  if (!data.data) {
    return (
      <Screen scroll={false} header={<Header />}>
        <Empty icon="alert" title={t('hostManage.notFound')} body={t('hostManage.notFoundBody')} />
      </Screen>
    );
  }
  return <ManageListing {...data.data} onReload={data.reload} isRefreshing={data.isRefreshing} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  cover: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.lg },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fact: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm, alignItems: 'flex-start' },
  faint: { color: colors.textFaint },
  noGuests: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
  guestTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  guestWho: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  money: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  collect: { fontFamily: fonts.displayHeavy, fontSize: 17, color: colors.leafDeep },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  cancelHelp: { marginTop: space.sm, textAlign: 'center' },
});
