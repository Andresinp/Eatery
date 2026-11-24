import { Camera, Map, Marker, UserLocation, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Linking, RefreshControl, ScrollView, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/explore/ListingCard';
import { PreviewCarousel } from '@/components/explore/PreviewCarousel';
import { PriceMarker } from '@/components/explore/PriceMarker';
import { ExploreTopBar } from '@/components/explore/TopBar';
import { Button, Chip, Empty, ErrorState, errorMessage, IconButton, Loading } from '@/components/ui';
import { api, type Listing } from '@/lib/api';
import { activeFilterCount, applyFilters, bookability, matchingAllergens, sortForList, type ListSort } from '@/lib/explore-filter-logic';
import { clearFilters, setExploreListings, useFilters } from '@/lib/explore-filters';
import { locate, positionIfAllowed } from '@/lib/explore-location';
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, MAP_STYLE_URL, saveCenter, savedCenter, type LngLatPair } from '@/lib/explore-map';
import { distanceKm } from '@/lib/format';
import { logError } from '@/lib/log';
import { useMyProfile, useUserId } from '@/lib/session';
import { useTabBarSpace } from '@/lib/tab-bar';
import { useAsync } from '@/lib/use-async';
import { colors, radius, shadow, space } from '@/theme';

const NO_ALLERGENS: string[] = [];
const SAME_TAP_MS = 400;
const TOP_BAR_HEIGHT = 56;
const LIST_HEADER_HEIGHT = 56;
const SORTS: ListSort[] = ['distance', 'price', 'seats'];

