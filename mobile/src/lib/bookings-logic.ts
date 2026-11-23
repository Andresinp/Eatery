// Pure date and list logic for bookings and chat. No React Native imports, so it runs under
// `node --test` (see bookings-logic.test.ts).

import type { Message, Order } from './api';

type OrderTimes = Pick<Order, 'status' | 'created_at'> & {
  listing: Pick<
    NonNullable<Order['listing']>,
    'listing_type' | 'meal_time' | 'meal_end_time' | 'pickup_window_start' | 'pickup_window_end'
  > | null;
};

// When the meal starts, or the pickup window opens.
export function orderStart(order: OrderTimes): string | null {
  const l = order.listing;
  if (!l) return null;
  return l.listing_type === 'table' ? l.meal_time : l.pickup_window_start;
}

// When the meal ends, or the pickup window closes; the start when no end is set.
export function orderEnd(order: OrderTimes): string | null {
  const l = order.listing;
  if (!l) return null;
  const end = l.listing_type === 'table' ? l.meal_end_time : l.pickup_window_end;
  return end ?? orderStart(order);
}

export function hasStarted(order: OrderTimes, now: Date = new Date()): boolean {
  const start = orderStart(order);
  return start !== null && new Date(start).getTime() <= now.getTime();
}

export function hasEnded(order: OrderTimes, now: Date = new Date()): boolean {
  const end = orderEnd(order);
  return end !== null && new Date(end).getTime() <= now.getTime();
}

// Upcoming: confirmed and not over yet, soonest first. Past: everything else (a booking whose
// listing is no longer visible included), newest first.
export function splitBookings<T extends OrderTimes>(orders: readonly T[], now: Date = new Date()): { upcoming: T[]; past: T[] } {
  const sortTime = (o: T): number => new Date(orderStart(o) ?? o.created_at).getTime();
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const order of orders) {
    const end = orderEnd(order);
    if (order.status === 'confirmed' && end !== null && new Date(end).getTime() > now.getTime()) upcoming.push(order);
    else past.push(order);
  }
  upcoming.sort((a, b) => sortTime(a) - sortTime(b));
  past.sort((a, b) => sortTime(b) - sortTime(a));
  return { upcoming, past };
}

// A guest may cancel a confirmed booking until it starts.
export function canGuestCancel(order: OrderTimes, now: Date = new Date()): boolean {
  return order.status === 'confirmed' && !hasStarted(order, now);
}

// ---------------------------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------------------------

// A message on screen: sent, still sending, or failed (with the text kept for a retry).
export type ChatMessage = Message & { localState?: 'sending' | 'failed' };

export type ChatItem = { kind: 'message'; key: string; message: ChatMessage } | { kind: 'day'; key: string; iso: string };

// Adds messages, dropping any whose id is already there (my own send also comes back through
// Realtime), oldest first.
export function mergeMessages(existing: readonly ChatMessage[], incoming: readonly ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) {
    const prev = byId.get(m.id);
    // A confirmed copy wins over a local one; never downgrade a sent message.
    if (!prev || prev.localState) byId.set(m.id, m);
  }
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Items for an inverted list (newest first): each day's messages followed by that day's
// separator, so the separator renders above the day's first message.
export function chatItems(messages: readonly ChatMessage[]): ChatItem[] {
  const items: ChatItem[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message) continue;
    items.push({ kind: 'message', key: message.id, message });
    const older = messages[i - 1];
    const day = localDayKey(message.created_at);
    if (!older || localDayKey(older.created_at) !== day) items.push({ kind: 'day', key: `day-${day}`, iso: message.created_at });
  }
  return items;
}

// Whether a message from someone else arrived that I have not read.
export function hasUnreadFromOthers(messages: readonly Message[], myId: string): boolean {
  return messages.some((m) => m.sender_id !== myId && !m.read);
}

// "★★★★" in a review_received notification body → 4.
export function starsInBody(body: string | null): number {
  if (!body) return 0;
  return [...body].filter((c) => c === '★').length;
}
