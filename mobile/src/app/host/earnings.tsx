import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Button, Card, Empty, ErrorState, Gap, Header, Heading, Label, Loading, Screen, Section, SignInGate, Small, Title } from '@/components/ui';
import { api, type Order } from '@/lib/api';
import { eventStart, formatMoney } from '@/lib/format';
import { i18n } from '@/i18n';
import { useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, space } from '@/theme';

type Totals = { collected: number; upcoming: number; guests: number };
type CurrencyTotals = { currency: string } & Totals;
type MonthTotals = { key: string; date: Date; byCurrency: Map<string, Totals> };

function eventTime(order: Order): number | null {
  const start = order.listing ? eventStart(order.listing) : null;
  return start ? new Date(start).getTime() : null;
}

function add(map: Map<string, Totals>, currency: string, patch: Partial<Totals>) {
  const t = map.get(currency) ?? { collected: 0, upcoming: 0, guests: 0 };
  map.set(currency, {
    collected: t.collected + (patch.collected ?? 0),
    upcoming: t.upcoming + (patch.upcoming ?? 0),
    guests: t.guests + (patch.guests ?? 0),
  });
}

// Completed orders: the balance the host collected in person. Confirmed future orders: still to collect.
function summarise(orders: Order[]): { totals: CurrencyTotals[]; months: MonthTotals[] } {
  const now = Date.now();
  const all = new Map<string, Totals>();
  const months = new Map<string, MonthTotals>();
  for (const order of orders) {
    const time = eventTime(order);
    let patch: Partial<Totals> | null = null;
    if (order.status === 'completed') patch = { collected: order.balance_due, guests: order.quantity };
    else if (order.status === 'confirmed' && time !== null && time > now) patch = { upcoming: order.balance_due };
    if (!patch || time === null) continue;
    add(all, order.currency, patch);
    const date = new Date(time);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const month = months.get(key) ?? { key, date: new Date(date.getFullYear(), date.getMonth(), 1), byCurrency: new Map() };
    add(month.byCurrency, order.currency, patch);
    months.set(key, month);
  }
  return {
    totals: [...all.entries()].map(([currency, t]) => ({ currency, ...t })),
    months: [...months.values()].sort((a, b) => b.key.localeCompare(a.key)),
  };
}

const monthLabel = (date: Date) => new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(date);

export default function Earnings() {
  const { t } = useTranslation();
  const userId = useUserId();
  const data = useAsync(async () => (userId ? api.hostOrders(userId) : []), [userId]);
  const header = <Header title={t('earnings.title')} />;

  if (!userId) {
    return (
      <Screen scroll={false} header={header}>
        <SignInGate title={t('host.signedOutTitle')} body={t('host.signedOutBody')} />
      </Screen>
    );
  }
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

  const { totals, months } = summarise(data.data);
  const explainer = (
    <View style={styles.explain}>
      <Icon name="info" size={20} color={colors.leafDeep} />
      <Body style={styles.flex}>{t('earnings.explain')}</Body>
    </View>
  );

  if (totals.length === 0) {
    return (
      <Screen header={header} contentStyle={styles.grow}>
        {explainer}
        <Empty
          icon="wallet"
          title={t('earnings.emptyTitle')}
          body={t('earnings.emptyBody')}
          action={<Button title={t('host.newListing')} onPress={() => router.push('/host/new')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      refreshControl={<RefreshControl refreshing={data.isRefreshing} onRefresh={() => void data.reload()} tintColor={colors.amberDeep} />}>
      <Title>{t('earnings.heading')}</Title>
      <Gap />
      {explainer}
      {totals.map((total) => (
        <Card key={total.currency} style={styles.totalCard}>
          {totals.length > 1 ? <Label>{total.currency}</Label> : null}
          <View style={styles.totalRow}>
            <View style={styles.flex}>
              <Small>{t('earnings.collected')}</Small>
              <Text style={styles.big}>{formatMoney(total.collected, total.currency)}</Text>
            </View>
            <View style={styles.flex}>
              <Small>{t('earnings.upcoming')}</Small>
              <Text style={[styles.big, styles.upcoming]}>{formatMoney(total.upcoming, total.currency)}</Text>
            </View>
          </View>
          <Small>{t('earnings.guestsHosted', { count: total.guests })}</Small>
        </Card>
      ))}
      <Section label={t('earnings.byMonth')}>
        {months.map((month) => (
          <View key={month.key} style={styles.month}>
            <Heading style={styles.monthName}>{monthLabel(month.date)}</Heading>
            {[...month.byCurrency.entries()].map(([currency, m]) => (
              <View key={currency} style={styles.monthRow}>
                <View style={styles.flex}>
                  <Body>{t('earnings.monthCollected', { amount: formatMoney(m.collected, currency) })}</Body>
                  <Small>
                    {[
                      t('earnings.guestsHosted', { count: m.guests }),
                      m.upcoming > 0 ? t('earnings.monthUpcoming', { amount: formatMoney(m.upcoming, currency) }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Small>
                </View>
              </View>
            ))}
          </View>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  explain: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.leafSoft, marginBottom: space.md },
  totalCard: { gap: space.sm, marginBottom: space.sm },
  totalRow: { flexDirection: 'row', gap: space.md },
  big: { fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.text },
  upcoming: { color: colors.amberDeep },
  month: { paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  monthName: { fontSize: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.xs },
});
