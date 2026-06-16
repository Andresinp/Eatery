// Map style selector — uses Mapbox when VITE_MAPBOX_TOKEN is set,
// falls back to OpenFreeMap (no key) otherwise. MapLibre GL JS reads
// both formats natively, so we only need to swap the style URL.

const token = import.meta.env.VITE_MAPBOX_TOKEN;

export const MAP_STYLE_URL = token
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${token}`
  : "https://tiles.openfreemap.org/styles/positron";

export const usingMapbox = !!token;

/** A map coordinate as a [longitude, latitude] tuple (MapLibre's LngLatLike). */
export type LngLat = [number, number];

const LAST_CENTER_KEY = "eatery.lastCenter";

/** Read the last saved map center from localStorage, or null if unavailable. */
export function readLastCenter(): LngLat | null {
  try {
    const raw = localStorage.getItem(LAST_CENTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "number" &&
      typeof parsed[1] === "number"
    ) {
      return [parsed[0], parsed[1]];
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist the last map center so the map opens where the user left off. */
export function saveLastCenter(center: LngLat): void {
  try {
    localStorage.setItem(LAST_CENTER_KEY, JSON.stringify(center));
  } catch {
    // Private mode / storage full — non-fatal, just skip persistence.
  }
}

/**
 * Resolve the device's current location via the browser Geolocation API.
 * Resolves to a [lng, lat] tuple, or rejects if permission is denied or the
 * fix times out.
 */
export function getBrowserLocation(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

/**
 * Coarse IP-based geolocation as a fallback when GPS is unavailable. Uses the
 * free, keyless ipapi.co service. Resolves to null on any failure.
 */
async function getIpLocation(): Promise<LngLat | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return null;
    const data = await res.json();
    const lng = Number(data?.longitude);
    const lat = Number(data?.latitude);
    if (Number.isFinite(lng) && Number.isFinite(lat)) return [lng, lat];
    return null;
  } catch {
    return null;
  }
}

/** Where an initial map center came from. */
export type CenterSource = "gps" | "ip" | "fallback";

/**
 * Resolve the best initial map center: GPS first, IP geolocation next, and the
 * provided fallback last. The caller can use `source` to decide how much to
 * trust the result (e.g. only drop a "you are here" marker for a GPS fix).
 */
export async function resolveInitialCenter(
  fallback: LngLat,
): Promise<{ center: LngLat; source: CenterSource }> {
  try {
    const center = await getBrowserLocation();
    return { center, source: "gps" };
  } catch {
    const ip = await getIpLocation();
    if (ip) return { center: ip, source: "ip" };
    return { center: fallback, source: "fallback" };
  }
}

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
