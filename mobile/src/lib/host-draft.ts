import type { TFunction } from 'i18next';

import type { DiningSetting, Listing, ListingInput, ListingType } from './api';

// The listing a host is writing, as one reducer: the new-listing wizard and the edit screen share
// it, so both validate the same way and turn it into the same ListingInput.

export type PhotoItem = {
  id: string;
  localUri: string; // what the host picked, shown while the upload runs
  base64: string | null; // kept until uploaded, for a retry
  url: string | null; // public URL once uploaded
  status: 'uploading' | 'done' | 'failed';
};

export type Draft = {
  listingType: ListingType;
  photos: PhotoItem[];
  title: string;
  description: string;
  tags: string[]; // cuisine tags for a table, product types for a market
  start: Date; // meal start, or pickup window start
  end: Date;
  seats: number;
  diningSetting: DiningSetting;
  drinksIncluded: boolean;
  drinks: string[];
  quantity: number;
  lat: number | null;
  lng: number | null;
  area: string;
  isAreaEdited: boolean; // the host typed the area: reverse geocoding no longer overwrites it
  address: string;
  allergens: string[];
  dietary: string[];
  suggestedAllergens: string[];
  suggestedDietary: string[];
  suggestedFor: string | null; // title + description the suggestions were made for
  isSafetyChecked: boolean;
  price: string; // as typed
  currency: string;
};

export type DraftAction =
  | { type: 'set'; patch: Partial<Draft> }
  | { type: 'addPhoto'; photo: PhotoItem }
  | { type: 'updatePhoto'; id: string; patch: Partial<PhotoItem> }
  | { type: 'removePhoto'; id: string }
  | { type: 'makeCover'; id: string }
  | { type: 'applySuggestions'; source: string; allergens: string[]; dietary: string[] };

export type DraftState = { draft: Draft; isDirty: boolean };

export const MAX_PHOTOS = 6;
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 1500;
export const SEATS_MAX = 30;
export const QUANTITY_MAX = 200;
// Preview only: the server owns the real rate (listings.booking_fee_rate).
export const PREVIEW_DEPOSIT_RATE = 0.12;

function nextEvening(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20, 0, 0, 0);
  return d;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600_000);
}

export function emptyDraft(currency: string): Draft {
  const start = nextEvening();
  return {
    listingType: 'table',
    photos: [],
    title: '',
    description: '',
    tags: [],
    start,
    end: addHours(start, 3),
    seats: 6,
    diningSetting: 'indoor_table',
    drinksIncluded: false,
    drinks: [],
    quantity: 12,
    lat: null,
    lng: null,
    area: '',
    isAreaEdited: false,
    address: '',
    allergens: [],
    dietary: [],
    suggestedAllergens: [],
    suggestedDietary: [],
    suggestedFor: null,
    isSafetyChecked: false,
    price: '',
    currency,
  };
}

export function draftFromListing(listing: Listing, address: string | null): Draft {
  const isTable = listing.listing_type === 'table';
  const startIso = isTable ? listing.meal_time : listing.pickup_window_start;
  const endIso = isTable ? listing.meal_end_time : listing.pickup_window_end;
  const start = startIso ? new Date(startIso) : nextEvening();
  return {
    listingType: listing.listing_type,
    photos: listing.photos.map((url) => ({ id: url, localUri: url, base64: null, url, status: 'done' as const })),
    title: listing.title,
    description: listing.description,
    tags: isTable ? listing.cuisine_tags : listing.product_type_tags,
    start,
    end: endIso ? new Date(endIso) : addHours(start, 3),
    seats: listing.seats_total ?? 6,
    diningSetting: listing.dining_setting ?? 'indoor_table',
    drinksIncluded: listing.drinks_included,
    drinks: listing.drinks,
    quantity: listing.quantity_total ?? 12,
    lat: listing.location_lat,
    lng: listing.location_lng,
    area: listing.location_display,
    isAreaEdited: true,
    address: address ?? '',
    allergens: listing.allergen_flags,
    dietary: listing.dietary_tags,
    suggestedAllergens: [],
    suggestedDietary: [],
    suggestedFor: `${listing.title}\n${listing.description}`,
    isSafetyChecked: true,
    price: String(listing.price_per_unit),
    currency: listing.currency,
  };
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  const { draft } = state;
  switch (action.type) {
    case 'set':
      return { draft: { ...draft, ...action.patch }, isDirty: true };
    case 'addPhoto':
      if (draft.photos.length >= MAX_PHOTOS) return state;
      return { draft: { ...draft, photos: [...draft.photos, action.photo] }, isDirty: true };
    case 'updatePhoto':
      return {
        ...state,
        draft: { ...draft, photos: draft.photos.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) },
      };
    case 'removePhoto':
      return { draft: { ...draft, photos: draft.photos.filter((p) => p.id !== action.id) }, isDirty: true };
    case 'makeCover': {
      const photo = draft.photos.find((p) => p.id === action.id);
      if (!photo) return state;
      return { draft: { ...draft, photos: [photo, ...draft.photos.filter((p) => p.id !== action.id)] }, isDirty: true };
    }
    case 'applySuggestions':
      // Suggestions are added to what the host already chose, never taken away; they must re-check.
      return {
        draft: {
          ...draft,
          suggestedFor: action.source,
          suggestedAllergens: action.allergens,
          suggestedDietary: action.dietary,
          allergens: [...new Set([...draft.allergens, ...action.allergens])],
          dietary: [...new Set([...draft.dietary, ...action.dietary])],
          isSafetyChecked: false,
        },
        isDirty: true,
      };
  }
}

