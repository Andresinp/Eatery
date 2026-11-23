import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/bookings/BookingCard';
import { Segmented } from '@/components/bookings/Segmented';
import { Button, Empty, ErrorState, Loading, SignInGate, Title } from '@/components/ui';
import { api, type Order } from '@/lib/api';
import { splitBookings } from '@/lib/bookings-logic';
import { useSession, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, space } from '@/theme';

type Segment = 'upcoming' | 'past';

export default function BookingsScreen() {
  const { t } = useTranslation();
  const { state } = useSession();
  const userId = useUserId();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.titleRow}>
        <Title>{t('bookings.title')}</Title>
      </View>
      {state.phase === 'loading' ? <Loading /> : userId ? <BookingsList userId={userId} /> : <SignInGate body={t('bookings.signInBody')} />}
    </SafeAreaView>
  );
}

function BookingsList({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('upcoming');
  const bookings = useAsync(() => api.myBookings(userId), [userId]);
  const { reload } = bookings;

  // Reload when coming back to the tab (after booking, cancelling or reviewing), but not on the
  // first focus, which the initial load already covers.
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) void reload();
      hasFocused.current = true;
    }, [reload]),
  );

  const handleOpen = (order: Order) => router.push({ pathname: '/order/[id]', params: { id: order.id } });

  if (bookings.status === 'loading') return <Loading />;
  if (bookings.status === 'error') return <ErrorState error={bookings.error} onRetry={() => void reload()} />;

  const { upcoming, past } = splitBookings(bookings.data);
  const shown = segment === 'upcoming' ? upcoming : past;

  return (
    <FlatList
      data={shown}
      keyExtractor={(order) => order.id}
      contentContainerStyle={[styles.list, shown.length === 0 && styles.listEmpty]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={bookings.isRefreshing} onRefresh={() => void reload()} tintColor={colors.amberDeep} />}
      ListHeaderComponent={
        <View style={styles.segmented}>
          <Segmented
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'upcoming', label: t('bookings.upcoming') },
              { value: 'past', label: t('bookings.past') },
            ]}
          />
        </View>
      }
      ListEmptyComponent={
        <Empty
          icon={segment === 'upcoming' ? 'ticket' : 'clock'}
          title={segment === 'upcoming' ? t('bookings.emptyUpcomingTitle') : t('bookings.emptyPastTitle')}
          body={segment === 'upcoming' ? t('bookings.emptyUpcomingBody') : t('bookings.emptyPastBody')}
          action={<Button title={t('bookings.explore')} onPress={() => router.navigate('/(tabs)/explore')} />}
        />
      }
      renderItem={({ item }) => <BookingCard order={item} onPress={() => handleOpen(item)} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  titleRow: { paddingHorizontal: space.md + 4, paddingTop: space.sm, paddingBottom: space.sm },
  segmented: { marginBottom: space.md },
  list: { paddingHorizontal: space.md + 4, paddingTop: space.sm, paddingBottom: space.xxl },
  listEmpty: { flexGrow: 1 },
  separator: { height: space.md },
});
