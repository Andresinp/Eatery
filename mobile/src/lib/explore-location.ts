// Where the person is, for the map. Permission is asked only when they tap "locate"; on open we
// only read it if it was already granted.

import * as Location from 'expo-location';

import type { LngLatPair } from './explore-map';

async function position(): Promise<LngLatPair> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
  const fix = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return [fix.coords.longitude, fix.coords.latitude];
}

// The device position if location is already allowed, else null. Never prompts.
export async function positionIfAllowed(): Promise<LngLatPair | null> {
  const { granted } = await Location.getForegroundPermissionsAsync();
  return granted ? position() : null;
}

export type LocateResult = { status: 'ok'; center: LngLatPair } | { status: 'denied' };

// Asks for permission if it can still be asked, then reads the position.
export async function locate(): Promise<LocateResult> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };
  return { status: 'ok', center: await position() };
}
