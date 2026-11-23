import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { showActionSheet } from '@/components/account/action-sheet';
import { Icon } from '@/components/icons';
import {
  Avatar,
  Body,
  Card,
  Empty,
  ErrorState,
  Header,
  IconButton,
  Loading,
  Muted,
  Photo,
  Screen,
  Section,
  Small,
  Stars,
  Tag,
  Title,
  errorMessage,
} from '@/components/ui';
import { formatMonthYear } from '@/lib/account-format';
import { api, type Listing, type PublicProfile, type Review } from '@/lib/api';
import { formatListingWhen, formatPrice, formatRelative } from '@/lib/format';
import { logError } from '@/lib/log';
import { useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, space, type } from '@/theme';

type Data = { profile: PublicProfile | null; listings: Listing[]; reviews: Review[] };

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const me = useUserId();
  const data = useAsync<Data>(async () => {
    const [profile, listings, reviews] = await Promise.all([api.profile(id), api.listingsByHost(id), api.reviewsAbout(id)]);
    return { profile, listings: listings.filter((l) => l.status === 'active' || l.status === 'full'), reviews };
  }, [id]);

  const canModerate = me !== null && me !== id;
  const name = data.status === 'ready' ? (data.data.profile?.full_name ?? t('user.someone')) : '';

  const doBlock = async () => {
    if (!me) return;
    try {
      await api.block(me, id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/explore');
    } catch (error) {
      logError('block', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    }
  };

  const handleBlock = () => {
    Alert.alert(t('user.blockConfirmTitle', { name }), t('user.blockConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.block'), style: 'destructive', onPress: () => void doBlock() },
    ]);
  };

  const handleMore = () => {
    showActionSheet({
      title: name,
      cancelLabel: t('common.cancel'),
      actions: [
        { label: t('common.report'), onPress: () => router.push({ pathname: '/report', params: { userId: id } }) },
        { label: t('common.block'), onPress: handleBlock, isDestructive: true },
      ],
    });
  };

  const header = (
    <Header
      right={
        canModerate && data.status === 'ready' && data.data.profile ? (
          <IconButton name="more" label={t('user.moreActions')} onPress={handleMore} />
        ) : undefined
      }
    />
  );

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
  const { profile, listings, reviews } = data.data;
  if (!profile) {
    return (
      <Screen scroll={false} header={header}>
        <Empty icon="user" title={t('user.notFoundTitle')} body={t('user.notFoundBody')} />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      refreshControl={<RefreshControl refreshing={data.isRefreshing} onRefresh={() => void data.reload()} tintColor={colors.amberDeep} />}>
      <View style={styles.top}>
        <Avatar uri={profile.avatar_url} name={name} size={104} />
        <Title style={styles.center} numberOfLines={2}>
          {name}
        </Title>
        {profile.identity_verified ? (
          <View style={styles.verified}>
            <Icon name="shield" size={14} color={colors.leafInk} />
            <Small style={styles.verifiedText}>{t('listing.verifiedHost')}</Small>
          </View>
        ) : null}
        <Small>{t('profile.memberSince', { date: formatMonthYear(profile.created_at) })}</Small>
      </View>

      <View style={styles.ratings}>
        <Card style={styles.ratingTile}>
          <Small>{t('profile.hostRating')}</Small>
          {profile.host_rating === null ? <Muted>{t('profile.noRatingYet')}</Muted> : <Stars rating={profile.host_rating} size={18} />}
        </Card>
        <Card style={styles.ratingTile}>
          <Small>{t('profile.guestRating')}</Small>
          {profile.guest_rating === null ? <Muted>{t('profile.noRatingYet')}</Muted> : <Stars rating={profile.guest_rating} size={18} />}
        </Card>
      </View>

      {profile.cancellation_count > 0 || profile.no_show_count > 0 ? (
        <View style={styles.record}>
          {profile.cancellation_count > 0 ? <Tag title={t('user.cancellations', { count: profile.cancellation_count })} /> : null}
          {profile.no_show_count > 0 ? <Tag title={t('user.noShows', { count: profile.no_show_count })} /> : null}
        </View>
      ) : null}

      {profile.bio ? (
        <Section label={t('user.about')}>
          <Body>{profile.bio}</Body>
        </Section>
      ) : null}

      <Section label={t('user.listings')}>
        {listings.length === 0 ? (
          <Muted>{t('user.noListings')}</Muted>
        ) : (
          listings.map((listing) => <ListingRow key={listing.id} listing={listing} />)
        )}
      </Section>

      <Section label={t('user.reviews', { count: reviews.length })}>
        {reviews.length === 0 ? <Muted>{t('user.noReviews')}</Muted> : reviews.map((review) => <ReviewItem key={review.id} review={review} />)}
      </Section>
    </Screen>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const unit = listing.listing_type === 'table' ? t('listing.perSeat') : t('listing.perUnit');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listing.title}
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      style={({ pressed }) => [styles.listing, pressed && styles.pressed]}>
      <Photo uri={listing.photos[0]} style={styles.listingPhoto} />
      <View style={styles.listingText}>
        <Small>{listing.listing_type === 'table' ? t('listing.table') : t('listing.market')}</Small>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {listing.title}
        </Text>
        <Small numberOfLines={1}>{formatListingWhen(listing)}</Small>
        <Text style={styles.price}>
          {formatPrice(listing.price_per_unit, listing.currency)} <Text style={type.small}>{unit}</Text>
        </Text>
      </View>
      {listing.status === 'full' ? <Tag title={t('listing.soldOut')} /> : null}
    </Pressable>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const { t } = useTranslation();
  const name = review.reviewer?.full_name ?? t('user.someone');
  return (
    <Card style={styles.review}>
      <View style={styles.reviewTop}>
        <Avatar uri={review.reviewer?.avatar_url} name={name} size={36} />
        <View style={styles.reviewWho}>
          <Body numberOfLines={1}>{name}</Body>
          <Small>
            {review.role === 'guest_reviewing_host' ? t('user.reviewAsHost') : t('user.reviewAsGuest')} · {formatRelative(review.created_at)}
          </Small>
        </View>
        <Stars rating={review.rating} />
      </View>
      {review.comment ? <Body>{review.comment}</Body> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  top: { alignItems: 'center', gap: space.xs, paddingBottom: space.md },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.leafSoft,
  },
  verifiedText: { color: colors.leafInk },
  ratings: { flexDirection: 'row', gap: space.sm },
  ratingTile: { flex: 1, gap: space.xs },
  record: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  listing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.6 },
  listingPhoto: { width: 84, height: 84 },
  listingText: { flex: 1, gap: 2 },
  listingTitle: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.text },
  price: { ...type.price, fontSize: 16 },
  review: { gap: space.sm },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reviewWho: { flex: 1 },
});