export default function ExploreScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const profile = useMyProfile();
  const userId = useUserId();
  const barSpace = useTabBarSpace();
  // The cards sit just above the floating tab bar.
  const previewBottom = barSpace + space.xs;
  const myAllergens = profile?.allergen_exclusions ?? NO_ALLERGENS;
  const filters = useFilters();
  const listings = useAsync(() => api.listings(), []);
  const { reload } = listings;

  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The swipe order of the card strip, fixed when a pin is tapped: that pin, then the nearest to it.
  const [stripIds, setStripIds] = useState<string[]>([]);
  const [stripKey, setStripKey] = useState(0);
  const [stripHeight, setStripHeight] = useState(300);
  const [listSort, setListSort] = useState<ListSort>('distance');
  // The first camera position: the last saved centre, else the default. The map shows at once;
  // the device position (if location is already allowed) arrives later and the camera flies there.
  // Waiting for it first left the screen on a spinner for a minute when a fix was slow.
  const [initialCenter] = useState<LngLatPair>(() => savedCenter() ?? DEFAULT_MAP_CENTER);
  const hasSavedCenter = useRef(savedCenter() !== null);
  const [center, setCenter] = useState<LngLatPair | null>(initialCenter);
  const [userPosition, setUserPosition] = useState<LngLatPair | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const isPinTap = useRef(false);
  const isFirstFocus = useRef(true);

  useEffect(() => {
    let isActive = true;
    positionIfAllowed().then(
      (position) => {
        if (!isActive || !position) return;
        setUserPosition(position);
        if (!hasSavedCenter.current)
          cameraRef.current?.flyTo({
            center: position,
            zoom: DEFAULT_ZOOM,
            duration: 800,
          });
      },
      (error: unknown) => logError('explore: position on open', error),
    );
    return () => {
      isActive = false;
    };
  }, []);

  // Coming back (e.g. after booking) refreshes seat counts. The first focus is the initial load.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );

  const all = listings.status === 'ready' ? listings.data : null;
  useEffect(() => {
    if (all) setExploreListings(all);
  }, [all]);

  const visible = all ? applyFilters(all, filters, myAllergens, new Date()) : [];
  const selected = visible.find((l) => l.id === selectedId) ?? null;
  const origin = userPosition ?? center ?? initialCenter;
  const distanceTo = (l: Listing) => distanceKm({ lat: origin[1], lng: origin[0] }, { lat: l.location_lat, lng: l.location_lng });
  const sorted =
    mode === 'list'
      ? sortForList(
          visible.map((l) => ({ listing: l, km: distanceTo(l) })),
          listSort,
        )
      : [];
  const strip = selected ? stripIds.map((id) => visible.find((l) => l.id === id)).filter((l): l is Listing => l !== undefined) : [];
  const filterCount = activeFilterCount(filters);

  const openListing = (id: string) => router.push({ pathname: '/listing/[id]', params: { id } });

  const bookListing = (listing: Listing) => {
    if (bookability(listing, userId, new Date()) !== 'ok') return;
    if (!userId) router.push('/(auth)/welcome');
    else router.push({ pathname: '/book/[id]', params: { id: listing.id } });
  };

  const closeStrip = () => {
    setSelectedId(null);
    setStripIds([]);
  };

  // Swiping to a card selects its pin and brings it into view.
  const handleStripChange = (listing: Listing) => {
    setSelectedId(listing.id);
    cameraRef.current?.flyTo({
      center: [listing.location_lng, listing.location_lat],
      duration: 500,
    });
    Haptics.selectionAsync().catch((error: unknown) => logError('explore: haptics', error));
  };

  const handleMarkerPress = (id: string) => {
    isPinTap.current = true;
    setTimeout(() => {
      isPinTap.current = false;
    }, SAME_TAP_MS);
    const tapped = visible.find((l) => l.id === id);
    if (tapped) {
      const from = { lat: tapped.location_lat, lng: tapped.location_lng };
      const order = [...visible].sort(
        (a, b) => distanceKm(from, { lat: a.location_lat, lng: a.location_lng }) - distanceKm(from, { lat: b.location_lat, lng: b.location_lng }),
      );
      setStripIds([tapped.id, ...order.filter((l) => l.id !== tapped.id).map((l) => l.id)]);
      setStripKey((k) => k + 1); // start the strip at the tapped card
    }
    setSelectedId(id);
    Haptics.selectionAsync().catch((error: unknown) => logError('explore: haptics', error));
  };

  // A tap on a pin also reaches the map a few milliseconds later (seen on Android 16 with
  // MapLibre 11.5), which used to deselect the pin straight away so nothing ever showed. A map tap
  // right after a pin tap is the same gesture; any other map tap means "deselect".
  const handleMapPress = () => {
    if (isPinTap.current) return;
    closeStrip();
  };

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const next = event.nativeEvent.center;
    setCenter(next);
    saveCenter(next);
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch((error: unknown) => logError('explore: open settings', error));
  };

  const handleLocate = async () => {
    setIsLocating(true);
    try {
      const result = await locate();
      if (result.status === 'denied') {
        Alert.alert(t('explore.locationOffTitle'), t('errors.permission_location'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('errors.openSettings'), onPress: handleOpenSettings },
        ]);
        return;
      }
      setUserPosition(result.center);
      cameraRef.current?.flyTo({
        center: result.center,
        zoom: 14,
        duration: 800,
      });
    } catch (error) {
      logError('explore: locate', error);
      Alert.alert(t('explore.locationErrorTitle'), errorMessage(error));
    } finally {
      setIsLocating(false);
    }
  };

  // A bottom card (preview, error or empty state) pushes the right-hand buttons up.
  const hasMapError = mode === 'map' && listings.status === 'error';
  const hasMapEmpty = mode === 'map' && all !== null && visible.length === 0;
  const hasBottomCard = (mode === 'map' && selected !== null) || hasMapError || hasMapEmpty;

  const isFilteredEmpty = all !== null && all.length > 0 && visible.length === 0;
  const emptyState = isFilteredEmpty ? (
    <Empty
      icon="filter"
      title={t('explore.noMatchesTitle')}
      body={t('explore.noMatchesBody')}
      action={<Button title={t('explore.clearFilters')} variant="outline" onPress={clearFilters} />}
    />
  ) : (
    <Empty icon="plate" title={t('explore.emptyTitle')} body={t('explore.emptyBody')} />
  );

  return (
    <View style={styles.screen}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        attribution
        attributionPosition={{
          top: insets.top + TOP_BAR_HEIGHT + space.sm,
          left: space.sm,
        }}
        logo={false}
        compass={false}
        tintColor={colors.amberDeep}
        onPress={handleMapPress}
        onRegionDidChange={handleRegionDidChange}
        accessibilityLabel={t('explore.mapLabel')}>
        <Camera ref={cameraRef} initialViewState={{ center: initialCenter, zoom: DEFAULT_ZOOM }} />
        {userPosition ? <UserLocation /> : null}
        {visible.map((listing) => (
          <Marker
            key={listing.id}
            id={listing.id}
            lngLat={[listing.location_lng, listing.location_lat]}
            onPress={() => handleMarkerPress(listing.id)}
            accessibilityLabel={listing.title}>
            <PriceMarker listing={listing} isSelected={listing.id === selectedId} />
          </Marker>
        ))}
      </Map>

      {mode === 'list' ? (
        <View style={[StyleSheet.absoluteFill, styles.listLayer]}>
          {listings.status === 'loading' ? (
            <Loading />
          ) : listings.status === 'error' ? (
            <ErrorState error={listings.error} onRetry={reload} />
          ) : (
            <FlatList
              data={sorted}
              keyExtractor={(item) => item.listing.id}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingTop: insets.top + TOP_BAR_HEIGHT + LIST_HEADER_HEIGHT,
                  paddingBottom: barSpace + space.lg,
                },
                sorted.length === 0 && styles.flexGrow,
              ]}
              ItemSeparatorComponent={ListGap}
              renderItem={({ item }) => (
                <ListingCard
                  listing={item.listing}
                  distanceKm={item.km}
                  allergens={matchingAllergens(item.listing, myAllergens)}
                  onPress={() => openListing(item.listing.id)}
                />
              )}
              ListEmptyComponent={emptyState}
              refreshControl={
                <RefreshControl
                  refreshing={listings.isRefreshing}
                  onRefresh={reload}
                  tintColor={colors.amberDeep}
                  progressViewOffset={insets.top + TOP_BAR_HEIGHT + LIST_HEADER_HEIGHT}
                />
              }
            />
          )}
        </View>
      ) : null}

      <ExploreTopBar paddingTop={insets.top + space.sm} />

      {mode === 'list' ? (
        <View style={[styles.listHeader, { top: insets.top + TOP_BAR_HEIGHT }]}>
          <IconButton name="close" variant="float" label={t('explore.backToMap')} onPress={() => setMode('map')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts} accessibilityLabel={t('explore.sortBy')}>
            {SORTS.map((sort) => (
              <Chip key={sort} title={t(`explore.sort_${sort}`)} isSelected={listSort === sort} onPress={() => setListSort(sort)} />
            ))}
          </ScrollView>
          <IconButton
            name="filter"
            variant="float"
            label={filterCount > 0 ? t('explore.filtersActive', { count: filterCount }) : t('explore.filters')}
            badge={filterCount}
            onPress={() => router.push('/filters')}
          />
        </View>
      ) : null}

      {mode === 'map' && listings.status === 'loading' ? (
        <View style={[styles.statusPill, { top: insets.top + TOP_BAR_HEIGHT + space.md }]} accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={colors.amberDeep} />
        </View>
      ) : null}

      {hasMapError ? (
        <View style={[styles.floatingCard, { bottom: previewBottom + space.sm }]}>
          <ErrorState error={listings.error} onRetry={reload} />
        </View>
      ) : null}

      {hasMapEmpty ? <View style={[styles.floatingCard, { bottom: previewBottom + space.sm }]}>{emptyState}</View> : null}

      {/* As on the web: filters, list and locate stacked on the right, centred in the space the
          top bar and the bottom card leave free. In the list, filters and sorting sit in its header. */}
      {mode === 'map' ? (
        <View
          style={[
            styles.fabs,
            {
              top: insets.top + TOP_BAR_HEIGHT,
              bottom: hasBottomCard ? previewBottom + stripHeight : barSpace,
            },
          ]}
          pointerEvents="box-none">
          <IconButton
            name="filter"
            variant="float"
            label={filterCount > 0 ? t('explore.filtersActive', { count: filterCount }) : t('explore.filters')}
            badge={filterCount}
            onPress={() => router.push('/filters')}
          />
          <IconButton name="list" variant="float" label={t('explore.showList')} onPress={() => setMode('list')} />
          {isLocating ? (
            <View style={styles.fabBusy}>
              <ActivityIndicator color={colors.amberDeep} />
            </View>
          ) : (
            <IconButton name="locate" variant="float" label={t('explore.locateMe')} onPress={() => void handleLocate()} />
          )}
        </View>
      ) : null}

      {mode === 'map' && strip.length > 0 ? (
        <View style={[styles.strip, { bottom: previewBottom }]}>
          <PreviewCarousel
            key={stripKey}
            listings={strip}
            myAllergens={myAllergens}
            userId={userId}
            distanceTo={userPosition ? distanceTo : null}
            onChange={handleStripChange}
            onOpen={(l) => openListing(l.id)}
            onBook={bookListing}
            onClose={closeStrip}
            onHeight={setStripHeight}
          />
        </View>
      ) : null}
    </View>
  );
}

function ListGap() {
  return <View style={styles.listGap} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  listHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LIST_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.bg,
  },
  sorts: { alignItems: 'center', gap: space.sm, paddingHorizontal: 2 },
  listLayer: { backgroundColor: colors.bg },
  listContent: { paddingHorizontal: space.md },
  flexGrow: { flexGrow: 1 },
  listGap: { height: space.sm },
  statusPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: space.sm,
    ...shadow.float,
  },
  floatingCard: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    minHeight: 220,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadow.float,
  },
  fabs: {
    position: 'absolute',
    right: space.md,
    justifyContent: 'center',
    gap: space.sm + 4,
  },
  fabBusy: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    ...shadow.float,
  },
  strip: { position: 'absolute', left: 0, right: 0 },
});
