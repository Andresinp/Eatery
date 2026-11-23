import { initPaymentSheet, PaymentSheetError, presentPaymentSheet } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AllergenWarning, availabilityText, unitText } from '@/components/explore/bits';
import { Icon } from '@/components/icons';
import {
  Body,
  Button,
  Card,
  Divider,
  Empty,
  ErrorState,
  errorMessage,
  Gap,
  Header,
  Heading,
  Label,
  Loading,
  Muted,
  Photo,
  Screen,
  SignInGate,
  Small,
  Stepper,
  ToggleRow,
} from '@/components/ui';
import { ApiError, api, type Listing, type Quote } from '@/lib/api';
import { askForPushAfterFirstBooking, waitForOrder } from '@/lib/explore-booking';
import { availableCount, matchingAllergens } from '@/lib/explore-filter-logic';
import { MERCHANT_COUNTRY_CODE, MERCHANT_DISPLAY_NAME, STRIPE_RETURN_URL } from '@/lib/explore-payments';
import { env } from '@/lib/env';
import { formatListingWhen, formatMoney, formatPrice } from '@/lib/format';
import { logError } from '@/lib/log';
import { useMyProfile, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, space, type } from '@/theme';

const NO_ALLERGENS: string[] = [];

export default function BookScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const listing = useAsync(() => api.listing(id), [id]);

  const header = <Header isModal title={t('booking.title')} />;
  if (!userId) {
    return (
      <Screen scroll={false} header={header}>
        <SignInGate body={t('booking.signInBody')} />
      </Screen>
    );
  }
  if (listing.status !== 'ready' || listing.data === null) {
    return (
      <Screen scroll={false} header={header}>
        {listing.status === 'loading' ? (
          <Loading />
        ) : listing.status === 'error' ? (
          <ErrorState error={listing.error} onRetry={listing.reload} />
        ) : (
          <Empty icon="plate" title={t('listingDetail.notFoundTitle')} body={t('listingDetail.notFoundBody')} />
        )}
      </Screen>
    );
  }
  return <Booking listing={listing.data} header={header} />;
}

type QuoteState = { quantity: number; quote: Quote | null; error: unknown };
type Phase = 'idle' | 'paying' | 'confirming' | 'timeout';

