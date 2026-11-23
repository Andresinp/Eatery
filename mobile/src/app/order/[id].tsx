import * as Calendar from 'expo-calendar/legacy';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/bookings/status';
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
  IconButton,
  Label,
  Loading,
  Muted,
  Photo,
  Row,
  Screen,
  SignInGate,
  Small,
  Title,
} from '@/components/ui';
import { api, type Order } from '@/lib/api';
import { canGuestCancel, hasEnded, hasStarted, orderEnd, orderStart } from '@/lib/bookings-logic';
import { confirm, showMenu } from '@/lib/bookings-menu';
import { decideCancellation } from '@/lib/cancellation';
import { formatListingWhen, formatMoney } from '@/lib/format';
import { logError } from '@/lib/log';
import { useSession, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, space, type } from '@/theme';

type Role = 'guest' | 'host';

export default function OrderScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useSession();
  const userId = useUserId();

  if (state.phase === 'loading') {
    return (
      <Screen scroll={false} header={<Header title={t('order.title')} />}>
        <Loading />
      </Screen>
    );
  }
  if (!userId) {
    return (
      <Screen scroll={false} header={<Header title={t('order.title')} />}>
        <SignInGate />
      </Screen>
    );
  }
  return <OrderLoader orderId={id} userId={userId} />;
}

type Loaded = { order: Order; role: Role; hasReviewed: boolean };

function OrderLoader({ orderId, userId }: { orderId: string; userId: string }) {
  const { t } = useTranslation();
  const data = useAsync(async (): Promise<Loaded | null> => {
    const order = await api.order(orderId);
    if (!order?.listing) return null;
    const role: Role | null = order.guest_id === userId ? 'guest' : order.listing.host_id === userId ? 'host' : null;
    if (!role) return null;
    const review = await api.myReviewFor(orderId, userId);
    return { order, role, hasReviewed: review !== null };
  }, [orderId, userId]);
  const { reload } = data;

  // Back from the review or the chat: refresh, but not on the first focus.
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) void reload();
      hasFocused.current = true;
    }, [reload]),
  );

  const header = <Header title={t('order.title')} />;
  if (data.status === 'loading') {
    return (
      <Screen scroll={false} header={header}>
        <Loading />
      </Screen>
    );
  }
  if (data.status === 'error') {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={data.error} onRetry={() => void reload()} />
      </Screen>
    );
  }
  if (!data.data) {
    return (
      <Screen scroll={false} header={header}>
        <Empty icon="ticket" title={t('order.notFoundTitle')} body={t('order.notFoundBody')} />
      </Screen>
    );
  }
  return <OrderDetail {...data.data} isRefreshing={data.isRefreshing} onReload={reload} />;
}

type DetailProps = Loaded & { isRefreshing: boolean; onReload: () => Promise<void> };

