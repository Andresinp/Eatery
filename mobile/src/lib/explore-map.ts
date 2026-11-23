// Map constants and the remembered map centre for Explore.

import { logError } from './log';

export type LngLatPair = [lng: number, lat: number];

// The web app's default centre (Madrid): used when nothing better is known.
export const DEFAULT_MAP_CENTER: LngLatPair = [-3.7038, 40.4168];
export const DEFAULT_ZOOM = 13;

// OpenFreeMap: free, no key. MapLibre's attribution must stay visible (licence).
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const CENTER_KEY = 'eatery.explore.center';

// localStorage is expo-sqlite's, installed globally by lib/supabase.
export function savedCenter(): LngLatPair | null {
  let raw: unknown;
  try {
    const text = localStorage.getItem(CENTER_KEY);
    raw = text ? (JSON.parse(text) as unknown) : null;
  } catch (error) {
    logError('explore: read map centre', error);
    return null;
  }
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const [lng, lat] = raw as unknown[];
  if (typeof lng !== 'number' || typeof lat !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

export function saveCenter(center: LngLatPair): void {
  try {
    localStorage.setItem(CENTER_KEY, JSON.stringify(center));
  } catch (error) {
    logError('explore: save map centre', error);
  }
}