function Booking({ listing, header }: { listing: Listing; header: React.ReactElement }) {
  const { t } = useTranslation();
  const profile = useMyProfile();
  const allergens = matchingAllergens(listing, profile?.allergen_exclusions ?? NO_ALLERGENS);
  const [quantity, setQuantity] = useState(1);
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [isAllergenConfirmed, setIsAllergenConfirmed] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [payError, setPayError] = useState<string | null>(null);
  const isPayingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // The server prices every quantity; a response for an older quantity is dropped.
  useEffect(() => {
    let isCurrent = true;
    api.quote(listing.id, quantity).then(
      (quote) => {
        if (isCurrent) setQuoteState({ quantity, quote, error: null });
      },
      (error: unknown) => {
        logError('booking: quote', error);
        if (isCurrent) setQuoteState({ quantity, quote: null, error });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [listing.id, quantity, quoteAttempt]);

  const quote = quoteState?.quote ?? null;
  const isQuoteFresh = quoteState?.quantity === quantity && quote !== null;
  const available = quote?.available ?? availableCount(listing);
  const maxQuantity = Math.max(1, available);
  const notBookableReason = quote && !quote.bookable ? errorMessage(new ApiError(quote.reason ?? 'unknown')) : null;
  const needsAllergenConfirm = allergens.length > 0;
  const isTable = listing.listing_type === 'table';

  const canPay = isQuoteFresh && quote.bookable && (!needsAllergenConfirm || isAllergenConfirmed) && phase === 'idle';

  const handleBooked = (orderId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error: unknown) => logError('booking: haptics', error));
    askForPushAfterFirstBooking();
    router.replace({ pathname: '/order/[id]', params: { id: orderId } });
  };

  const handlePay = async () => {
    if (isPayingRef.current || !canPay) return;
    isPayingRef.current = true;
    setPhase('paying');
    setPayError(null);
    try {
      if (quote.deposit === 0) {
        handleBooked(await api.bookFree(listing.id, quantity));
        return;
      }
      if (!env.stripeKey) {
        setPayError(t('errors.payments_unavailable'));
        return;
      }
      const params = await api.startPayment(listing.id, quantity);
      const init = await initPaymentSheet({
        paymentIntentClientSecret: params.client_secret,
        customerId: params.customer_id,
        customerEphemeralKeySecret: params.ephemeral_key,
        merchantDisplayName: MERCHANT_DISPLAY_NAME,
        returnURL: STRIPE_RETURN_URL,
        allowsDelayedPaymentMethods: false,
        appearance: { colors: { primary: colors.amberDeep } },
        ...(MERCHANT_COUNTRY_CODE
          ? {
              applePay: { merchantCountryCode: MERCHANT_COUNTRY_CODE },
              googlePay: {
                merchantCountryCode: MERCHANT_COUNTRY_CODE,
                currencyCode: params.currency_iso,
                testEnv: env.stripeKey.startsWith('pk_test_'),
              },
            }
          : {}),
      });
      if (init.error) {
        logError('booking: initPaymentSheet', `${init.error.code}: ${init.error.message}`);
        setPayError(t('errors.payments_unavailable'));
        return;
      }
      const result = await presentPaymentSheet();
      if (result.error) {
        // Closing the sheet is a normal answer: stay here, say nothing.
        if (result.error.code !== PaymentSheetError.Canceled) {
          logError('booking: presentPaymentSheet', `${result.error.code}: ${result.error.message}`);
          setPayError(t('booking.paymentFailed'));
        }
        return;
      }
      setPhase('confirming');
      const order = await waitForOrder(params.payment_intent_id, () => !isMountedRef.current);
      if (!isMountedRef.current) return;
      if (order) {
        handleBooked(order.id);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error: unknown) => logError('booking: haptics', error));
        askForPushAfterFirstBooking();
        setPhase('timeout');
      }
    } catch (error) {
      logError('booking: pay', error);
      setPayError(errorMessage(error));
      // Availability may have changed (e.g. sold_out): fetch a fresh quote.
      setQuoteAttempt((n) => n + 1);
    } finally {
      isPayingRef.current = false;
      setPhase((p) => (p === 'paying' ? 'idle' : p));
    }
  };

  if (phase === 'confirming') {
    return (
      <Screen scroll={false} header={header}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.amberDeep} />
          <Gap />
          <Heading style={styles.centerText}>{t('booking.confirmingTitle')}</Heading>
          <Gap size="sm" />
          <Muted style={styles.centerText}>{t('booking.confirmingBody')}</Muted>
        </View>
      </Screen>
    );
  }

  if (phase === 'timeout') {
    return (
      <Screen scroll={false} header={header}>
        <Empty
          icon="check"
          title={t('booking.receivedTitle')}
          body={t('booking.receivedBody')}
          action={<Button title={t('booking.goToBookings')} onPress={() => router.replace('/(tabs)/bookings')} />}
        />
      </Screen>
    );
  }

  const payTitle = !quote
    ? t('booking.pay')
    : quote.deposit === 0
      ? isTable
        ? t('booking.confirmBooking')
        : t('booking.confirmOrder')
      : t('booking.payDeposit', { amount: formatMoney(quote.deposit, quote.currency) });

  return (
    <Screen
      header={header}
      footer={
        <>
          {payError ? (
            <Small style={styles.error}>
              {payError}
            </Small>
          ) : null}
          <Button title={payTitle} onPress={() => void handlePay()} isDisabled={!canPay} isLoading={phase === 'paying'} />
        </>
      }>
      <View style={styles.summary}>
        <Photo uri={listing.photos[0]} style={styles.photo} />
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>
          <Small numberOfLines={1}>{formatListingWhen(listing)}</Small>
          <Small numberOfLines={1}>{listing.host?.full_name ?? ''}</Small>
        </View>
      </View>

      <Gap size="lg" />
      <View style={styles.quantityRow}>
        <View style={styles.flex}>
          <Body style={styles.bold}>{isTable ? t('booking.seats') : t('booking.quantity')}</Body>
          <Small>
            {formatPrice(listing.price_per_unit, listing.currency)} {unitText(t, listing)} · {availabilityText(t, listing)}
          </Small>
        </View>
        <Stepper value={quantity} max={maxQuantity} onChange={setQuantity} label={isTable ? t('booking.seats') : t('booking.quantity')} />
      </View>

      <Gap size="lg" />
      <Card>
        {quoteState === null ? (
          <View style={styles.quoteLoading}>
            <ActivityIndicator color={colors.amberDeep} />
          </View>
        ) : quote === null ? (
          <View style={styles.quoteError}>
            <Muted style={styles.centerText}>{errorMessage(quoteState.error)}</Muted>
            <Button title={t('common.retry')} variant="outline" onPress={() => setQuoteAttempt((n) => n + 1)} />
          </View>
        ) : (
          <View style={[!isQuoteFresh && styles.stale]} accessibilityLiveRegion="polite">
            <Line label={t('booking.total')} value={formatMoney(quote.total, quote.currency)} />
            <Divider />
            <Line label={t('booking.payNow')} help={t('booking.payNowHelp')} value={formatMoney(quote.deposit, quote.currency)} isStrong />
            <Gap size="sm" />
            <Line label={t('booking.payHost')} help={t('booking.payHostHelp')} value={formatMoney(quote.balance, quote.currency)} />
          </View>
        )}
      </Card>

      {notBookableReason ? (
        <>
          <Gap />
          <View style={styles.reason}>
            <Icon name="alert" size={18} color={colors.danger} />
            <Body style={styles.reasonText}>{notBookableReason}</Body>
          </View>
        </>
      ) : null}

      <Gap />
      <View style={styles.note}>
        <Icon name="info" size={18} color={colors.textMuted} />
        <Small style={styles.flex}>{quote && quote.deposit === 0 ? t('booking.freeExplainer') : t('booking.depositExplainer')}</Small>
      </View>

      {needsAllergenConfirm ? (
        <>
          <Gap size="lg" />
          <AllergenWarning allergens={allergens} />
          <ToggleRow title={t('booking.allergenConfirm')} help={t('booking.allergenConfirmHelp')} value={isAllergenConfirmed} onChange={setIsAllergenConfirmed} />
        </>
      ) : null}
      <Gap size="lg" />
      <Label>{t('booking.secureNote')}</Label>
    </Screen>
  );
}

type LineProps = { label: string; value: string; help?: string; isStrong?: boolean };

function Line({ label, value, help, isStrong }: LineProps) {
  return (
    <View style={styles.line}>
      <View style={styles.flex}>
        <Body style={isStrong ? styles.bold : undefined}>{label}</Body>
        {help ? <Small>{help}</Small> : null}
      </View>
      <Text style={[styles.value, isStrong && styles.valueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  centerText: { textAlign: 'center' },
  summary: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  photo: { width: 76, height: 76 },
  title: { ...type.heading },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  quoteLoading: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  quoteError: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: space.md },
  stale: { opacity: 0.5 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  value: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  valueStrong: { ...type.price },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md },
  reasonText: { flex: 1, color: colors.danger },
  note: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  error: { color: colors.danger, textAlign: 'center' },
});
