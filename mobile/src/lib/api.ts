// Every call the app makes to Supabase goes through here. Screens never import `supabase`
// directly (except auth in lib/auth.ts and Realtime in lib/realtime.ts), so the column lists that
// the database's column privileges allow live in one file. See supabase/migrations/0006.

import { decode } from './base64';
import { logError } from './log';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------------

// A failure with a stable `code` a screen can translate: `errors.<code>` in i18n.
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

// Codes the database raises on purpose (see 0006): turned into ApiError with that code.
const KNOWN_CODES = [
  'sold_out',
  'not_active',
  'own_listing',
  'past',
  'not_found',
  'too_early',
  'bad_rating',
  'bad_quantity',
  'payment_required',
  'has_bookings',
  'not_signed_in',
] as const;

function toApiError(error: { message?: string; code?: string } | null | undefined, fallback: string): ApiError {
  const message = error?.message ?? fallback;
  const known = KNOWN_CODES.find((code) => message.includes(code));
  if (known) return new ApiError(known, message);
  if (/fetch|network|Failed to fetch|timed? ?out/i.test(message)) return new ApiError('network', message);
  return new ApiError('unknown', message);
}

function check<T>(result: { data: T; error: { message?: string; code?: string } | null }, where: string): T {
  if (result.error) throw toApiError(result.error, where);
  return result.data;
}

// Edge Functions return { error: "<code>" } with a non-2xx status; surface that code.
async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    let code: string | undefined;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const parsed: unknown = await context.clone().json();
        if (parsed && typeof parsed === 'object' && 'error' in parsed) code = String((parsed as { error: unknown }).error);
      } catch (parseError) {
        logError(`${name}: error body is not JSON`, parseError);
      }
    }
    if (code) {
      const known = KNOWN_CODES.find((k) => code.includes(k));
      throw new ApiError(known ?? code, code);
    }
    throw toApiError(error, name);
  }
  if (data === null || data === undefined) throw new ApiError('unknown', `${name}: empty response`);
  return data;
}

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export type ListingType = 'table' | 'market';
export type ListingStatus = 'active' | 'full' | 'cancelled' | 'completed';
export type DiningSetting = 'indoor_table' | 'garden' | 'terrace' | 'rooftop' | 'open_kitchen';
export type OrderStatus =
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_guest'
  | 'cancelled_by_host'
  | 'no_show_guest'
  | 'no_show_host';
export type CancelReason = 'by_guest' | 'by_host' | 'no_show_guest' | 'no_show_host';

export type HostSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  host_rating: number | null;
  identity_verified: boolean;
};

export type Listing = {
  id: string;
  host_id: string;
  listing_type: ListingType;
  title: string;
  description: string;
  photos: string[];
  currency: string; // the price prefix, e.g. "€", "₺", "CHF" (lib/currencies.ts)
  cuisine_tags: string[];
  dietary_tags: string[];
  allergen_flags: string[];
  price_per_unit: number;
  booking_fee_rate: number;
  location_lat: number;
  location_lng: number;
  location_display: string;
  status: ListingStatus;
  created_at: string;
  // table
  meal_time: string | null;
  meal_end_time: string | null;
  seats_total: number | null;
  seats_available: number | null;
  dining_setting: DiningSetting | null;
  drinks_included: boolean;
  drinks: string[];
  // market
  product_type_tags: string[];
  quantity_total: number | null;
  quantity_available: number | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  allows_local_delivery: boolean;
  host: HostSummary | null;
};

export type ListingInput = {
  listing_type: ListingType;
  title: string;
  description: string;
  photos: string[];
  currency: string;
  cuisine_tags: string[];
  dietary_tags: string[];
  allergen_flags: string[];
  price_per_unit: number;
  location_lat: number;
  location_lng: number;
  location_display: string;
  exact_address: string | null;
  meal_time?: string | null;
  meal_end_time?: string | null;
  seats_total?: number | null;
  dining_setting?: DiningSetting | null;
  drinks_included?: boolean;
  drinks?: string[];
  product_type_tags?: string[];
  quantity_total?: number | null;
  pickup_window_start?: string | null;
  pickup_window_end?: string | null;
};

export type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  identity_verified: boolean;
  host_rating: number | null;
  guest_rating: number | null;
  no_show_count: number;
  cancellation_count: number;
  created_at: string;
};

export type NotificationPrefs = {
  bookings: boolean;
  reminders: boolean;
  messages: boolean;
  reviews: boolean;
  marketing: boolean;
};

