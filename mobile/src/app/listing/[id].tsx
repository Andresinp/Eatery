import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaMap } from '@/components/explore/AreaMap';
import { AllergenWarning, availabilityText, DietaryNote, drinksText, TypeBadge, unitText } from '@/components/explore/bits';
import { PhotoCarousel } from '@/components/explore/PhotoCarousel';
import { Icon } from '@/components/icons';
import { Avatar, Body, Button, Empty, ErrorState, Header, IconButton, Label, Loading, Small, Stars, Tag, tagLabel, Title } from '@/components/ui';
import { api, type Listing } from '@/lib/api';
import { bookability, matchingAllergens, unmetDietary, type Bookability } from '@/lib/explore-filter-logic';
import { formatListingWhen, formatPrice } from '@/lib/format';
import { logError } from '@/lib/log';
import { useMyProfile, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, shadow, space, type } from '@/theme';

const PHOTO_HEIGHT = 320;
const NO_ALLERGENS: string[] = [];

export default function ListingDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAsync(() => api.listing(id), [id]);

  if (state.status === 'loading' || state.status === 'error' || state.data === null) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Header />
        {state.status === 'loading' ? (
          <Loading />
        ) : state.status === 'error' ? (
          <ErrorState error={state.error} onRetry={state.reload} />
        ) : (
          <Empty
            icon="plate"
            title={t('listingDetail.notFoundTitle')}
            body={t('listingDetail.notFoundBody')}
            action={<Button title={t('listingDetail.backToExplore')} variant="outline" onPress={() => router.replace('/(tabs)/explore')} />}
          />
        )}
      </SafeAreaView>
    );
  }
  return <ListingDetail listing={state.data} />;
}

function ListingDetail({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useUserId();
  const profile = useMyProfile();
  const myAllergens = matchingAllergens(listing, profile?.allergen_exclusions ?? NO_ALLERGENS);
  const myUnmetDiets = unmetDietary(listing, profile?.dietary_prefs ?? NO_ALLERGENS);
  const canBook = bookability(listing, userId, new Date());
  const isOwn = canBook === 'own';
  const isTable = listing.listing_type === 'table';
  const host = listing.host;
  // What the food is, in one line: "Turkish · Meze" — the description is about the experience.
  const food = (isTable ? listing.cuisine_tags : listing.product_type_tags).map(tagLabel).join(' · ');

  const handleShare = () => {
    Share.share({ title: listing.title, message: `${listing.title} — https://eatery.app/listing/${listing.id}` }).catch((error: unknown) =>
      logError('listing: share', error),
    );
  };

  const handleReport = () => {
    if (!userId) {
      router.push('/(auth)/welcome');
      return;
    }
    router.push({ pathname: '/report', params: { listingId: listing.id } });
  };

  const handleMore = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('listingDetail.reportListing'), t('common.cancel')], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
        (index) => {
          if (index === 0) handleReport();
        },
      );
    } else {
      Alert.alert(listing.title, undefined, [
        { text: t('listingDetail.reportListing'), style: 'destructive', onPress: handleReport },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const handleBook = () => {
    if (!userId) router.push('/(auth)/welcome');
    else router.push({ pathname: '/book/[id]', params: { id: listing.id } });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <PhotoCarousel photos={listing.photos} height={PHOTO_HEIGHT + insets.top} />

        <View style={styles.body}>
          <TypeBadge listing={listing} />
          <Title style={styles.title}>{listing.title}</Title>

          {host ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('listingDetail.hostedBy', { name: host.full_name ?? '' })}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: host.id } })}
              style={({ pressed }) => [styles.hostRow, pressed && styles.pressed]}>
              <Avatar uri={host.avatar_url} name={host.full_name} size={48} />
              <View style={styles.flex}>
                <Small>{isTable ? t('listingDetail.yourHost') : t('listingDetail.madeBy')}</Small>
                <Text style={styles.hostName} numberOfLines={1}>
                  {host.full_name ?? ''}
                </Text>
                <View style={styles.hostMeta}>
                  <Stars rating={host.host_rating} />
                  {host.identity_verified ? (
                    <View style={styles.verified}>
                      <Icon name="shield" size={14} color={colors.leafDeep} />
                      <Small style={styles.verifiedText}>{t('listing.verifiedHost')}</Small>
                    </View>
                  ) : null}
                </View>
              </View>
              <Icon name="chevron" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}

          <AllergenWarning allergens={myAllergens} />
          <DietaryNote diets={myUnmetDiets} />

          <View style={styles.facts}>
            {food ? <Fact icon={isTable ? 'plate' : 'bag'} title={food} subtitle={t('listingDetail.food')} /> : null}
            <Fact icon={isTable ? 'calendar' : 'clock'} title={formatListingWhen(listing)} subtitle={isTable ? t('listingDetail.mealTime') : t('listingDetail.pickupWindow')} />
            <Fact icon="pin" title={listing.location_display} subtitle={t('listingDetail.addressAfterBooking')} />
            <Fact icon={isTable ? 'user' : 'bag'} title={availabilityText(t, listing)} subtitle={isTable ? t('listingDetail.seatsTotal', { count: listing.seats_total ?? 0 }) : t('listingDetail.itemsTotal', { count: listing.quantity_total ?? 0 })} />
            {isTable ? (
              <Fact
                icon="drink"
                title={drinksText(t, listing)}
                subtitle={t('listingDetail.drinks')}
              />
            ) : null}
            {!isTable && listing.allows_local_delivery ? <Fact icon="bag" title={t('listingDetail.localDelivery')} subtitle={t('listingDetail.deliveryHelp')} /> : null}
          </View>

          {listing.dietary_tags.length > 0 || listing.cuisine_tags.length > 0 || listing.product_type_tags.length > 0 ? (
            <View style={styles.block}>
              <Label>{t('listingDetail.whatsOnIt')}</Label>
              <View style={styles.tags}>
                {listing.dietary_tags.map((tag) => (
                  <Tag key={`d-${tag}`} title={tagLabel(tag)} tone="leaf" />
                ))}
                {[...listing.cuisine_tags, ...listing.product_type_tags].map((tag) => (
                  <Tag key={`c-${tag}`} title={tagLabel(tag)} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.block}>
            <Label>{t('listingDetail.allergens')}</Label>
            {listing.allergen_flags.length > 0 ? (
              <View style={styles.tags}>
                {listing.allergen_flags.map((tag) => (
                  <Tag key={tag} title={tagLabel(tag)} tone="danger" />
                ))}
              </View>
            ) : (
              <Small>{t('listingDetail.noAllergensListed')}</Small>
            )}
            <Small style={styles.faint}>{t('listingDetail.allergensHelp')}</Small>
          </View>

          {listing.description ? (
            <View style={styles.block}>
              <Label>{t('listingDetail.about')}</Label>
              <Body>{listing.description}</Body>
            </View>
          ) : null}

          {isTable ? (
            <View style={styles.block}>
              <Label>{t('listingDetail.whereYoullEat')}</Label>
              {listing.dining_setting ? <Text style={styles.factTitle}>{t(`dining.${listing.dining_setting}`)}</Text> : null}
              {listing.dining_setting_photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.diningPhotos}>
                  {listing.dining_setting_photos.map((uri) => (
                    <Image
                      key={uri}
                      source={{ uri }}
                      style={styles.diningPhoto}
                      contentFit="cover"
                      transition={200}
                      accessibilityLabel={t('listingDetail.diningPhoto')}
                    />
                  ))}
                </ScrollView>
              ) : (
                <Small style={styles.faint}>{t('listingDetail.noDiningPhotos')}</Small>
              )}
            </View>
          ) : null}

          <View style={styles.block}>
            <Label>{t('listingDetail.area')}</Label>
            <AreaMap lat={listing.location_lat} lng={listing.location_lng} />
            <Small style={styles.faint}>{t('listingDetail.areaHelp')}</Small>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.topButtons, { top: insets.top + space.xs }]} pointerEvents="box-none">
        <IconButton name="back" variant="float" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} />
        <View style={styles.topRight}>
          <IconButton name="share" variant="float" label={t('common.share')} onPress={handleShare} />
          {isOwn ? null : <IconButton name="more" variant="float" label={t('listingDetail.moreActions')} onPress={handleMore} />}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
        <View style={styles.flex}>
          <Text style={styles.price}>{formatPrice(listing.price_per_unit, listing.currency)}</Text>
          <Small>{unitText(t, listing)}</Small>
        </View>
        <FooterAction listing={listing} canBook={canBook} onBook={handleBook} />
      </View>
    </View>
  );
}