// ---- Dates ------------------------------------------------------------------------------------

// Keeps each time of day and moves both to `day`.
export function withDay(time: Date, day: Date): Date {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

// The end on the start's day; an end before the start in the small hours runs past midnight.
export function endFromTime(start: Date, time: Date): Date {
  const end = withDay(time, start);
  if (end.getTime() <= start.getTime() && end.getHours() < 6) end.setDate(end.getDate() + 1);
  return end;
}

// ---- Money ------------------------------------------------------------------------------------

export function parsePrice(text: string): number | null {
  const n = Number(text.replace(',', '.').trim());
  if (!text.trim() || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function previewSplit(price: number): { deposit: number; rest: number } {
  const deposit = Math.round(price * PREVIEW_DEPOSIT_RATE * 100) / 100;
  return { deposit, rest: Math.round((price - deposit) * 100) / 100 };
}

export const roundCoord = (n: number): number => Math.round(n * 1e6) / 1e6;

// ---- Validation -------------------------------------------------------------------------------

export type StepId = 'type' | 'photos' | 'basics' | 'when' | 'where' | 'safety' | 'price' | 'review';
export const WIZARD_STEPS: StepId[] = ['type', 'photos', 'basics', 'when', 'where', 'safety', 'price', 'review'];

export type StepErrors = Partial<Record<string, string>>;

type ValidateOptions = {
  minUnits: number; // already booked: the total can't go below this
  isTimeChecked: boolean; // false when editing and the times are unchanged
};

// Translated messages per field for one step; an empty object means the step is fine.
export function validateStep(step: StepId, d: Draft, t: TFunction, options: ValidateOptions): StepErrors {
  const errors: StepErrors = {};
  switch (step) {
    case 'photos':
      if (d.photos.length === 0) errors.photos = t('hostNew.error.photos');
      else if (d.photos.some((p) => p.status === 'uploading')) errors.photos = t('hostNew.error.photosUploading');
      else if (d.photos.some((p) => p.status === 'failed')) errors.photos = t('hostNew.error.photosFailed');
      break;
    case 'basics':
      if (d.title.trim().length < 3) errors.title = t('hostNew.error.title');
      if (d.description.trim().length < 20) errors.description = t('hostNew.error.description');
      break;
    case 'when':
      if (options.isTimeChecked && d.start.getTime() <= Date.now()) errors.start = t('hostNew.error.past');
      if (d.end.getTime() <= d.start.getTime()) errors.end = t('hostNew.error.endBeforeStart');
      if (d.listingType === 'table' && d.seats < Math.max(1, options.minUnits)) {
        errors.units = t('hostNew.error.belowBooked', { count: options.minUnits });
      }
      if (d.listingType === 'market' && d.quantity < Math.max(1, options.minUnits)) {
        errors.units = t('hostNew.error.belowBooked', { count: options.minUnits });
      }
      if (d.listingType === 'table' && d.drinksIncluded && d.drinks.length === 0) errors.drinks = t('hostNew.error.drinks');
      break;
    case 'where':
      if (d.lat === null || d.lng === null) errors.map = t('hostNew.error.map');
      if (d.area.trim().length < 2) errors.area = t('hostNew.error.area');
      if (d.address.trim().length < 4) errors.address = t('hostNew.error.address');
      break;
    case 'safety':
      if (!d.isSafetyChecked) errors.checked = t('hostNew.error.safety');
      break;
    case 'price': {
      const price = parsePrice(d.price);
      if (price === null || price <= 0) errors.price = t('hostNew.error.price');
      else if (price > 100000) errors.price = t('hostNew.error.priceHigh');
      break;
    }
    case 'type':
    case 'review':
      break;
  }
  return errors;
}

// ---- Output -----------------------------------------------------------------------------------

export function draftToInput(d: Draft): ListingInput {
  const isTable = d.listingType === 'table';
  return {
    listing_type: d.listingType,
    title: d.title.trim(),
    description: d.description.trim(),
    photos: d.photos.flatMap((p) => (p.url ? [p.url] : [])),
    currency: d.currency,
    cuisine_tags: isTable ? d.tags : [],
    product_type_tags: isTable ? [] : d.tags,
    dietary_tags: d.dietary,
    allergen_flags: d.allergens,
    price_per_unit: parsePrice(d.price) ?? 0,
    location_lat: roundCoord(d.lat ?? 0),
    location_lng: roundCoord(d.lng ?? 0),
    location_display: d.area.trim(),
    exact_address: d.address.trim() || null,
    ...(isTable
      ? {
          meal_time: d.start.toISOString(),
          meal_end_time: d.end.toISOString(),
          seats_total: d.seats,
          dining_setting: d.diningSetting,
          drinks_included: d.drinksIncluded,
          drinks: d.drinksIncluded ? d.drinks : [],
        }
      : {
          quantity_total: d.quantity,
          pickup_window_start: d.start.toISOString(),
          pickup_window_end: d.end.toISOString(),
        }),
  };
}

export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
