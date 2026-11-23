import { i18n } from '@/i18n';

import type { Listing } from './api';

// Formatting in the reader's language. Prices keep the listing's own prefix ("₺", "CHF") exactly
// as the web app shows them; the number is formatted for the locale.

const ZERO_DECIMAL = new Set(['¥', '₩', 'CLP', 'HUF', 'IDR', 'COP']);

function locale(): string {
  return i18n.language || 'en';
}

export function formatPrice(amount: number, currency: string): string {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : Number.isInteger(amount) ? 0 : 2;
  const n = new Intl.NumberFormat(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  return /^[A-Z]{3}$/.test(currency) ? `${n} ${currency}` : `${currency}${n}`;
}

// Always two decimals where the currency has them: deposits and balances.
export function formatMoney(amount: number, currency: string): string {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const n = new Intl.NumberFormat(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  return /^[A-Z]{3}$/.test(currency) ? `${n} ${currency}` : `${currency}${n}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Today", "Tomorrow" or "Sat 14 Dec".
export function formatDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isSameDay(d, now)) return i18n.t('date.today');
  if (isSameDay(d, tomorrow)) return i18n.t('date.tomorrow');
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

// "Today · 20:30–23:00" for a table, "Tomorrow · 10:00–12:00" for a pickup window.
export function formatListingWhen(listing: Pick<Listing, 'listing_type' | 'meal_time' | 'meal_end_time' | 'pickup_window_start' | 'pickup_window_end'>): string {
  const start = listing.listing_type === 'table' ? listing.meal_time : listing.pickup_window_start;
  const end = listing.listing_type === 'table' ? listing.meal_end_time : listing.pickup_window_end;
  if (!start) return '';
  return `${formatDay(start)} · ${formatTime(start)}${end ? `–${formatTime(end)}` : ''}`;
}

export function eventStart(listing: Pick<Listing, 'listing_type' | 'meal_time' | 'pickup_window_start'>): string | null {
  return listing.listing_type === 'table' ? listing.meal_time : listing.pickup_window_start;
}

export function formatRelative(iso: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

// Great-circle distance in km, for "1.2 km away" and sorting.
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(km: number): string {
  const n = new Intl.NumberFormat(locale(), { maximumFractionDigits: km < 10 ? 1 : 0 });
  return km < 1 ? `${Math.round(km * 1000)} m` : `${n.format(km)} km`;
}
