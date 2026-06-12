import { supabase } from "./supabase";
import { mockListings } from "../data/mockListings";
import { useHost } from "../store/hostListings";
import type { Listing, MarketListing, TableListing } from "../types";
import type { ListingRow } from "./database.types";

// =========================================================================
// Listings
// =========================================================================

export async function fetchListings(): Promise<Listing[]> {
  if (!supabase) {
    return [...useHost.getState().myListings, ...mockListings];
  }
  const { data, error } = await supabase
    .from("listings")
    .select("*, host:profiles!host_id(full_name, avatar_url, host_rating, identity_verified)")
    .eq("status", "active")
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
    .select("*, host:profiles!host_id(full_name, avatar_url, host_rating, identity_verified)")
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
    currency: "€",
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
      seats_total: row.seats_total ?? 0,
      seats_available: row.seats_available ?? 0,
      dining_setting: prettyDining(row.dining_setting),
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

export async function createOrder(args: {
  listing_id: string;
  listing_type: "table" | "market";
  guest_id: string;
  quantity: number;
  deposit_paid: number;
  balance_due: number;
  payment_intent_id?: string;
}) {
  if (!supabase) throw new Error("Supabase not configured");
  const row = {
    listing_id: args.listing_id,
    listing_type: args.listing_type,
    guest_id: args.guest_id,
    quantity: args.quantity,
    deposit_paid: args.deposit_paid,
    balance_due: args.balance_due,
    payment_intent_id: args.payment_intent_id ?? null,
    status: "confirmed" as const,
    host_confirmed: false,
    guest_confirmed: false,
  };
  const { data, error } = await supabase
    .from("orders")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

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

// =========================================================================
// Notifications
// =========================================================================

export async function pushServerNotification(args: {
  user_id: string;
  type: "booking_confirmed" | "booking_received" | "reminder" | "message" | "review_request" | "no_show" | "order_cancelled" | "system";
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  if (!supabase) return;
  await supabase.from("notifications").insert({
    user_id: args.user_id,
    type: args.type,
    title: args.title,
    body: args.body ?? null,
    data: args.data ?? {},
  });
}
