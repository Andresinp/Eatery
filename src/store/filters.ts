import { create } from "zustand";
import type { Listing } from "../types";

export type ListingTypeFilter = "all" | "table" | "market";

/** "any" = no date constraint. "custom" pairs with `customDate` (YYYY-MM-DD). */
export type DateMode = "any" | "today" | "week" | "custom";

export interface FiltersState {
  listingType: ListingTypeFilter;
  dietary: string[];
  cuisines: string[];
  productTypes: string[];
  mealTimes: string[];
  maxBudget: number;
  dateMode: DateMode;
  customDate: string | null;

  setListingType: (t: ListingTypeFilter) => void;
  toggleDietary: (tag: string) => void;
  toggleCuisine: (tag: string) => void;
  toggleProductType: (tag: string) => void;
  toggleMealTime: (tag: string) => void;
  setMaxBudget: (v: number) => void;
  setDate: (mode: DateMode, date?: string | null) => void;
  clearAll: () => void;
}

export const MAX_BUDGET = 100;

export const useFilters = create<FiltersState>((set) => ({
  listingType: "all",
  dietary: [],
  cuisines: [],
  productTypes: [],
  mealTimes: [],
  maxBudget: MAX_BUDGET,
  dateMode: "any",
  customDate: null,

  setListingType: (t) => set({ listingType: t }),
  toggleDietary: (tag) =>
    set((s) => ({
      dietary: s.dietary.includes(tag)
        ? s.dietary.filter((x) => x !== tag)
        : [...s.dietary, tag],
    })),
  toggleCuisine: (tag) =>
    set((s) => ({
      cuisines: s.cuisines.includes(tag)
        ? s.cuisines.filter((x) => x !== tag)
        : [...s.cuisines, tag],
    })),
  toggleProductType: (tag) =>
    set((s) => ({
      productTypes: s.productTypes.includes(tag)
        ? s.productTypes.filter((x) => x !== tag)
        : [...s.productTypes, tag],
    })),
  toggleMealTime: (tag) =>
    set((s) => ({
      mealTimes: s.mealTimes.includes(tag)
        ? s.mealTimes.filter((x) => x !== tag)
        : [...s.mealTimes, tag],
    })),
  setMaxBudget: (v) => set({ maxBudget: v }),
  setDate: (mode, date) =>
    set({ dateMode: mode, customDate: date ?? null }),
  clearAll: () =>
    set({
      listingType: "all",
      dietary: [],
      cuisines: [],
      productTypes: [],
      mealTimes: [],
      maxBudget: MAX_BUDGET,
      dateMode: "any",
      customDate: null,
    }),
}));

/** The subset of filter state that actually narrows the listing set. */
export type FilterCriteria = Pick<
  FiltersState,
  "listingType" | "dietary" | "cuisines" | "productTypes" | "mealTimes" | "maxBudget" | "dateMode" | "customDate"
>;

/** Number of distinct active filter constraints — drives the filter-button badge. */
export function activeFilterCount(state: FilterCriteria): number {
  return (
    (state.listingType !== "all" ? 1 : 0) +
    state.dietary.length +
    state.cuisines.length +
    state.productTypes.length +
    state.mealTimes.length +
    (state.maxBudget < MAX_BUDGET ? 1 : 0) +
    (state.dateMode !== "any" ? 1 : 0)
  );
}

/**
 * The date a listing is "scheduled" for: a table's seating time, or a market
 * pickup window's start. Live (Supabase) rows carry ISO timestamps here; the
 * bundled mock data uses human-readable strings that don't parse — in that case
 * we return null and the date filter treats the listing as unconstrained.
 */
export function getListingDate(l: Listing): Date | null {
  const raw = l.listing_type === "table" ? l.meal_time : l.pickup_window_start;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Does a listing's date satisfy the active date constraint? */
function matchesDate(d: Date, mode: DateMode, customDate: string | null): boolean {
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  if (mode === "today") {
    return day.getTime() === today.getTime();
  }
  if (mode === "week") {
    // Today through the next 7 days (inclusive), so "this week" always shows
    // what's coming up rather than what's already passed.
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return day.getTime() >= today.getTime() && day.getTime() <= end.getTime();
  }
  if (mode === "custom") {
    if (!customDate) return true;
    const target = new Date(`${customDate}T00:00:00`);
    if (Number.isNaN(target.getTime())) return true;
    return day.getTime() === startOfDay(target).getTime();
  }
  return true;
}

export function getMealTimeCategory(meal_time: string): string[] {
  const match = meal_time.match(/(\d+):(\d+)/);
  if (!match) return [];
  const hour = parseInt(match[1]);
  const cats: string[] = [];
  if (hour >= 6 && hour < 11) cats.push("Breakfast");
  if (hour >= 10 && hour < 13) cats.push("Brunch");
  if (hour >= 12 && hour < 16) cats.push("Lunch");
  if (hour >= 17 && hour < 21) cats.push("Dinner");
  if (hour >= 21 || hour < 3) cats.push("Late Night");
  return cats;
}

export function applyFilters(listings: Listing[], state: FilterCriteria): Listing[] {
  return listings.filter((l) => {
    if (state.listingType !== "all" && l.listing_type !== state.listingType) return false;
    // Budget only constrains when the slider is below max. At MAX_BUDGET the
    // label reads "€100+", i.e. no upper limit — so pricier listings (and the
    // tag counts that include them) stay visible by default.
    if (state.maxBudget < MAX_BUDGET && l.price_per_unit > state.maxBudget) return false;
    // Date: only exclude listings whose (parseable) date falls outside the window.
    if (state.dateMode !== "any") {
      const d = getListingDate(l);
      if (d && !matchesDate(d, state.dateMode, state.customDate)) return false;
    }
    // Dietary: listing must have ALL selected tags
    if (state.dietary.length > 0 && !state.dietary.every((d) => l.dietary_tags.includes(d))) return false;
    // Cuisine: listing must match ANY selected cuisine
    if (state.cuisines.length > 0 && !state.cuisines.some((c) => l.cuisine_tags.includes(c))) return false;
    // Product types: applies only to market listings
    if (state.productTypes.length > 0) {
      if (l.listing_type !== "market") return false;
      if (!state.productTypes.some((p) => l.product_type_tags.includes(p))) return false;
    }
    // Meal times: applies only to table listings
    if (state.mealTimes.length > 0) {
      if (l.listing_type !== "table") return false;
      const cats = getMealTimeCategory(l.meal_time);
      if (!state.mealTimes.some((t) => cats.includes(t))) return false;
    }
    return true;
  });
}

/** Multi-select tag groups whose counts are computed contextually. */
type TagGroup = "dietary" | "cuisines" | "productTypes" | "mealTimes";

/**
 * How many listings would match if `option` were added to the current
 * selection for `group`. This is what the badge beside each chip shows, so the
 * number always equals the result count you get after clicking it — counts and
 * results are derived from the exact same filtered dataset.
 */
export function countWithOption(
  listings: Listing[],
  state: FilterCriteria,
  group: TagGroup,
  option: string,
): number {
  const current = state[group];
  const next: FilterCriteria = current.includes(option)
    ? state
    : { ...state, [group]: [...current, option] };
  return applyFilters(listings, next).length;
}
