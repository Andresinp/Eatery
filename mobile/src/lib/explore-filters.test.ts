/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Listing } from './api';
import {
  activeFilterCount,
  applyFilters,
  bookability,
  bookingClosesAt,
  DEFAULT_FILTERS,
  isSoldOut,
  matchingAllergens,
  parseFilters,
  sortForList,
  unmetDietary,
  type Filters,
} from './explore-filter-logic.ts';

const NOW = new Date(2026, 10, 23, 12, 0); // Mon 23 Nov 2026, noon local
const at = (days: number, hour = 20): string => new Date(2026, 10, 23 + days, hour, 0).toISOString();

function listing(over: Partial<Listing> & { id: string }): Listing {
  return {
    host_id: 'h1',
    listing_type: 'table',
    title: 't',
    description: '',
    photos: [],
    currency: '€',
    cuisine_tags: [],
    dietary_tags: [],
    allergen_flags: [],
    price_per_unit: 20,
    booking_fee_rate: 0.12,
    location_lat: 40,
    location_lng: -3,
    location_display: 'Centro',
    status: 'active',
    created_at: at(-5),
    meal_time: at(0),
    meal_end_time: null,
    seats_total: 6,
    seats_available: 4,
    dining_setting: null,
    dining_setting_photos: [],
    drinks_included: false,
    drinks: [],
    product_type_tags: [],
    quantity_total: null,
    quantity_available: null,
    pickup_window_start: null,
    pickup_window_end: null,
    allows_local_delivery: false,
    host: null,
    ...over,
  };
}

const market = (over: Partial<Listing> & { id: string }): Listing =>
  listing({ listing_type: 'market', meal_time: null, pickup_window_start: at(1, 10), quantity_available: 5, ...over });

const ids = (ls: Listing[]): string[] => ls.map((l) => l.id);
const run = (ls: Listing[], f: Partial<Filters>, mine: string[] = []): string[] => ids(applyFilters(ls, { ...DEFAULT_FILTERS, ...f }, mine, NOW));

describe('applyFilters', () => {
  it('keeps everything with the default filters', () => {
    assert.deepEqual(run([listing({ id: 'a' }), market({ id: 'b' })], {}), ['a', 'b']);
  });

  it('filters by type', () => {
    const ls = [listing({ id: 'a' }), market({ id: 'b' })];
    assert.deepEqual(run(ls, { type: 'table' }), ['a']);
    assert.deepEqual(run(ls, { type: 'market' }), ['b']);
  });

  it('filters by when, using the pickup start for market listings', () => {
    const ls = [listing({ id: 'today' }), listing({ id: 'tomorrow', meal_time: at(1) }), listing({ id: 'in5', meal_time: at(5) }), listing({ id: 'in9', meal_time: at(9) }), market({ id: 'mTomorrow' })];
    assert.deepEqual(run(ls, { when: 'today' }), ['today']);
    assert.deepEqual(run(ls, { when: 'tomorrow' }), ['tomorrow', 'mTomorrow']);
    assert.deepEqual(run(ls, { when: 'week' }), ['today', 'tomorrow', 'in5', 'mTomorrow']);
  });

  it('excludes listings with no date when a date filter is on', () => {
    assert.deepEqual(run([listing({ id: 'a', meal_time: null })], { when: 'week' }), []);
  });

  it('requires every dietary tag, case-insensitively', () => {
    const ls = [listing({ id: 'both', dietary_tags: ['Vegan', 'Gluten-Free'] }), listing({ id: 'vegan', dietary_tags: ['vegan'] })];
    assert.deepEqual(run(ls, { dietary: ['Vegan'] }), ['both', 'vegan']);
    assert.deepEqual(run(ls, { dietary: ['Vegan', 'Gluten-Free'] }), ['both']);
  });

  it('applies a max price', () => {
    const ls = [listing({ id: 'cheap', price_per_unit: 10 }), listing({ id: 'edge', price_per_unit: 25 }), listing({ id: 'dear', price_per_unit: 40 })];
    assert.deepEqual(run(ls, { maxPrice: 25 }), ['cheap', 'edge']);
  });

  it('matches any selected cuisine', () => {
    const ls = [listing({ id: 'it', cuisine_tags: ['Italian'] }), listing({ id: 'jp', cuisine_tags: ['Japanese'] }), listing({ id: 'none' })];
    assert.deepEqual(run(ls, { cuisines: ['Italian', 'Japanese'] }), ['it', 'jp']);
  });

  it('applies product types to market listings only and drops tables', () => {
    const ls = [listing({ id: 'table' }), market({ id: 'bread', product_type_tags: ['Bread'] }), market({ id: 'cake', product_type_tags: ['Cake'] })];
    assert.deepEqual(run(ls, { productTypes: ['Bread'] }), ['bread']);
  });

  it('hides listings with my allergens only when asked', () => {
    const ls = [listing({ id: 'nuts', allergen_flags: ['Nuts'] }), listing({ id: 'safe', allergen_flags: ['Dairy'] })];
    assert.deepEqual(run(ls, { hideMyAllergens: true }, ['nuts']), ['safe']);
    assert.deepEqual(run(ls, { hideMyAllergens: false }, ['nuts']), ['nuts', 'safe']);
    assert.deepEqual(run(ls, { hideMyAllergens: true }, []), ['nuts', 'safe']);
  });
});

