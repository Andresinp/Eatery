// Map style selector — uses Mapbox when VITE_MAPBOX_TOKEN is set,
// falls back to OpenFreeMap (no key) otherwise. MapLibre GL JS reads
// both formats natively, so we only need to swap the style URL.

const token = import.meta.env.VITE_MAPBOX_TOKEN;

export const MAP_STYLE_URL = token
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${token}`
  : "https://tiles.openfreemap.org/styles/positron";

export const usingMapbox = !!token;

// ---- Geolocation helpers ----------------------------------------------------
// MapLibre and our markers use [lng, lat] ordering throughout.
export type LngLat = [number, number];

const LAST_CENTER_KEY = "eatery:last-center";

/** Persist the last known good center so the next launch starts close to home. */
export function saveLastCenter(center: LngLat) {
  try {
    localStorage.setItem(LAST_CENTER_KEY, JSON.stringify(center));
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

/** Read the last known good center, if any. */
export function readLastCenter(): LngLat | null {
  try {
    const raw = localStorage.getItem(LAST_CENTER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number") {
      return [v[0], v[1]];
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Promise wrapper around the browser geolocation API. Resolves to [lng, lat]. */
export function getBrowserLocation(opts?: PositionOptions): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...opts },
    );
  });
}

/** Approximate the user's city from their IP. Best-effort; resolves null on failure. */
export async function getApproxLocationByIP(): Promise<LngLat | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return null;
    const data = await res.json();
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
  } catch {
    /* network blocked or offline — fall through */
  }
  return null;
}

export type CenterSource = "gps" | "ip" | "fallback";

/**
 * Resolve the best initial map center on launch:
 *   1. Precise GPS, when location permission isn't denied.
 *   2. Approximate IP-based city.
 *   3. The provided fallback (e.g. a manually chosen city or the app default).
 */
export async function resolveInitialCenter(
  fallback: LngLat,
): Promise<{ center: LngLat; source: CenterSource }> {
  let permissionDenied = false;
  try {
    const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    permissionDenied = perm?.state === "denied";
  } catch {
    /* Permissions API unsupported — just try geolocation below */
  }

  if (!permissionDenied) {
    try {
      const loc = await getBrowserLocation({ timeout: 8000 });
      return { center: loc, source: "gps" };
    } catch {
      /* denied at prompt or timed out — fall back */
    }
  }

  const ip = await getApproxLocationByIP();
  if (ip) return { center: ip, source: "ip" };

  return { center: fallback, source: "fallback" };
}