export type MyProfile = PublicProfile & {
  email: string | null;
  username: string | null;
  dietary_prefs: string[];
  allergen_exclusions: string[];
  language: string;
  onboarded: boolean;
  notification_prefs: NotificationPrefs;
};

export type ProfilePatch = Partial<
  Pick<MyProfile, 'full_name' | 'avatar_url' | 'bio' | 'dietary_prefs' | 'allergen_exclusions' | 'language' | 'onboarded' | 'notification_prefs'>
>;

export type Order = {
  id: string;
  listing_id: string;
  listing_type: ListingType;
  guest_id: string;
  quantity: number;
  deposit_paid: number;
  balance_due: number;
  currency: string;
  status: OrderStatus;
  host_confirmed: boolean;
  guest_confirmed: boolean;
  deposit_refunded: boolean;
  created_at: string;
  listing: Listing | null;
  guest: Pick<PublicProfile, 'id' | 'full_name' | 'avatar_url' | 'guest_rating'> | null;
};

export type Quote = {
  total: number;
  deposit: number;
  balance: number;
  currency: string;
  currency_iso: string;
  available: number;
  bookable: boolean;
  reason: string | null;
};

export type Message = {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_received'
  | 'order_cancelled'
  | 'reminder'
  | 'message'
  | 'review_request'
  | 'review_received'
  | 'no_show'
  | 'system';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  data: { order_id?: string; listing_id?: string; status?: string; quantity?: number };
  created_at: string;
};

export type Review = {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewee_id: string;
  role: 'guest_reviewing_host' | 'host_reviewing_guest';
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: Pick<PublicProfile, 'id' | 'full_name' | 'avatar_url'> | null;
};

export type PaymentSheetParams = {
  client_secret: string;
  payment_intent_id: string;
  customer_id: string;
  ephemeral_key: string;
  deposit: number;
  balance: number;
  total: number;
  currency: string;
  currency_iso: string;
};

export type CancelResult = { status: OrderStatus; refunded: boolean; deposit_refunded: number };

// ---------------------------------------------------------------------------------------------
// Column lists (must match the grants in 0006: selecting a column not granted is an error)
// ---------------------------------------------------------------------------------------------

const LISTING_COLUMNS =
  'id, host_id, listing_type, title, description, photos, currency, cuisine_tags, dietary_tags, allergen_flags, ' +
  'price_per_unit, booking_fee_rate, location_lat, location_lng, location_display, status, created_at, meal_time, ' +
  'meal_end_time, seats_total, seats_available, dining_setting, drinks_included, drinks, product_type_tags, ' +
  'quantity_total, quantity_available, pickup_window_start, pickup_window_end, allows_local_delivery';
const HOST_EMBED = 'host:profiles!host_id(id, full_name, avatar_url, host_rating, identity_verified)';
const LISTING_SELECT = `${LISTING_COLUMNS}, ${HOST_EMBED}`;
const PROFILE_COLUMNS =
  'id, full_name, avatar_url, bio, identity_verified, host_rating, guest_rating, no_show_count, cancellation_count, created_at';
const ORDER_SELECT =
  'id, listing_id, listing_type, guest_id, quantity, deposit_paid, balance_due, currency, status, host_confirmed, ' +
  `guest_confirmed, deposit_refunded, created_at, listing:listings(${LISTING_SELECT}), ` +
  'guest:profiles!guest_id(id, full_name, avatar_url, guest_rating)';

// PostgREST returns numeric columns as strings; normalise once here.
type Row = Record<string, unknown>;
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function toListing(row: Row): Listing {
  return {
    ...(row as unknown as Listing),
    photos: (row.photos as string[] | null) ?? [],
    cuisine_tags: (row.cuisine_tags as string[] | null) ?? [],
    dietary_tags: (row.dietary_tags as string[] | null) ?? [],
    allergen_flags: (row.allergen_flags as string[] | null) ?? [],
    product_type_tags: (row.product_type_tags as string[] | null) ?? [],
    drinks: (row.drinks as string[] | null) ?? [],
    drinks_included: !!row.drinks_included,
    allows_local_delivery: !!row.allows_local_delivery,
    currency: (row.currency as string | null) ?? '€',
    price_per_unit: num(row.price_per_unit),
    booking_fee_rate: num(row.booking_fee_rate),
    location_lat: num(row.location_lat),
    location_lng: num(row.location_lng),
    host: row.host
      ? {
          ...(row.host as HostSummary),
          host_rating: numOrNull((row.host as Row).host_rating),
          identity_verified: !!(row.host as Row).identity_verified,
        }
      : null,
  };
}