describe('helpers', () => {
  it('matchingAllergens returns the listing spelling of matches', () => {
    assert.deepEqual(matchingAllergens(listing({ id: 'a', allergen_flags: ['Nuts', 'Eggs'] }), ['eggs', 'Fish']), ['Eggs']);
  });

  it('isSoldOut', () => {
    assert.equal(isSoldOut(listing({ id: 'a', seats_available: 0 })), true);
    assert.equal(isSoldOut(listing({ id: 'b', status: 'full' })), true);
    assert.equal(isSoldOut(market({ id: 'c', quantity_available: 2 })), false);
  });

  it('bookability', () => {
    assert.equal(bookability(listing({ id: 'a' }), null, NOW), 'ok');
    assert.equal(bookability(listing({ id: 'a' }), 'h1', NOW), 'own');
    assert.equal(bookability(listing({ id: 'a', status: 'cancelled' }), 'g', NOW), 'closed');
    assert.equal(bookability(listing({ id: 'a', meal_time: at(-1) }), 'g', NOW), 'past');
    assert.equal(bookability(listing({ id: 'a', seats_available: 0 }), 'g', NOW), 'soldOut');
    assert.equal(bookability(market({ id: 'b', pickup_window_end: at(1, 12) }), 'g', NOW), 'ok');
  });

  it('booking closes half an hour before the end, never before the start', () => {
    const iso = (h: number, m = 0) => new Date(2026, 10, 23, h, m).toISOString();
    const noon = (m: number) => new Date(2026, 10, 23, 12, m);
    // Meal 11:00–13:00: open until 12:30.
    const meal = listing({ id: 'm', meal_time: iso(11), meal_end_time: iso(13) });
    assert.equal(bookingClosesAt(meal)?.toISOString(), iso(12, 30));
    assert.equal(bookability(meal, 'g', noon(29)), 'ok');
    assert.equal(bookability(meal, 'g', noon(30)), 'past');
    // No end time: three hours from the start, so 11:00 → open until 13:30.
    assert.equal(bookingClosesAt(listing({ id: 'n', meal_time: iso(11) }))?.toISOString(), iso(13, 30));
    // Pickup 12:00–12:20 is shorter than half an hour: open until it starts.
    const short = market({ id: 's', pickup_window_start: iso(12), pickup_window_end: iso(12, 20) });
    assert.equal(bookingClosesAt(short)?.toISOString(), iso(12));
    // Pickup with no end: open until the start.
    assert.equal(bookingClosesAt(market({ id: 'p', pickup_window_start: iso(15) }))?.toISOString(), iso(15));
  });

  it('activeFilterCount ignores type and the allergen default', () => {
    assert.equal(activeFilterCount(DEFAULT_FILTERS), 0);
    assert.equal(activeFilterCount({ ...DEFAULT_FILTERS, type: 'table', when: 'today', dietary: ['Vegan', 'Halal'], maxPrice: 20 }), 3);
  });

  it('parseFilters falls back on malformed data', () => {
    assert.deepEqual(parseFilters(null), DEFAULT_FILTERS);
    assert.deepEqual(parseFilters({ type: 'boat', when: 'today', dietary: ['Vegan', 3], maxPrice: -1, hideMyAllergens: false }), {
      ...DEFAULT_FILTERS,
      when: 'today',
      dietary: ['Vegan'],
      hideMyAllergens: false,
    });
  });

  it('unmetDietary names preferences the listing does not mark', () => {
    const l = listing({ id: 'a', dietary_tags: ['vegetarian', 'Halal'] });
    assert.deepEqual(unmetDietary(l, []), []);
    assert.deepEqual(unmetDietary(l, ['halal', 'Vegetarian']), []);
    assert.deepEqual(unmetDietary(l, ['Vegan', 'halal']), ['Vegan']);
  });

  it('sortForList orders by distance, price or places left', () => {
    const items = [
      { listing: listing({ id: 'far-cheap', price_per_unit: 10, seats_available: 1 }), km: 5 },
      { listing: listing({ id: 'near-dear', price_per_unit: 30, seats_available: 8 }), km: 1 },
      { listing: listing({ id: 'mid', price_per_unit: 10, seats_available: 8 }), km: 2 },
    ];
    const ids = (sorted: typeof items) => sorted.map((i) => i.listing.id);
    assert.deepEqual(ids(sortForList(items, 'distance')), ['near-dear', 'mid', 'far-cheap']);
    assert.deepEqual(ids(sortForList(items, 'price')), ['mid', 'far-cheap', 'near-dear']);
    assert.deepEqual(ids(sortForList(items, 'seats')), ['near-dear', 'mid', 'far-cheap']);
    assert.deepEqual(ids(items), ['far-cheap', 'near-dear', 'mid']); // input untouched
  });
});
