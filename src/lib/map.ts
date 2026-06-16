// Map style selector — uses Mapbox when VITE_MAPBOX_TOKEN is set,
// falls back to OpenFreeMap (no key) otherwise. MapLibre GL JS reads
// both formats natively, so we only need to swap the style URL.

const token = import.meta.env.VITE_MAPBOX_TOKEN;

export const MAP_STYLE_URL = token
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${token}`
  : "https://tiles.openfreemap.org/styles/positron";

export const usingMapbox = !!token;

export interface ReverseGeocodeResult {
  /** Best-guess public neighborhood label (suburb / quarter / district). */
  neighborhood: string;
  /** Full human-readable address line, when available. */
  address: string;
}

/**
 * Reverse-geocode a coordinate into a neighborhood + address using the free
 * OpenStreetMap Nominatim service (CORS-enabled, no API key). Pass an
 * AbortSignal so stale lookups can be cancelled while the pin keeps moving.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address ?? {};
    const neighborhood: string =
      a.neighbourhood ||
      a.suburb ||
      a.quarter ||
      a.city_district ||
      a.residential ||
      a.town ||
      a.village ||
      a.city ||
      a.county ||
      "";
    return { neighborhood, address: data?.display_name ?? "" };
  } catch {
    // AbortError or network failure — caller keeps the previous value.
    return null;
  }
}
