import { Camera, Map, Marker, UserLocation, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Linking, RefreshControl, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/explore/ListingCard';
import { ListingPreview } from '@/components/explore/ListingPreview';
import { PriceMarker } from '@/components/explore/PriceMarker';
import { SegmentedControl } from '@/components/explore/SegmentedControl';
import { Button, Empty, ErrorState, errorMessage, IconButton, Loading } from '@/components/ui';
import { api, type Listing } from '@/lib/api';
import { activeFilterCount, applyFilters, matchingAllergens, withType, type TypeFilter } from '@/lib/explore-filter-logic';
import { clearFilters, setExploreListings, setFilters, useFilters } from '@/lib/explore-filters';
import { locate, positionIfAllowed } from '@/lib/explore-location';
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, MAP_STYLE_URL, saveCenter, savedCenter, type LngLatPair } from '@/lib/explore-map';
import { distanceKm } from '@/lib/format';
import { logError } from '@/lib/log';
import { useMyProfile } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, radius, shadow, space } from '@/theme';

const NO_ALLERGENS: string[] = [];
const PREVIEW_BOTTOM = space.xl; // leaves MapLibre's attribution button visible under the card

export default function ExploreScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const profile = useMyProfile();
  const myAllergens = profile?.allergen_exclusions ?? NO_ALLERGENS;
  const filters = useFilters();
  const listings = useAsync(() => api.listings(), []);
  const { reload } = listings;

  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The first camera position: the last saved centre, else the device (if already allowed), else
  // the default. Null while that is being worked out.
  const [initialCenter, setInitialCenter] = useState<LngLatPair | null>(() => savedCenter());
  const [center, setCenter] = useState<LngLatPair | null>(initialCenter);
  const [userPosition, setUserPosition] = useState<LngLatPair | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const isFirstFocus = useRef(true);

  useEffect(() => {
    let isActive = true;
    positionIfAllowed().then(
      (position) => {
        if (!isActive) return;
        if (position) setUserPosition(position);
        setInitialCenter((prev) => prev ?? position ?? DEFAULT_MAP_CENTER);
      },
      (error: unknown) => {
        logError('explore: position on open', error);
        if (isActive) setInitialCenter((prev) => prev ?? DEFAULT_MAP_CENTER);
      },
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
  const origin = userPosition ?? center ?? initialCenter ?? DEFAULT_MAP_CENTER;
  const distanceTo = (l: Listing) => distanceKm({ lat: origin[1], lng: origin[0] }, { lat: l.location_lat, lng: l.location_lng });
  const sorted = mode === 'list' ? visible.map((l) => ({ listing: l, km: distanceTo(l) })).sort((a, b) => a.km - b.km) : [];
  const filterCount = activeFilterCount(filters);

  const openListing = (id: string) => router.push({ pathname: '/listing/[id]', params: { id } });

  const handleMarkerPress = (id: string) => {
    setSelectedId(id);
    Haptics.selectionAsync().catch((error: unknown) => logError('explore: haptics', error));
  };

  // Marker taps take precedence over the map's own tap natively, so a map tap means "deselect".
  const handleMapPress = () => setSelectedId(null);

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
      cameraRef.current?.flyTo({ center: result.center, zoom: 14, duration: 800 });
    } catch (error) {
      logError('explore: locate', error);
      Alert.alert(t('explore.locationErrorTitle'), errorMessage(error));
    } finally {
      setIsLocating(false);
    }
  };

  const handleType = (type: TypeFilter) => {
    setSelectedId(null);
    setFilters((prev) => withType(prev, type));
  };

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: t('explore.typeAll') },
    { value: 'table', label: t('explore.typeTables') },
    { value: 'market', label: t('explore.typeMarket') },
  ];

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
      {initialCenter ? (
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE_URL}
          attribution
          attributionPosition={{ bottom: space.sm, left: space.sm }}
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
      ) : (
        <Loading />
      )}

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
              contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 76 }, sorted.length === 0 && styles.flexGrow]}
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
                  progressViewOffset={insets.top + 76}
                />
              }
            />
          )}
        </View>
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <SegmentedControl options={typeOptions} value={filters.type} onChange={handleType} />
        <IconButton
          name="filter"
          variant="float"
          label={filterCount > 0 ? t('explore.filtersActive', { count: filterCount }) : t('explore.filters')}
          badge={filterCount}
          onPress={() => router.push('/filters')}
        />
      </View>

      {mode === 'map' && listings.status === 'loading' && initialCenter ? (
        <View style={[styles.statusPill, { top: insets.top + 76 }]} accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={colors.amberDeep} />
        </View>
      ) : null}

      {mode === 'map' && listings.status === 'error' ? (
        <View style={styles.floatingCard}>
          <ErrorState error={listings.error} onRetry={reload} />
        </View>
      ) : null}

      {mode === 'map' && all !== null && visible.length === 0 ? <View style={styles.floatingCard}>{emptyState}</View> : null}

      <View style={[styles.fabs, { bottom: selected && mode === 'map' ? PREVIEW_BOTTOM + 150 : PREVIEW_BOTTOM }]} pointerEvents="box-none">
        {mode === 'map' ? (
          isLocating ? (
            <View style={styles.fabBusy}>
              <ActivityIndicator color={colors.amberDeep} />
            </View>
          ) : (
            <IconButton name="locate" variant="float" label={t('explore.locateMe')} onPress={() => void handleLocate()} />
          )
        ) : null}
        <IconButton
          name={mode === 'map' ? 'list' : 'map'}
          variant="float"
          label={mode === 'map' ? t('explore.showList') : t('explore.showMap')}
          onPress={() => setMode(mode === 'map' ? 'list' : 'map')}
        />
      </View>

      {mode === 'map' && selected ? (
        <View style={styles.preview}>
          <ListingPreview listing={selected} allergens={matchingAllergens(selected, myAllergens)} onPress={() => openListing(selected.id)} />
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  listLayer: { backgroundColor: colors.bg },
  listContent: { paddingHorizontal: space.md, paddingBottom: space.xxl * 2 },
  flexGrow: { flexGrow: 1 },
  listGap: { height: space.md },
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
    bottom: PREVIEW_BOTTOM + 110, // above the two floating buttons
    minHeight: 220,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadow.float,
  },
  fabs: { position: 'absolute', right: space.md, gap: space.sm },
  fabBusy: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, ...shadow.float },
  preview: { position: 'absolute', left: space.md, right: space.md, bottom: PREVIEW_BOTTOM },
});
