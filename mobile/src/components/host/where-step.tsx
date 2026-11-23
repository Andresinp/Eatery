import { Camera, Map, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Button, Field, Gap, Small, Title } from '@/components/ui';
import { roundCoord } from '@/lib/host-draft';
import { logError } from '@/lib/log';
import { colors, radius, shadow, space } from '@/theme';

import type { StepProps } from './types';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
// Where the map opens before the host has placed their pin and without location access.
const FALLBACK_CENTER: [number, number] = [-3.7038, 40.4168];

// "Kadıköy, İstanbul": the district (or subregion) and the city, as guests will see it.
function areaName(address: Location.LocationGeocodedAddress | undefined): string {
  if (!address) return '';
  const local = address.district ?? address.subregion;
  const parts = [local, address.city].filter((p): p is string => !!p);
  return [...new Set(parts)].join(', ');
}

type Props = StepProps & { isHeaderShown?: boolean };

export function WhereStep({ draft, dispatch, errors, isHeaderShown = true }: Props) {
  const { t } = useTranslation();
  const camera = useRef<CameraRef>(null);
  const [isLocating, setIsLocating] = useState(false);
  const geocodeRun = useRef(0);
  const hasPin = draft.lat !== null && draft.lng !== null;
  const initialCenter: [number, number] = draft.lat !== null && draft.lng !== null ? [draft.lng, draft.lat] : FALLBACK_CENTER;
  const isAreaEdited = draft.isAreaEdited;

  const place = async (lat: number, lng: number) => {
    dispatch({ type: 'set', patch: { lat: roundCoord(lat), lng: roundCoord(lng) } });
    if (isAreaEdited) return;
    const run = ++geocodeRun.current;
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const name = areaName(address);
      if (name && run === geocodeRun.current) dispatch({ type: 'set', patch: { area: name } });
    } catch (error) {
      // The host can still type the area by hand.
      logError('reverseGeocode', error);
    }
  };

  const moveTo = (lat: number, lng: number) => {
    camera.current?.easeTo({ center: [lng, lat], zoom: 15, duration: 600 });
    void place(lat, lng);
  };

  // With location already allowed and no pin yet, start where the host is (no prompt here).
  useEffect(() => {
    if (hasPin) return;
    let isActive = true;
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getLastKnownPositionAsync();
        if (isActive && position) moveTo(position.coords.latitude, position.coords.longitude);
      } catch (error) {
        logError('host initial location', error);
      }
    })();
    return () => {
      isActive = false;
    };
    // Only on first show of the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseLocation = async () => {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('hostNew.where.locationOffTitle'), t('errors.permission_location'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('errors.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      moveTo(position.coords.latitude, position.coords.longitude);
    } catch (error) {
      logError('host use location', error);
      Alert.alert(t('hostNew.where.locationFailed'));
    } finally {
      setIsLocating(false);
    }
  };

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (!event.nativeEvent.userInteraction) return;
    const [lng, lat] = event.nativeEvent.center;
    void place(lat, lng);
  };

  return (
    <View>
      {isHeaderShown ? (
        <>
          <Title>{t('hostNew.where.title')}</Title>
          <Gap size="sm" />
          <Body>{t('hostNew.where.body')}</Body>
          <Gap />
        </>
      ) : null}
      <View style={[styles.mapBox, !!errors.map && styles.mapError]}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE}
          touchRotate={false}
          touchPitch={false}
          compass={false}
          onRegionDidChange={handleRegionDidChange}
          accessibilityLabel={t('hostNew.where.mapLabel')}>
          <Camera ref={camera} initialViewState={{ center: initialCenter, zoom: hasPin ? 15 : 11 }} />
        </Map>
        {/* The pin stays in the middle; the host moves the map under it. */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <View style={styles.pin}>
            <Icon name="pin" size={22} color={colors.amberInk} />
          </View>
          <View style={styles.pinStem} />
        </View>
        {isLocating ? (
          <View pointerEvents="none" style={styles.locating}>
            <ActivityIndicator color={colors.amberDeep} />
          </View>
        ) : null}
      </View>
      {errors.map ? <Small style={styles.error}>{errors.map}</Small> : <Small style={styles.help}>{t('hostNew.where.mapHelp')}</Small>}
      <Gap size="sm" />
      <Button
        title={t('hostNew.where.useLocation')}
        variant="outline"
        icon={<Icon name="locate" size={18} color={colors.text} />}
        isLoading={isLocating}
        onPress={() => void handleUseLocation()}
      />
      <Field
        label={t('hostNew.where.area')}
        value={draft.area}
        onChangeText={(area) => dispatch({ type: 'set', patch: { area, isAreaEdited: true } })}
        placeholder={t('hostNew.where.areaPlaceholder')}
        maxLength={80}
        error={errors.area}
        help={t('hostNew.where.areaHelp')}
      />
      <Field
        label={t('hostNew.where.address')}
        value={draft.address}
        onChangeText={(address) => dispatch({ type: 'set', patch: { address } })}
        placeholder={t('hostNew.where.addressPlaceholder')}
        maxLength={200}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        error={errors.address}
        help={t('hostNew.where.addressHelp')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { height: 280, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  mapError: { borderColor: colors.danger },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 52 },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.amber,
    borderWidth: 3,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  pinStem: { width: 3, height: 10, backgroundColor: colors.text, borderRadius: 2 },
  locating: { position: 'absolute', top: space.sm, right: space.sm, backgroundColor: colors.card, borderRadius: radius.pill, padding: space.sm },
  error: { marginTop: space.sm, color: colors.danger },
  help: { marginTop: space.sm, color: colors.textFaint },
});
