import { supabase } from "./supabase";
import { mockListings } from "../data/mockListings";
import { useHost } from "../store/hostListings";
import type { Listing, MarketListing, TableListing } from "../types";
import type { ListingRow, ProfileRow } from "./database.types";

// =========================================================================
// Profiles
// =========================================================================

// Only your own profile has private fields (email, allergies); the database serves them through
// my_profile() since migration 0006, and refuses `select *` on profiles.
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_profile" as never);
  if (error) return null;
  const rows = (data ?? []) as unknown as ProfileRow[];
  return rows.find((r) => r.id === userId) ?? null;
}

// Profile rows are created by the `on_auth_user_created` trigger, so we update
// the existing row (RLS allows "update own") rather than inserting.
// The columns a person may change about themselves (column grants in migration 0006). Email
// belongs to the auth account and is not written here.
const EDITABLE_PROFILE = ["username", "full_name", "avatar_url", "bio", "dietary_prefs", "allergen_exclusions", "language", "onboarded"] as const;

export async function updateProfile(id: string, patch: Partial<ProfileRow>) {
  if (!supabase) return;
  const allowed = Object.fromEntries(
    Object.entries(patch).filter(([k]) => (EDITABLE_PROFILE as readonly string[]).includes(k)),
  ) as Partial<ProfileRow>;
  const { error } = await supabase.from("profiles").update(allowed).eq("id", id);
  if (error) throw error;
}

// =========================================================================
// Listings
// =========================================================================

// Every public listing column. Since migration 0006 the exact address is not readable with a
// plain select (it goes to the host and booked guests through listing_address()), so `*` fails.
const LISTING_SELECT =
  "id, host_id, listing_type, title, description, photos, currency, cuisine_tags, dietary_tags, allergen_flags, price_per_unit, booking_fee_rate, location_lat, location_lng, location_display, status, created_at, meal_time, meal_end_time, seats_total, seats_available, dining_setting, drinks_included, drinks, product_type_tags, quantity_total, quantity_available, pickup_window_start, pickup_window_end, allows_local_delivery, idempotency_key, host:profiles!host_id(full_name, avatar_url, host_rating, identity_verified)";

export async function fetchListings(): Promise<Listing[]> {
  if (!supabase) {
    return [...useHost.getState().myListings, ...mockListings];
  }
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToListing);
}

export async function createListing(args: {
  host_id: string;
  listing_type: "table" | "market";
  title: string;
  description: string;
  photo: string;
  cuisine_tags: string[];
  product_type_tags: string[];
  dietary_tags: string[];
  allergen_flags: string[];
  price_per_unit: number;
  currency?: string;
  location_lat: number;
  location_lng: number;
  location_display: string;
  exact_address?: string;
  meal_time?: string;
  meal_end_time?: string;
  seats_total?: number;
  dining_setting?: ListingRow["dining_setting"];
  drinks_included?: boolean;
  drinks?: string[];
  quantity_total?: number;
  pickup_window_start?: string;
  pickup_window_end?: string;
  idempotency_key?: string;
}): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const row = {
    host_id: args.host_id,
    listing_type: args.listing_type,
    title: args.title,
    description: args.description,
    photos: args.photo ? [args.photo] : [],
    currency: args.currency ?? "€",
    cuisine_tags: args.cuisine_tags,
    product_type_tags: args.product_type_tags,
    dietary_tags: args.dietary_tags,
    allergen_flags: args.allergen_flags,
    price_per_unit: args.price_per_unit,
    location_lat: args.location_lat,
    location_lng: args.location_lng,
    location_display: args.location_display,
    exact_address: args.exact_address ?? null,
    status: "active" as const,
    meal_time: args.meal_time ?? null,
    meal_end_time: args.meal_end_time ?? null,
    seats_total: args.seats_total ?? null,
    seats_available: args.seats_total ?? null,
    dining_setting: args.dining_setting ?? null,
    drinks_included: args.drinks_included ?? false,
    drinks: args.drinks ?? [],
    quantity_total: args.quantity_total ?? null,
    quantity_available: args.quantity_total ?? null,
    pickup_window_start: args.pickup_window_start ?? null,
    pickup_window_end: args.pickup_window_end ?? null,
    ...(args.idempotency_key ? { idempotency_key: args.idempotency_key } : {}),
  };
  // upsert on idempotency_key so rapid duplicate submissions return the same row
  const { data, error } = args.idempotency_key
    ? await supabase
        .from("listings")
        .upsert(row, { onConflict: "idempotency_key", ignoreDuplicates: false })
        .select("id")
        .single()
    : await supabase.from("listings").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

// Cancels the listing and refunds every guest who booked it (Edge Function cancel-listing). A
// direct status update is refused by the database when the listing has bookings.
export async function cancelListing(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke("cancel-listing", { body: { listing_id: id } });
  if (error) throw error;
}

export async function fetchMyListings(hostId: string): Promise<Listing[]> {
  if (!supabase) return useHost.getState().myListings;
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("host_id", hostId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToListing);
}

export async function fetchListing(id: string): Promise<Listing | null> {
  if (!supabase) {
    return (
      useHost.getState().myListings.find((l) => l.id === id) ??
      mockListings.find((l) => l.id === id) ??
      null
    );
  }
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToListing(data);
}

type ListingWithHost = ListingRow & {
  host?: {
    full_name: string | null;
    avatar_url: string | null;
    host_rating: number | null;
    identity_verified: boolean | null;
  };
};

function rowToListing(row: ListingWithHost): Listing {
  const base = {
    id: row.id,
    host_name: row.host?.full_name ?? "Host",
    host_avatar: row.host?.avatar_url ?? "",
    host_rating: row.host?.host_rating ?? 0,
    host_verified: !!row.host?.identity_verified,
    title: row.title,
    description: row.description,
    photo: row.photos[0] ?? "",
    dietary_tags: row.dietary_tags,
    allergen_flags: row.allergen_flags,
    price_per_unit: Number(row.price_per_unit),
    currency: row.currency ?? "€",
    location_lat: Number(row.location_lat),
    location_lng: Number(row.location_lng),
    location_display: row.location_display,
  };

  if (row.listing_type === "table") {
    return {
      ...base,
      listing_type: "table",
      cuisine_tags: row.cuisine_tags,
      meal_time: row.meal_time ?? "",
      meal_end_time: row.meal_end_time ?? undefined,
      seats_total: row.seats_total ?? 0,
      seats_available: row.seats_available ?? 0,
      dining_setting: prettyDining(row.dining_setting),
      drinks_included: row.drinks_included ?? false,
      drinks: row.drinks ?? [],
    } satisfies TableListing;
  }
  return {
    ...base,
    listing_type: "market",
    cuisine_tags: [],
    product_type_tags: row.product_type_tags,
    quantity_total: row.quantity_total ?? 0,
    quantity_available: row.quantity_available ?? 0,
    pickup_window_start: row.pickup_window_start ?? "",
    pickup_window_end: row.pickup_window_end ?? "",
  } satisfies MarketListing;
}

function prettyDining(d: ListingRow["dining_setting"]): string {
  if (!d) return "Indoor Table";
  return d
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// =========================================================================
// Orders
// =========================================================================

// Orders are created by the server only (stripe-webhook / book_free_listing) since migration 0006.

export async function fetchMyOrders(userId: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("guest_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Notifications are written by database triggers since migration 0006; clients cannot insert them.