function toProfile(row: Row): PublicProfile {
  return {
    ...(row as unknown as PublicProfile),
    host_rating: numOrNull(row.host_rating),
    guest_rating: numOrNull(row.guest_rating),
    identity_verified: !!row.identity_verified,
  };
}

function toOrder(row: Row): Order {
  return {
    ...(row as unknown as Order),
    deposit_paid: num(row.deposit_paid),
    balance_due: num(row.balance_due),
    currency: (row.currency as string | null) ?? '€',
    listing: row.listing ? toListing(row.listing as Row) : null,
    guest: row.guest
      ? { ...(row.guest as Order['guest'] & object), guest_rating: numOrNull((row.guest as Row).guest_rating) }
      : null,
  };
}

const DEFAULT_PREFS: NotificationPrefs = { bookings: true, reminders: true, messages: true, reviews: true, marketing: false };

// ---------------------------------------------------------------------------------------------
// The API
// ---------------------------------------------------------------------------------------------

export const api = {
  // ---- Profiles -------------------------------------------------------------------------------

  async myProfile(): Promise<MyProfile | null> {
    const rows = check(await supabase.rpc('my_profile'), 'my_profile') as Row[] | null;
    const row = rows?.[0];
    if (!row) return null;
    return {
      ...toProfile(row),
      email: (row.email as string | null) ?? null,
      username: (row.username as string | null) ?? null,
      dietary_prefs: (row.dietary_prefs as string[] | null) ?? [],
      allergen_exclusions: (row.allergen_exclusions as string[] | null) ?? [],
      language: (row.language as string | null) ?? 'en',
      onboarded: !!row.onboarded,
      notification_prefs: { ...DEFAULT_PREFS, ...((row.notification_prefs as Partial<NotificationPrefs> | null) ?? {}) },
    };
  },

  async updateMyProfile(userId: string, patch: ProfilePatch): Promise<void> {
    check(await supabase.from('profiles').update(patch).eq('id', userId), 'updateMyProfile');
  },

  async profile(id: string): Promise<PublicProfile | null> {
    const row = check(await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle(), 'profile');
    return row ? toProfile(row as unknown as Row) : null;
  },

  async reviewsAbout(userId: string, limit = 30): Promise<Review[]> {
    const rows = check(
      await supabase
        .from('reviews')
        .select('id, order_id, reviewer_id, reviewee_id, role, rating, comment, created_at, reviewer:profiles!reviewer_id(id, full_name, avatar_url)')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      'reviewsAbout',
    );
    return (rows ?? []) as unknown as Review[];
  },

  // ---- Avatars and photos ---------------------------------------------------------------------

  // Uploads a JPEG (already resized by the caller with expo-image-manipulator, base64) to
  // <bucket>/<userId>/<random>.jpg and returns its public URL.
  async uploadImage(bucket: 'avatars' | 'listing-photos', userId: string, base64Jpeg: string): Promise<string> {
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from(bucket).upload(path, decode(base64Jpeg), {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw toApiError(error, 'uploadImage');
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },

  // ---- Listings -------------------------------------------------------------------------------

  // Active and full listings whose event has not ended, nearest first is up to the caller.
  async listings(): Promise<Listing[]> {
    const since = new Date(Date.now() - 3 * 3600_000).toISOString();
    const rows = check(
      await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .in('status', ['active', 'full'])
        .or(`meal_time.gte.${since},pickup_window_end.gte.${since}`)
        .order('created_at', { ascending: false })
        .limit(500),
      'listings',
    );
    return ((rows ?? []) as unknown as Row[]).map(toListing);
  },

  async listing(id: string): Promise<Listing | null> {
    const row = check(await supabase.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle(), 'listing');
    return row ? toListing(row as unknown as Row) : null;
  },

  async listingsByHost(hostId: string): Promise<Listing[]> {
    const rows = check(
      await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('host_id', hostId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }),
      'listingsByHost',
    );
    return ((rows ?? []) as unknown as Row[]).map(toListing);
  },

  // The exact address: only for the host and guests with a confirmed booking; otherwise null.
  async listingAddress(listingId: string): Promise<string | null> {
    return check(await supabase.rpc('listing_address', { p_listing: listingId }), 'listingAddress') as string | null;
  },

  // `idempotencyKey`: one per create screen, so a double tap or a retry returns the same row.
  async createListing(hostId: string, input: ListingInput, idempotencyKey: string): Promise<string> {
    const row = {
      ...input,
      host_id: hostId,
      status: 'active' as const,
      seats_available: input.listing_type === 'table' ? (input.seats_total ?? null) : null,
      quantity_available: input.listing_type === 'market' ? (input.quantity_total ?? null) : null,
      idempotency_key: idempotencyKey,
    };
    const data = check(
      await supabase.from('listings').upsert(row, { onConflict: 'idempotency_key', ignoreDuplicates: false }).select('id').single(),
      'createListing',
    );
    return (data as { id: string }).id;
  },

  // Editing never touches availability directly unless the host changed the total: then the
  // available count moves by the same difference (never below zero).
  async updateListing(listing: Listing, input: Partial<ListingInput>): Promise<void> {
    const patch: Row = { ...input };
    if (input.seats_total != null && listing.seats_total != null) {
      patch.seats_available = Math.max(0, (listing.seats_available ?? 0) + (input.seats_total - listing.seats_total));
    }
    if (input.quantity_total != null && listing.quantity_total != null) {
      patch.quantity_available = Math.max(0, (listing.quantity_available ?? 0) + (input.quantity_total - listing.quantity_total));
    }
    check(await supabase.from('listings').update(patch).eq('id', listing.id), 'updateListing');
  },

  // Cancels the listing and every booking on it, refunding each guest's deposit.
  async cancelListing(listingId: string): Promise<{ cancelled_orders: number }> {
    return invoke('cancel-listing', { listing_id: listingId });
  },

  // ---- AI help when hosting (falls back to the local keyword scan in lib/allergens.ts) -------

  async detectAllergens(title: string, description: string): Promise<{ allergens: string[]; dietary: string[] }> {
    return invoke('ai-allergens', { title, description });
  },

  async describeListing(args: {
    title: string;
    listing_type: ListingType;
    ingredients?: string;
    cuisine?: string;
    language?: string;
  }): Promise<{ description: string }> {
    return invoke('ai-describe', args);
  },

  // ---- Booking --------------------------------------------------------------------------------

  async quote(listingId: string, quantity: number): Promise<Quote> {
    const rows = check(await supabase.rpc('quote_booking', { p_listing: listingId, p_quantity: quantity }), 'quote') as Row[];
    const q = rows[0];
    if (!q) throw new ApiError('not_found');
    return {
      total: num(q.total),
      deposit: num(q.deposit),
      balance: num(q.balance),
      currency: String(q.currency),
      currency_iso: String(q.currency_iso),
      available: num(q.available),
      bookable: !!q.bookable,
      reason: (q.reason as string | null) ?? null,
    };
  },

  // Starts a Stripe payment for the deposit. The order is created by the webhook when the money is
  // there; poll orderByPaymentIntent after the payment sheet succeeds.
  async startPayment(listingId: string, quantity: number): Promise<PaymentSheetParams> {
    return invoke('create-payment-intent', { listing_id: listingId, quantity });
  },

  async orderByPaymentIntent(paymentIntentId: string): Promise<Order | null> {
    const row = check(
      await supabase.from('orders').select(ORDER_SELECT).eq('payment_intent_id', paymentIntentId).maybeSingle(),
      'orderByPaymentIntent',
    );
    return row ? toOrder(row as unknown as Row) : null;
  },

  // A listing whose deposit is zero: booked straight away, nothing to pay in the app.
  async bookFree(listingId: string, quantity: number): Promise<string> {
    return check(await supabase.rpc('book_free_listing', { p_listing: listingId, p_quantity: quantity }), 'bookFree') as string;
  },

  // ---- Orders ---------------------------------------------------------------------------------

  async myBookings(userId: string): Promise<Order[]> {
    const rows = check(
      await supabase.from('orders').select(ORDER_SELECT).eq('guest_id', userId).order('created_at', { ascending: false }),
      'myBookings',
    );
    return ((rows ?? []) as unknown as Row[]).map(toOrder);
  },

  // Orders on the host's own listings (RLS returns only those).
  async ordersForListing(listingId: string): Promise<Order[]> {
    const rows = check(
      await supabase.from('orders').select(ORDER_SELECT).eq('listing_id', listingId).order('created_at', { ascending: true }),
      'ordersForListing',
    );
    return ((rows ?? []) as unknown as Row[]).map(toOrder);
  },

  async hostOrders(hostId: string): Promise<Order[]> {
    const rows = check(
      await supabase
        .from('orders')
        .select(ORDER_SELECT.replace('listing:listings(', 'listing:listings!inner('))
        .eq('listing.host_id', hostId)
        .order('created_at', { ascending: false }),
      'hostOrders',
    );
    return ((rows ?? []) as unknown as Row[]).map(toOrder);
  },

  async order(id: string): Promise<Order | null> {
    const row = check(await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle(), 'order');
    return row ? toOrder(row as unknown as Row) : null;
  },

  async cancelOrder(orderId: string, reason: CancelReason): Promise<CancelResult> {
    return invoke('cancel-order', { order_id: orderId, reason });
  },

  async markOrderDone(orderId: string): Promise<OrderStatus> {
    return check(await supabase.rpc('mark_order_done', { p_order: orderId }), 'markOrderDone') as OrderStatus;
  },

  async submitReview(orderId: string, rating: number, comment: string): Promise<void> {
    check(await supabase.rpc('submit_review', { p_order: orderId, p_rating: rating, p_comment: comment }), 'submitReview');
  },

  async myReviewFor(orderId: string, userId: string): Promise<Review | null> {
    const row = check(
      await supabase
        .from('reviews')
        .select('id, order_id, reviewer_id, reviewee_id, role, rating, comment, created_at')
        .eq('order_id', orderId)
        .eq('reviewer_id', userId)
        .maybeSingle(),
      'myReviewFor',
    );
    return (row as Review | null) ?? null;
  },

  // ---- Chat -----------------------------------------------------------------------------------

  async messages(orderId: string): Promise<Message[]> {
    const rows = check(
      await supabase
        .from('messages')
        .select('id, order_id, sender_id, content, read, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
        .limit(500),
      'messages',
    );
    return (rows ?? []) as Message[];
  },

  async sendMessage(orderId: string, senderId: string, content: string): Promise<Message> {
    const data = check(
      await supabase
        .from('messages')
        .insert({ order_id: orderId, sender_id: senderId, content: content.slice(0, 2000) })
        .select('id, order_id, sender_id, content, read, created_at')
        .single(),
      'sendMessage',
    );
    return data as Message;
  },

  async markMessagesRead(orderId: string): Promise<void> {
    check(await supabase.rpc('mark_messages_read', { p_order: orderId }), 'markMessagesRead');
  },

  // ---- Notifications --------------------------------------------------------------------------

  async notifications(limit = 100): Promise<AppNotification[]> {
    const rows = check(
      await supabase
        .from('notifications')
        .select('id, type, title, body, read, data, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      'notifications',
    );
    return (rows ?? []) as AppNotification[];
  },

  async unreadNotificationCount(): Promise<number> {
    const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
    if (error) throw toApiError(error, 'unreadNotificationCount');
    return count ?? 0;
  },

  async markNotificationsRead(ids?: string[]): Promise<void> {
    let q = supabase.from('notifications').update({ read: true }).eq('read', false);
    if (ids) q = q.in('id', ids);
    check(await q, 'markNotificationsRead');
  },

  async registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    check(await supabase.rpc('register_push_token', { p_token: token, p_platform: platform }), 'registerPushToken');
  },

  async removePushToken(token: string): Promise<void> {
    check(await supabase.from('push_tokens').delete().eq('token', token), 'removePushToken');
  },

  // ---- Safety ---------------------------------------------------------------------------------

  async block(myId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: userId });
    if (error && error.code !== '23505') throw toApiError(error, 'block'); // already blocked is fine
  },

  async unblock(myId: string, userId: string): Promise<void> {
    check(await supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', userId), 'unblock');
  },

  async blockedPeople(myId: string): Promise<Pick<PublicProfile, 'id' | 'full_name' | 'avatar_url'>[]> {
    const rows = check(
      await supabase.from('blocks').select('blocked:profiles!blocked_id(id, full_name, avatar_url)').eq('blocker_id', myId),
      'blockedPeople',
    );
    return ((rows ?? []) as unknown as { blocked: Pick<PublicProfile, 'id' | 'full_name' | 'avatar_url'> }[]).map((r) => r.blocked);
  },

  async report(args: {
    reporterId: string;
    reason: string;
    details?: string;
    userId?: string | null;
    listingId?: string | null;
    orderId?: string | null;
  }): Promise<void> {
    check(
      await supabase.from('reports').insert({
        reporter_id: args.reporterId,
        reason: args.reason,
        details: args.details?.slice(0, 2000) || null,
        reported_user_id: args.userId ?? null,
        listing_id: args.listingId ?? null,
        order_id: args.orderId ?? null,
      }),
      'report',
    );
  },

  // ---- Account --------------------------------------------------------------------------------

  // Refunds and cancels upcoming bookings on both sides, then deletes the account and its data.
  async deleteAccount(): Promise<void> {
    await invoke<{ deleted: true }>('delete-account', {});
  },
};
