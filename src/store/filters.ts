import { create } from "zustand";
import type { Listing } from "../types";

export type ListingTypeFilter = "all" | "table" | "market";

export interface FiltersState {
  listingType: ListingTypeFilter;
  dietary: string[];
  cuisines: string[];
  productTypes: string[];
  mealTimes: string[];
  maxBudget: number;

  setListingType: (t: ListingTypeFilter) => void;
  toggleDietary: (tag: string) => void;
  toggleCuisine: (tag: string) => void;
  toggleProductType: (tag: string) => void;
  toggleMealTime: (tag: string) => void;
  setMaxBudget: (v: number) => void;
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
  clearAll: () =>
    set({
      listingType: "all",
      dietary: [],
      cuisines: [],
      productTypes: [],
      mealTimes: [],
      maxBudget: MAX_BUDGET,
    }),
}));

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

export function applyFilters(
  listings: Listing[],
  state: Pick<FiltersState, "listingType" | "dietary" | "cuisines" | "productTypes" | "mealTimes" | "maxBudget">,
): Listing[] {
  return listings.filter((l) => {
    if (state.listingType !== "all" && l.listing_type !== state.listingType) return false;
    if (l.price_per_unit > state.maxBudget) return false;
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