function OrderDetail({ order, role, hasReviewed, isRefreshing, onReload }: DetailProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'cancel' | 'done' | 'calendar' | null>(null);
  const listing = order.listing;
  if (!listing) return null; // OrderLoader never passes an order without its listing

  const isGuest = role === 'guest';
  const other = isGuest
    ? { id: listing.host_id, name: listing.host?.full_name ?? null, avatar: listing.host?.avatar_url ?? null }
    : { id: order.guest_id, name: order.guest?.full_name ?? null, avatar: order.guest?.avatar_url ?? null };
  const otherName = other.name ?? (isGuest ? t('order.theHost') : t('order.theGuest'));

  const start = orderStart(order);
  const isConfirmed = order.status === 'confirmed';
  const isStarted = hasStarted(order);
  const isEnded = hasEnded(order);
  const hasMarkedDone = isGuest ? order.guest_confirmed : order.host_confirmed;
  const canCancel = isGuest && canGuestCancel(order);
  const canMarkDone = isConfirmed && isStarted && !hasMarkedDone;
  const canReview = (isConfirmed || order.status === 'completed') && isStarted && !hasReviewed;
  const canAddToCalendar = isConfirmed && !isEnded && start !== null;

  const handleMore = () =>
    showMenu([
      {
        label: t('common.report'),
        isDestructive: true,
        onPress: () => router.push({ pathname: '/report', params: { userId: other.id, orderId: order.id } }),
      },
    ]);

  const handleCancel = async () => {
    if (!start) return;
    const outcome = decideCancellation('by_guest', start);
    const deposit = formatMoney(order.deposit_paid, order.currency);
    const message =
      order.deposit_paid <= 0
        ? t('order.cancelNoDeposit')
        : outcome.refundDeposit
          ? t('order.cancelRefund', { amount: deposit })
          : t('order.cancelNoRefund', { amount: deposit });
    const isSure = await confirm({ title: t('order.cancelTitle'), message, confirmLabel: t('order.cancelConfirm'), isDestructive: true });
    if (!isSure) return;
    setBusy('cancel');
    try {
      const result = await api.cancelOrder(order.id, 'by_guest');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('order.cancelledTitle'),
        result.refunded
          ? t('order.cancelledRefunded', { amount: formatMoney(result.deposit_refunded, order.currency) })
          : t('order.cancelledNotRefunded'),
      );
      await onReload();
    } catch (error) {
      logError('cancelOrder', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('order.cancelFailed'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const handleMarkDone = async () => {
    setBusy('done');
    try {
      const status = await api.markOrderDone(order.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('order.doneTitle'), status === 'completed' ? t('order.doneCompleted') : t('order.doneWaiting', { name: otherName }));
      await onReload();
    } catch (error) {
      logError('markOrderDone', error);
      Alert.alert(t('order.doneFailed'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const handleCalendar = async () => {
    if (!start) return;
    setBusy('calendar');
    try {
      const end = orderEnd(order) ?? start;
      const address = await api.listingAddress(listing.id).catch((error: unknown) => {
        // The public area still places the event; the exact address is a nice-to-have here.
        logError('listingAddress (calendar)', error);
        return null;
      });
      await Calendar.createEventInCalendarAsync({
        title: listing.title,
        startDate: new Date(start),
        endDate: new Date(end === start ? new Date(start).getTime() + 2 * 3600_000 : end),
        location: address ?? listing.location_display,
        notes: t('order.calendarNotes', { name: otherName }),
      });
    } catch (error) {
      logError('createEventInCalendarAsync', error);
      Alert.alert(t('order.calendarFailed'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      header={<Header title={t('order.title')} right={<IconButton name="more" label={t('order.more')} onPress={handleMore} />} />}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void onReload()} tintColor={colors.amberDeep} />}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('order.openListing', { title: listing.title })}
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
        style={({ pressed }) => pressed && styles.pressed}>
        <Photo uri={listing.photos[0]} style={styles.hero} />
        <Gap />
        <View style={styles.statusRow}>
          <StatusBadge status={order.status} />
          <Small>{isGuest ? t('order.youBooked') : t('order.yourGuest')}</Small>
        </View>
        <Gap size="sm" />
        <Title>{listing.title}</Title>
        <Gap size="xs" />
        <View style={styles.whenRow}>
          <Icon name="calendar" size={16} color={colors.textMuted} />
          <Muted>{formatListingWhen(listing)}</Muted>
        </View>
      </Pressable>

      <StatusNote order={order} role={role} otherName={otherName} />

      <Gap size="lg" />
      <Card>
        <Row
          title={order.listing_type === 'table' ? t('order.seats', { count: order.quantity }) : t('order.items', { count: order.quantity })}
          left={<Icon name={order.listing_type === 'table' ? 'plate' : 'bag'} size={20} color={colors.amberDeep} />}
        />
        <View style={styles.moneyRow}>
          <Body>{t('order.depositPaid')}</Body>
          <Text style={styles.amount}>{formatMoney(order.deposit_paid, order.currency)}</Text>
        </View>
        {order.deposit_refunded ? <Small style={styles.leafNote}>{t('order.depositRefunded')}</Small> : null}
        <View style={styles.moneyRow}>
          <Body style={styles.flex}>{isGuest ? t('order.balanceGuest', { name: otherName }) : t('order.balanceHost')}</Body>
          <Text style={[styles.amount, styles.balance]}>{formatMoney(order.balance_due, order.currency)}</Text>
        </View>
        <Small>{isGuest ? t('order.balanceGuestHelp') : t('order.balanceHostHelp')}</Small>
      </Card>

      {isConfirmed ? <AddressCard listingId={listing.id} fallback={listing.location_display} /> : null}

      <Gap size="lg" />
      <Label>{isGuest ? t('order.yourHost') : t('order.yourGuestLabel')}</Label>
      <Row
        title={otherName}
        subtitle={t('order.viewProfile')}
        left={<Avatar uri={other.avatar} name={other.name} />}
        onPress={() => router.push({ pathname: '/user/[id]', params: { id: other.id } })}
      />

      <Gap size="lg" />
      <View style={styles.actions}>
        <Button
          title={t('order.chat', { name: otherName })}
          variant="dark"
          icon={<Icon name="chat" size={18} color={colors.bg} />}
          onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: order.id } })}
        />
        {canReview ? (
          <Button
            title={isGuest ? t('order.reviewHost') : t('order.reviewGuest')}
            icon={<Icon name="star" size={18} color={colors.amberInk} />}
            onPress={() => router.push({ pathname: '/review/[orderId]', params: { orderId: order.id } })}
          />
        ) : null}
        {canMarkDone ? (
          <Button
            title={t('order.markDone')}
            variant="outline"
            isLoading={busy === 'done'}
            isDisabled={busy !== null}
            icon={<Icon name="check" size={18} color={colors.text} />}
            onPress={() => void handleMarkDone()}
          />
        ) : null}
        {isConfirmed && isStarted && hasMarkedDone ? <Small style={styles.center}>{t('order.markedDone', { name: otherName })}</Small> : null}
        {canAddToCalendar ? (
          <Button
            title={t('order.addToCalendar')}
            variant="outline"
            isLoading={busy === 'calendar'}
            isDisabled={busy !== null}
            icon={<Icon name="calendar" size={18} color={colors.text} />}
            onPress={() => void handleCalendar()}
          />
        ) : null}
        {canCancel ? (
          <Button
            title={t('order.cancel')}
            variant="danger"
            isLoading={busy === 'cancel'}
            isDisabled={busy !== null}
            onPress={() => void handleCancel()}
          />
        ) : null}
      </View>
      {canCancel ? <Small style={[styles.center, styles.policy]}>{t('order.cancelPolicy')}</Small> : null}
    </Screen>
  );
}

// Why a booking is no longer on, in words.
function StatusNote({ order, role, otherName }: { order: Order; role: Role; otherName: string }) {
  const { t } = useTranslation();
  const isGuest = role === 'guest';
  let text: string | null = null;
  switch (order.status) {
    case 'cancelled_by_guest':
      text = isGuest ? t('order.noteCancelledByYou') : t('order.noteCancelledByGuest', { name: otherName });
      break;
    case 'cancelled_by_host':
      text = isGuest ? t('order.noteCancelledByHost', { name: otherName }) : t('order.noteCancelledByYouHost');
      break;
    case 'no_show_guest':
      text = isGuest ? t('order.noteNoShowYou') : t('order.noteNoShowGuest', { name: otherName });
      break;
    case 'no_show_host':
      text = isGuest ? t('order.noteNoShowHost', { name: otherName }) : t('order.noteNoShowYouHost');
      break;
    case 'completed':
      text = t('order.noteCompleted');
      break;
    case 'confirmed':
      text = null;
      break;
  }
  if (!text) return null;
  const isBad = order.status !== 'completed';
  return (
    <View style={[styles.note, isBad ? styles.noteBad : styles.noteGood]}>
      <Icon name={isBad ? 'info' : 'check'} size={18} color={isBad ? colors.danger : colors.leafInk} />
      <Body style={styles.flex}>{text}</Body>
    </View>
  );
}

function AddressCard({ listingId, fallback }: { listingId: string; fallback: string }) {
  const { t } = useTranslation();
  const address = useAsync(() => api.listingAddress(listingId), [listingId]);

  const handleOpenMaps = (query: string) => {
    const encoded = encodeURIComponent(query);
    const url = Platform.OS === 'ios' ? `https://maps.apple.com/?q=${encoded}` : `geo:0,0?q=${encoded}`;
    Linking.openURL(url).catch((error: unknown) => {
      logError('openMaps', error);
      Alert.alert(t('order.mapsFailed'));
    });
  };

  return (
    <>
      <Gap size="lg" />
      <Card>
        <View style={styles.addressHead}>
          <Icon name="pin" size={20} color={colors.amberDeep} />
          <Label>{t('order.address')}</Label>
        </View>
        <Gap size="sm" />
        {address.status === 'loading' ? (
          <Muted>{t('common.loading')}</Muted>
        ) : address.status === 'error' ? (
          <View style={styles.addressError}>
            <Muted style={styles.flex}>{errorMessage(address.error)}</Muted>
            <Button title={t('common.retry')} variant="ghost" onPress={() => void address.reload()} />
          </View>
        ) : (
          <>
            <Body>{address.data ?? fallback}</Body>
            {address.data ? null : <Small>{t('order.addressPending')}</Small>}
            <Gap size="sm" />
            <Button
              title={t('order.openInMaps')}
              variant="outline"
              icon={<Icon name="map" size={18} color={colors.text} />}
              onPress={() => handleOpenMaps(address.data ?? fallback)}
            />
          </>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  center: { textAlign: 'center' },
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  moneyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingTop: space.md },
  amount: { ...type.price, fontSize: 16 },
  balance: { color: colors.amberInk },
  leafNote: { color: colors.leafInk, marginTop: 2 },
  note: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, marginTop: space.md },
  noteBad: { backgroundColor: colors.dangerSoft },
  noteGood: { backgroundColor: colors.leafSoft },
  addressHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addressError: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.sm },
  policy: { marginTop: space.sm, fontFamily: fonts.body },
});