type FooterActionProps = { listing: Listing; canBook: Bookability; onBook: () => void };

function FooterAction({ listing, canBook, onBook }: FooterActionProps) {
  const { t } = useTranslation();
  if (canBook === 'own') {
    return (
      <Button title={t('listingDetail.manage')} variant="dark" onPress={() => router.push({ pathname: '/host/listing/[id]', params: { id: listing.id } })} style={styles.action} />
    );
  }
  if (canBook !== 'ok') {
    const reason =
      canBook === 'soldOut' ? t('listing.soldOut') : canBook === 'past' ? t('listingDetail.reasonPast') : t('listingDetail.reasonClosed');
    return <Button title={reason} isDisabled onPress={onBook} style={styles.action} />;
  }
  return <Button title={listing.listing_type === 'table' ? t('listingDetail.bookSeat') : t('listingDetail.order')} onPress={onBook} style={styles.action} />;
}

type FactProps = { icon: React.ComponentProps<typeof Icon>['name']; title: string; subtitle: string };

function Fact({ icon, title, subtitle }: FactProps) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Icon name={icon} size={20} color={colors.amberInk} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.factTitle}>{title}</Text>
        <Small>{subtitle}</Small>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  body: {
    marginTop: -radius.xl,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.md + 4,
    paddingTop: space.lg,
    gap: space.md,
  },
  title: { marginTop: -space.xs },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  hostName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  hostMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { color: colors.leafDeep, fontFamily: fonts.bodySemi },
  facts: { gap: space.md, paddingVertical: space.xs },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  factIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  factTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  block: { gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  faint: { color: colors.textFaint },
  diningPhotos: { gap: space.sm },
  diningPhoto: { width: 240, height: 160, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  topButtons: { position: 'absolute', left: space.md, right: space.md, flexDirection: 'row', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', gap: space.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md + 4,
    paddingTop: space.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  price: { ...type.price, fontSize: 22, lineHeight: 26 },
  action: { flexShrink: 0, minWidth: 160 },
});
