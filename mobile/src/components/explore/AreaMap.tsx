import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MAP_STYLE_URL } from '@/lib/explore-map';
import { colors, radius } from '@/theme';

const RADIUS_M = 450;

// A circle polygon of `meters` around a point (64 steps is smooth at this zoom).
function circle(lng: number, lat: number, meters: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const steps = 64;
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

type Props = { lat: number; lng: number; height?: number };

// A small, still map of the area: a soft circle, never an exact pin (the address comes after booking).
export function AreaMap({ lat, lng, height = 180 }: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.box, { height }]} accessible accessibilityRole="image" accessibilityLabel={t('listingDetail.areaMapLabel')}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        dragPan={false}
        touchZoom={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        attribution
        attributionPosition={{ bottom: 6, right: 6 }}
        tintColor={colors.amberDeep}>
        <Camera initialViewState={{ center: [lng, lat], zoom: 13.5 }} />
        <GeoJSONSource id="area" data={circle(lng, lat, RADIUS_M)}>
          <Layer id="area-fill" type="fill" paint={{ 'fill-color': colors.amber, 'fill-opacity': 0.25 }} />
          <Layer id="area-line" type="line" paint={{ 'line-color': colors.amberDeep, 'line-width': 2, 'line-opacity': 0.7 }} />
        </GeoJSONSource>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
});
