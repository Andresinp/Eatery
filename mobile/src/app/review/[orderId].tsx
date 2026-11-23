import * as Haptics from 'expo-haptics';
import type { TFunction } from 'i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import {
  Avatar,
  Button,
  Empty,
  ErrorState,
  errorMessage,
  Field,
  Gap,
  Header,
  Loading,
  Muted,
  Screen,
  SignInGate,
  Small,
  Title,
} from '@/components/ui';
import { api, type Order } from '@/lib/api';
import { hasStarted } from '@/lib/bookings-logic';
import { logError } from '@/lib/log';
import { useSession, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, space } from '@/theme';

const MAX_COMMENT = 1000;
const STARS = [1, 2, 3, 4, 5] as const;

type Reviewee = { id: string; name: string | null; avatar: string | null; isHost: boolean };
type Loaded = { order: Order; reviewee: Reviewee; existing: { rating: number; comment: string | null } | null };

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/bookings');
}

export default function ReviewScreen() {
  const { t } = useTranslation();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { state } = useSession();
  const userId = useUserId();
  const header = <Header title={t('review.title')} isModal onBack={close} />;

  if (state.phase === 'loading' || !userId) {
    return (
      <Screen scroll={false} header={header}>
        {state.phase === 'loading' ? <Loading /> : <SignInGate />}
      </Screen>
    );
  }
  return <ReviewLoader orderId={orderId} userId={userId} header={header} />;
}

function ReviewLoader({ orderId, userId, header }: { orderId: string; userId: string; header: React.ReactNode }) {
  const { t } = useTranslation();
  const data = useAsync(async (): Promise<Loaded | null> => {
    const [order, existing] = await Promise.all([api.order(orderId), api.myReviewFor(orderId, userId)]);
    const listing = order?.listing;
    if (!order || !listing) return null;
    let reviewee: Reviewee;
    if (order.guest_id === userId) {
      reviewee = { id: listing.host_id, name: listing.host?.full_name ?? null, avatar: listing.host?.avatar_url ?? null, isHost: true };
    } else if (listing.host_id === userId) {
      reviewee = { id: order.guest_id, name: order.guest?.full_name ?? null, avatar: order.guest?.avatar_url ?? null, isHost: false };
    } else return null;
    return { order, reviewee, existing: existing ? { rating: existing.rating, comment: existing.comment } : null };
  }, [orderId, userId]);

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
        <ErrorState error={data.error} onRetry={() => void data.reload()} />
      </Screen>
    );
  }
  if (!data.data) {
    return (
      <Screen scroll={false} header={header}>
        <Empty icon="star" title={t('review.notFoundTitle')} body={t('review.notFoundBody')} />
      </Screen>
    );
  }
  const { order } = data.data;
  if (!hasStarted(order) || (order.status !== 'confirmed' && order.status !== 'completed')) {
    return (
      <Screen scroll={false} header={header}>
        <Empty icon="clock" title={t('review.notYetTitle')} body={t('errors.too_early')} />
      </Screen>
    );
  }
  return <ReviewForm {...data.data} header={header} />;
}

function ReviewForm({ order, reviewee, existing, header }: Loaded & { header: React.ReactNode }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const name = reviewee.name ?? (reviewee.isHost ? t('review.theHost') : t('review.theGuest'));

  const handleStar = (n: number) => {
    setRating(n);
    setError(null);
    void Haptics.selectionAsync();
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError(t('errors.bad_rating'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await api.submitReview(order.id, rating, comment.trim().slice(0, MAX_COMMENT));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDone(true);
    } catch (submitError) {
      logError('submitReview', submitError);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <Screen scroll={false} header={header}>
        <Empty
          icon="sparkle"
          title={t('review.thanksTitle')}
          body={t('review.thanksBody', { name })}
          action={<Button title={t('common.done')} onPress={close} />}
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={<Button title={existing ? t('review.update') : t('review.submit')} onPress={() => void handleSubmit()} isLoading={isSubmitting} isDisabled={rating < 1} />}>
      <View style={styles.who}>
        <Avatar uri={reviewee.avatar} name={reviewee.name} size={72} />
        <Gap size="sm" />
        <Small>{reviewee.isHost ? t('review.reviewingHost') : t('review.reviewingGuest')}</Small>
        <Title style={styles.center}>{t('review.howWas', { name })}</Title>
        {order.listing ? <Muted style={styles.center}>{order.listing.title}</Muted> : null}
      </View>

      <Gap size="lg" />
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={t('review.ratingLabel')}>
        {STARS.map((n) => {
          const isOn = n <= rating;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={t('review.stars', { count: n })}
              accessibilityState={{ selected: n === rating }}
              hitSlop={4}
              onPress={() => handleStar(n)}
              style={({ pressed }) => [styles.star, pressed && styles.pressed]}>
              <Icon name="star" size={44} color={isOn ? colors.amberDeep : colors.lineStrong} strokeWidth={isOn ? 2.4 : 1.6} />
            </Pressable>
          );
        })}
      </View>
      {rating > 0 ? <Muted style={styles.center}>{ratingWord(t, rating)}</Muted> : <Gap size="lg" />}

      <Field
        label={t('review.commentLabel')}
        placeholder={reviewee.isHost ? t('review.commentPlaceholderHost') : t('review.commentPlaceholderGuest')}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={MAX_COMMENT}
        help={t('review.commentHelp', { count: MAX_COMMENT - comment.length })}
        error={error}
      />
    </Screen>
  );
}

function ratingWord(t: TFunction, rating: number): string {
  switch (rating) {
    case 1:
      return t('review.word1');
    case 2:
      return t('review.word2');
    case 3:
      return t('review.word3');
    case 4:
      return t('review.word4');
    default:
      return t('review.word5');
  }
}

const styles = StyleSheet.create({
  who: { alignItems: 'center', paddingTop: space.md },
  center: { textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  star: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
