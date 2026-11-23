// Explore's shared state: the filters (persisted) and the last loaded listings (so the filters
// sheet can count results without fetching again). Module-level stores read with
// useSyncExternalStore. localStorage is expo-sqlite's, installed globally by lib/supabase.

import { useSyncExternalStore } from 'react';

import type { Listing } from './api';
import { DEFAULT_FILTERS, parseFilters, type Filters } from './explore-filter-logic';
import { logError } from './log';

const FILTERS_KEY = 'eatery.explore.filters';

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch (error) {
    logError(`explore: read ${key}`, error);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logError(`explore: write ${key}`, error);
  }
}

// ---- Filters ----------------------------------------------------------------------------------

let filters: Filters | null = null;
const filterListeners = new Set<() => void>();

function currentFilters(): Filters {
  if (filters === null) filters = parseFilters(readJson(FILTERS_KEY));
  return filters;
}

function subscribeFilters(listener: () => void): () => void {
  filterListeners.add(listener);
  return () => filterListeners.delete(listener);
}

export function setFilters(next: Filters | ((prev: Filters) => Filters)): void {
  filters = typeof next === 'function' ? next(currentFilters()) : next;
  writeJson(FILTERS_KEY, filters);
  filterListeners.forEach((l) => l());
}

export function clearFilters(): void {
  // Clearing keeps the type (it has its own control on the map) and the allergen choice.
  setFilters((prev) => ({ ...DEFAULT_FILTERS, type: prev.type, hideMyAllergens: prev.hideMyAllergens }));
}

export function useFilters(): Filters {
  return useSyncExternalStore(subscribeFilters, currentFilters, currentFilters);
}

// ---- Last loaded listings --------------------------------------------------------------------

let listings: readonly Listing[] = [];
const listingListeners = new Set<() => void>();

export function setExploreListings(next: readonly Listing[]): void {
  if (next === listings) return;
  listings = next;
  listingListeners.forEach((l) => l());
}

function subscribeListings(listener: () => void): () => void {
  listingListeners.add(listener);
  return () => listingListeners.delete(listener);
}

const getListings = (): readonly Listing[] => listings;

export function useExploreListings(): readonly Listing[] {
  return useSyncExternalStore(subscribeListings, getListings, getListings);
}
