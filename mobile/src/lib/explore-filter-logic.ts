// Pure filter logic for Explore. Imports types only, so `node --test --experimental-strip-types`
// can run it without React Native (see explore-filters.test.ts).

import type { Listing } from './api';

export type TypeFilter = 'all' | 'table' | 'market';
export type WhenFilter = 'any' | 'today' | 'tomorrow' | 'week';

export type Filters = {
  type: TypeFilter;
  when: WhenFilter;
  dietary: string[]; // listing must have every one
  maxPrice: number | null; // null = no limit
  cuisines: string[]; // listing must have any one
  productTypes: string[]; // market only; any one
  hideMyAllergens: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  type: 'all',
  when: 'any',
  dietary: [],
  maxPrice: null,
  cuisines: [],
  productTypes: [],
  hideMyAllergens: true,
};

const lower = (values: readonly string[]): string[] => values.map((v) => v.toLowerCase());

// The allergens in this listing that I exclude (as the listing spells them), or [].
export function matchingAllergens(listing: Pick<Listing, 'allergen_flags'>, myAllergens: readonly string[]): string[] {
  if (myAllergens.length === 0) return [];
  const mine = new Set(lower(myAllergens));
  return listing.allergen_flags.filter((a) => mine.has(a.toLowerCase()));
}

// My dietary preferences (vegan, halal…) that the host has NOT marked on this listing. A warning,
// not a filter: hosts often leave tags out, so the guest should ask rather than never see it.
export function unmetDietary(listing: Pick<Listing, 'dietary_tags'>, myDiets: readonly string[]): string[] {
  if (myDiets.length === 0) return [];
  const marked = new Set(lower(listing.dietary_tags));
  return myDiets.filter((d) => !marked.has(d.toLowerCase()));
}

export type ListSort = 'distance' | 'price' | 'seats';

// The list view's order: nearest first, cheapest first, or most places left first. Ties fall
// back to distance so the order never jumps around between renders.
export function sortForList<T extends { listing: Listing; km: number }>(items: readonly T[], sort: ListSort): T[] {
  const byDistance = (a: T, b: T) => a.km - b.km;
  const compare =
    sort === 'price'
      ? (a: T, b: T) => a.listing.price_per_unit - b.listing.price_per_unit || byDistance(a, b)
      : sort === 'seats'
        ? (a: T, b: T) => availableCount(b.listing) - availableCount(a.listing) || byDistance(a, b)
        : byDistance;
  return [...items].sort(compare);
}

export function availableCount(listing: Pick<Listing, 'listing_type' | 'seats_available' | 'quantity_available'>): number {
  return (listing.listing_type === 'table' ? listing.seats_available : listing.quantity_available) ?? 0;
}

export function isSoldOut(listing: Pick<Listing, 'listing_type' | 'seats_available' | 'quantity_available' | 'status'>): boolean {
  return listing.status === 'full' || availableCount(listing) <= 0;
}

export type Bookability = 'ok' | 'own' | 'closed' | 'past' | 'soldOut';

// Whether the person can book this listing now, and if not why. `userId` null = signed out (still
// 'ok': the button then leads to sign-in).
export function bookability(listing: Listing, userId: string | null, now: Date): Bookability {
  if (userId !== null && listing.host_id === userId) return 'own';
  if (listing.status === 'cancelled' || listing.status === 'completed') return 'closed';
  const endIso =
    listing.listing_type === 'table'
      ? (listing.meal_end_time ?? listing.meal_time)
      : (listing.pickup_window_end ?? listing.pickup_window_start);
  if (endIso && new Date(endIso).getTime() < now.getTime()) return 'past';
  if (isSoldOut(listing)) return 'soldOut';
  return 'ok';
}

function startOf(listing: Pick<Listing, 'listing_type' | 'meal_time' | 'pickup_window_start'>): Date | null {
  const iso = listing.listing_type === 'table' ? listing.meal_time : listing.pickup_window_start;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayIndex(d: Date): number {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
}

function matchesWhen(start: Date | null, when: WhenFilter, now: Date): boolean {
  if (when === 'any') return true;
  if (!start) return false;
  const diff = dayIndex(start) - dayIndex(now);
  if (when === 'today') return diff <= 0; // today, or already running
  if (when === 'tomorrow') return diff === 1;
  return diff <= 6; // this week: today and the next six days
}

export function applyFilters(listings: readonly Listing[], filters: Filters, myAllergens: readonly string[], now: Date): Listing[] {
  const dietary = lower(filters.dietary);
  const cuisines = lower(filters.cuisines);
  const products = lower(filters.productTypes);
  return listings.filter((l) => {
    if (filters.type !== 'all' && l.listing_type !== filters.type) return false;
    if (!matchesWhen(startOf(l), filters.when, now)) return false;
    if (filters.maxPrice !== null && l.price_per_unit > filters.maxPrice) return false;
    if (dietary.length > 0) {
      const tags = new Set(lower(l.dietary_tags));
      if (!dietary.every((d) => tags.has(d))) return false;
    }
    if (cuisines.length > 0) {
      const tags = new Set(lower(l.cuisine_tags));
      if (!cuisines.some((c) => tags.has(c))) return false;
    }
    if (products.length > 0) {
      if (l.listing_type !== 'market') return false;
      const tags = new Set(lower(l.product_type_tags));
      if (!products.some((p) => tags.has(p))) return false;
    }
    if (filters.hideMyAllergens && matchingAllergens(l, myAllergens).length > 0) return false;
    return true;
  });
}

// Product types only exist on market listings, so choosing tables drops them.
export function withType(prev: Filters, type: TypeFilter): Filters {
  return { ...prev, type, productTypes: type === 'table' ? [] : prev.productTypes };
}

// For the filter button badge. The type has its own segmented control, so it is not counted;
// hiding my allergens is the default, so it is not counted either.
export function activeFilterCount(filters: Filters): number {
  return (
    (filters.when !== 'any' ? 1 : 0) +
    (filters.dietary.length > 0 ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.cuisines.length > 0 ? 1 : 0) +
    (filters.productTypes.length > 0 ? 1 : 0)
  );
}

// Validates whatever was persisted; anything malformed falls back to the default for that field.
export function parseFilters(raw: unknown): Filters {
  if (!raw || typeof raw !== 'object') return DEFAULT_FILTERS;
  const r = raw as Record<string, unknown>;
  const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    type: r.type === 'table' || r.type === 'market' ? r.type : 'all',
    when: r.when === 'today' || r.when === 'tomorrow' || r.when === 'week' ? r.when : 'any',
    dietary: strings(r.dietary),
    maxPrice: typeof r.maxPrice === 'number' && Number.isFinite(r.maxPrice) && r.maxPrice > 0 ? r.maxPrice : null,
    cuisines: strings(r.cuisines),
    productTypes: strings(r.productTypes),
    hideMyAllergens: typeof r.hideMyAllergens === 'boolean' ? r.hideMyAllergens : true,
  };
}
