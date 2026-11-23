/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canGuestCancel,
  chatItems,
  hasStarted,
  localDayKey,
  mergeMessages,
  orderEnd,
  splitBookings,
  starsInBody,
  type ChatMessage,
} from './bookings-logic.ts';

const NOW = new Date('2026-06-15T12:00:00Z');
const at = (hoursFromNow: number): string => new Date(NOW.getTime() + hoursFromNow * 3600_000).toISOString();

type TestOrder = Parameters<typeof splitBookings>[0][number] & { id: string };

function table(id: string, startH: number, endH: number | null, status: TestOrder['status'] = 'confirmed'): TestOrder {
  return {
    id,
    status,
    created_at: at(-100),
    listing: { listing_type: 'table', meal_time: at(startH), meal_end_time: endH === null ? null : at(endH), pickup_window_start: null, pickup_window_end: null },
  };
}

function market(id: string, startH: number, endH: number): TestOrder {
  return {
    id,
    status: 'confirmed',
    created_at: at(-100),
    listing: { listing_type: 'market', meal_time: null, meal_end_time: null, pickup_window_start: at(startH), pickup_window_end: at(endH) },
  };
}

function msg(id: string, iso: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { id, order_id: 'o', sender_id: 'a', content: id, read: false, created_at: iso, ...extra };
}

describe('splitBookings', () => {
  it('puts confirmed bookings that have not ended in upcoming, soonest first', () => {
    const { upcoming, past } = splitBookings([table('later', 48, 50), table('soon', 2, 4), market('pickup', 1, 3)], NOW);
    assert.deepEqual(upcoming.map((o) => o.id), ['pickup', 'soon', 'later']);
    assert.deepEqual(past, []);
  });

  it('keeps a meal that is happening now in upcoming', () => {
    const { upcoming } = splitBookings([table('now', -1, 1)], NOW);
    assert.deepEqual(upcoming.map((o) => o.id), ['now']);
  });

  it('moves ended, cancelled and completed bookings to past, newest first', () => {
    const { upcoming, past } = splitBookings(
      [table('old', -72, -70), table('ended', -5, -2), table('cancelled', 24, 26, 'cancelled_by_guest'), table('done', -30, -28, 'completed')],
      NOW,
    );
    assert.deepEqual(upcoming, []);
    assert.deepEqual(past.map((o) => o.id), ['cancelled', 'ended', 'done', 'old']);
  });

  it('uses the start as the end when no end is set', () => {
    assert.equal(orderEnd(table('x', -1, null)), at(-1));
    assert.deepEqual(splitBookings([table('x', -1, null)], NOW).past.map((o) => o.id), ['x']);
  });

  it('treats a booking without its listing as past', () => {
    const orphan: TestOrder = { id: 'orphan', status: 'confirmed', created_at: at(-1), listing: null };
    assert.deepEqual(splitBookings([orphan], NOW).past.map((o) => o.id), ['orphan']);
  });
});

describe('cancel and start', () => {
  it('lets a guest cancel only before the start', () => {
    assert.equal(canGuestCancel(table('a', 1, 3), NOW), true);
    assert.equal(canGuestCancel(table('a', -1, 3), NOW), false);
    assert.equal(canGuestCancel(table('a', 10, 12, 'cancelled_by_host'), NOW), false);
    assert.equal(hasStarted(table('a', 0, 1), NOW), true);
  });
});

describe('mergeMessages', () => {
  it('dedupes by id and sorts oldest first', () => {
    const merged = mergeMessages([msg('b', at(-1)), msg('a', at(-2))], [msg('b', at(-1)), msg('c', at(0))]);
    assert.deepEqual(merged.map((m) => m.id), ['a', 'b', 'c']);
  });

  it('replaces a local copy with the confirmed one but never the reverse', () => {
    const local = msg('x', at(0), { localState: 'sending' });
    const confirmed = msg('x', at(0));
    assert.equal(mergeMessages([local], [confirmed])[0]?.localState, undefined);
    assert.equal(mergeMessages([confirmed], [local])[0]?.localState, undefined);
  });
});

describe('chatItems', () => {
  it('lists newest first with a separator above each day', () => {
    const day1a = new Date(2026, 5, 14, 9, 0).toISOString();
    const day1b = new Date(2026, 5, 14, 18, 0).toISOString();
    const day2 = new Date(2026, 5, 15, 8, 0).toISOString();
    const items = chatItems([msg('1', day1a), msg('2', day1b), msg('3', day2)]);
    assert.deepEqual(
      items.map((i) => i.key),
      ['3', `day-${localDayKey(day2)}`, '2', '1', `day-${localDayKey(day1a)}`],
    );
  });

  it('is empty for no messages', () => {
    assert.deepEqual(chatItems([]), []);
  });
});

describe('starsInBody', () => {
  it('counts the stars', () => {
    assert.equal(starsInBody('★★★★'), 4);
    assert.equal(starsInBody(null), 0);
  });
});
