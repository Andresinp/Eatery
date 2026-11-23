import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { HostListingCard, hasListingEnded, listingSortKey } from '@/components/host/listing-cards';
import { Icon } from '@/components/icons';
import {
  Avatar,
  Button,
  Card,
  Empty,
  ErrorState,
  Gap,
  Hero,
  Label,
  Loading,
  Muted,
  Row,
  Screen,
  Section,
  SignInGate,
  Small,
} from '@/components/ui';
import { api, type Listing, type Order } from '@/lib/api';
import { eventStart, formatListingWhen, formatMoney } from '@/lib/format';
import { useMyProfile, useSession, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, shadow, space } from '@/theme';

function startTime(order: Order): number {
  const start = order.listing ? eventStart(order.listing) : null;
  return start ? new Date(start).getTime() : 0;
}

function isUpcoming(order: Order): boolean {
  return order.status === 'confirmed' && startTime(order) > Date.now();
}

// "€120 · ₺800": one amount per currency, since listings can be priced in different ones.
function totalsByCurrency(orders: Order[]): string {
  const sums = new Map<string, number>();
  for (const o of orders) sums.set(o.currency, (sums.get(o.currency) ?? 0) + o.balance_due);
  if (sums.size === 0) return '—';
  return [...sums.entries()].map(([currency, sum]) => formatMoney(sum, currency)).join(' · ');
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue} numberOfLines={2} adjustsFontSizeToFit>
        {value}
      </Text>
      <Small>{label}</Small>
    </View>
  );
}

function ListingSection({ title, listings, emptyText }: { title: string; listings: Listing[]; emptyText: string }) {
  return (
    <Section label={title}>
      {listings.length === 0 ? (
        <View style={styles.sectionEmpty}>
          <Muted>{emptyText}</Muted>
        </View>
      ) : (
        listings.map((listing) => (
          <HostListingCard
            key={listing.id}
            listing={listing}
            onPress={() => router.push({ pathname: '/host/listing/[id]', params: { id: listing.id } })}
          />
        ))
      )}
    </Section>
  );
}

function HostHome({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const profile = useMyProfile();
  const data = useAsync(async () => {
    const [listings, orders] = await Promise.all([api.listingsByHost(userId), api.hostOrders(userId)]);
    return { listings, orders };
  }, [userId]);

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

  const handleNew = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/host/new');
  };

  if (data.status === 'loading') {
    return (
      <Screen scroll={false} edges={['top']}>
        <Loading />
      </Screen>
    );
  }
  if (data.status === 'error') {
    return (
      <Screen scroll={false} edges={['top']}>
        <ErrorState error={data.error} onRetry={() => void data.reload()} />
      </Screen>
    );
  }

  const { listings, orders } = data.data;
  const sorted = [...listings].sort((a, b) => listingSortKey(a) - listingSortKey(b));
  const tables = sorted.filter((l) => l.listing_type === 'table');
  const market = sorted.filter((l) => l.listing_type === 'market');
  const activeCount = listings.filter((l) => (l.status === 'active' || l.status === 'full') && !hasListingEnded(l)).length;
  const upcoming = orders.filter(isUpcoming).sort((a, b) => startTime(a) - startTime(b));
  const guestCount = upcoming.reduce((n, o) => n + o.quantity, 0);
  const firstName = profile?.full_name?.split(' ')[0];
  const refresh = <RefreshControl refreshing={data.isRefreshing} onRefresh={() => void data.reload()} tintColor={colors.amberDeep} />;

  if (listings.length === 0 && orders.length === 0) {
    return (
      <Screen scroll={false} edges={['top']}>
        <Empty
          icon="chef"
          title={t('host.emptyTitle')}
          body={t('host.emptyBody')}
          action={<Button title={t('host.emptyAction')} icon={<Icon name="plus" size={20} color={colors.amberInk} />} onPress={handleNew} />}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} refreshControl={refresh}>
      <Label>{firstName ? t('host.greetingName', { name: firstName }) : t('host.greeting')}</Label>
      <Gap size="xs" />
      <Hero>{t('host.title')}</Hero>
      <Gap />
      <View style={styles.stats}>
        <Stat label={t('host.statActive')} value={String(activeCount)} />
        <Stat label={t('host.statGuests')} value={String(guestCount)} />
        <Stat label={t('host.statCollect')} value={totalsByCurrency(upcoming)} />
      </View>
      <Gap />
      <Button title={t('host.newListing')} icon={<Icon name="plus" size={20} color={colors.amberInk} />} onPress={handleNew} />
      <Gap size="sm" />
      <Card onPress={() => router.push('/host/earnings')} style={styles.earnings}>
        <Icon name="wallet" size={22} color={colors.leafDeep} />
        <View style={styles.flex}>
          <Text style={styles.earningsTitle}>{t('host.earningsLink')}</Text>
          <Small>{t('host.earningsHelp')}</Small>
        </View>
        <Icon name="chevron" size={18} color={colors.textFaint} />
      </Card>

      <Section label={t('host.upcomingGuests')}>
        {upcoming.length === 0 ? (
          <View style={styles.sectionEmpty}>
            <Muted>{t('host.noUpcoming')}</Muted>
          </View>
        ) : (
          <View>
            {upcoming.map((order) => (
              <Row
                key={order.id}
                left={<Avatar uri={order.guest?.avatar_url} name={order.guest?.full_name} size={40} />}
                title={`${order.guest?.full_name ?? t('hostManage.guest')} · ${
                  order.listing_type === 'table' ? t('hostManage.seats', { count: order.quantity }) : t('hostManage.items', { count: order.quantity })
                }`}
                subtitle={order.listing ? `${order.listing.title} · ${formatListingWhen(order.listing)}` : undefined}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
              />
            ))}
          </View>
        )}
      </Section>

      <ListingSection title={t('host.tables')} listings={tables} emptyText={t('host.noTables')} />
      <ListingSection title={t('host.market')} listings={market} emptyText={t('host.noMarket')} />
    </Screen>
  );
}

export default function HostTab() {
  const { t } = useTranslation();
  const userId = useUserId();
  const { state } = useSession();
  if (state.phase === 'loading') {
    return (
      <Screen scroll={false} edges={['top']}>
        <Loading />
      </Screen>
    );
  }
  if (!userId) {
    return (
      <Screen scroll={false} edges={['top']}>
        <SignInGate title={t('host.signedOutTitle')} body={t('host.signedOutBody')} />
      </Screen>
    );
  }
  return <HostHome userId={userId} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.card, gap: space.xs, ...shadow.card },
  statValue: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.text },
  earnings: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  earningsTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  sectionEmpty: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
});
