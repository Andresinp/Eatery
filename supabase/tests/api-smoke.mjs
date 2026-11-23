#!/usr/bin/env node
// End-to-end smoke test against a LOCAL Supabase stack (`supabase start`, seeded by seed.sql):
// real Auth, PostgREST, Storage, Edge Functions — the calls mobile/src/lib/api.ts makes, as the
// seeded demo people. Never point this at the live project.
//
//   node supabase/tests/api-smoke.mjs
//
// Reads the local URL and publishable key from `supabase status` (prints neither).
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const status = JSON.parse(execSync('supabase status -o json', { cwd: new URL('../..', import.meta.url).pathname, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
const URL_ = status.API_URL;
const KEY = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (!/^http:\/\/127\.0\.0\.1/.test(URL_)) throw new Error('refusing to run against a non-local project');

let failures = 0;
const ok = (label, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};

async function as(email) {
  const c = createClient(URL_, KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: 'eatery-demo-123' });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return { c, id: data.user.id };
}

async function fnError(res) {
  if (!res.error) return null;
  try {
    return (await res.error.context.json()).error;
  } catch {
    return res.error.message;
  }
}

const anon = createClient(URL_, KEY, { auth: { persistSession: false } });
const LISTING_COLS = 'id, host_id, title, currency, price_per_unit, location_lat, location_lng, seats_available, status';

// ---- Browsing signed out ----
{
  const { data, error } = await anon.from('listings').select(`${LISTING_COLS}, host:profiles!host_id(id, full_name)`).in('status', ['active', 'full']);
  ok('signed-out browse returns listings with host', !error && data.length >= 8 && !!data[0].host?.full_name, error?.message);
  const exact = await anon.from('listings').select('exact_address').limit(1);
  ok('exact address is not readable', !!exact.error);
  const star = await anon.from('listings').select('*').limit(1);
  ok('select * on listings is refused (column grants)', !!star.error);
}

// ---- Sign up a brand-new person through Auth (trigger creates the profile) ----
const fresh = createClient(URL_, KEY, { auth: { persistSession: false } });
const email = `smoke-${Date.now()}@eatery.test`;
{
  const { data, error } = await fresh.auth.signUp({ email, password: 'smoke-test-123', options: { data: { full_name: 'Smoke Tester' } } });
  ok('email sign-up returns a session (confirmations off locally)', !error && !!data.session, error?.message);
  const { data: me } = await fresh.rpc('my_profile');
  ok('profile created with name and email', me?.[0]?.full_name === 'Smoke Tester' && me?.[0]?.email === email);
  const upd = await fresh.from('profiles').update({ onboarded: true, allergen_exclusions: ['Gluten'] }).eq('id', data.user.id);
  ok('onboarding saves own profile', !upd.error, upd.error?.message);
  const bad = await fresh.from('profiles').update({ identity_verified: true }).eq('id', data.user.id);
  ok('cannot self-verify identity', !!bad.error);
}

const host = await as('host@eatery.test');
const guest = await as('guest@eatery.test');

// ---- Host creates a free listing and a paid one ----
let freeId, paidId;
{
  const base = {
    host_id: host.id, listing_type: 'table', description: 'smoke', photos: [], currency: '₺', cuisine_tags: ['Turkish'],
    dietary_tags: [], allergen_flags: [], location_lat: 41.036912, location_lng: 28.985012, location_display: 'Cihangir',
    meal_time: new Date(Date.now() + 3 * 86400e3).toISOString(),
    meal_end_time: new Date(Date.now() + 3 * 86400e3 + 3 * 3600e3).toISOString(), seats_total: 3, seats_available: 3, status: 'active',
  };
  const key = `smoke-${Date.now()}`;
  const a = await host.c.from('listings').upsert({ ...base, title: 'Free soup', price_per_unit: 0, idempotency_key: key }, { onConflict: 'idempotency_key' }).select('id').single();
  const again = await host.c.from('listings').upsert({ ...base, title: 'Free soup', price_per_unit: 0, idempotency_key: key }, { onConflict: 'idempotency_key' }).select('id').single();
  ok('create listing', !a.error, a.error?.message);
  ok('double-tap publish returns the same listing', a.data?.id === again.data?.id);
  freeId = a.data?.id;
  const setAddr = await host.c.from('listings').update({ exact_address: 'Smoke Sk. 1' }).eq('id', freeId);
  ok('host sets the exact address', !setAddr.error, setAddr.error?.message);
  const b = await host.c.from('listings').insert({ ...base, title: 'Paid dinner', price_per_unit: 100 }).select('id, location_lat').single();
  paidId = b.data?.id;
  ok('public coordinates are snapped', Number(b.data?.location_lat) === 41.036);
  const fee = await host.c.from('listings').update({ booking_fee_rate: 0 }).eq('id', paidId);
  ok('host cannot change the booking fee', !!fee.error);
}

// ---- Guest books ----
{
  const { data: q } = await guest.c.rpc('quote_booking', { p_listing: paidId, p_quantity: 2 });
  ok('quote in lira with 12% deposit', q?.[0]?.currency_iso === 'TRY' && Number(q?.[0]?.deposit) === 24 && Number(q?.[0]?.balance) === 176, JSON.stringify(q?.[0]));
  const pay = await guest.c.functions.invoke('create-payment-intent', { body: { listing_id: paidId, quantity: 2 } });
  const payErr = await fnError(pay);
  ok('paid booking without Stripe configured says payments_unavailable', payErr === 'payments_unavailable', String(payErr));
  const direct = await guest.c.from('orders').insert({ listing_id: paidId, listing_type: 'table', guest_id: guest.id, quantity: 1, deposit_paid: 0, balance_due: 0 });
  ok('guest cannot write an order', !!direct.error);

  const book = await guest.c.rpc('book_free_listing', { p_listing: freeId, p_quantity: 2 });
  ok('free booking succeeds', !book.error && !!book.data, book.error?.message);
  const { data: l } = await anon.from('listings').select('seats_available').eq('id', freeId).single();
  ok('seats decremented', l?.seats_available === 1);
  const addr = await guest.c.rpc('listing_address', { p_listing: freeId });
  ok('booked guest sees the address', addr.data === 'Smoke Sk. 1');
  const { data: notes } = await host.c.from('notifications').select('type').eq('type', 'booking_received');
  ok('host notified of booking', (notes ?? []).length >= 1);

  // Chat
  const send = await guest.c.from('messages').insert({ order_id: book.data, sender_id: guest.id, content: 'See you!' }).select('id').single();
  ok('guest sends a chat message', !send.error, send.error?.message);
  const read = await host.c.from('messages').select('content').eq('order_id', book.data);
  ok('host reads it', read.data?.[0]?.content === 'See you!');

  // Host tries to cancel the listing directly → refused; through the function → refunds + cancels
  const directCancel = await host.c.from('listings').update({ status: 'cancelled' }).eq('id', freeId);
  ok('direct cancel of a booked listing refused', !!directCancel.error && /has_bookings/.test(directCancel.error.message));

  // Guest cancels own booking (free, no Stripe needed)
  const cancel = await guest.c.functions.invoke('cancel-order', { body: { order_id: book.data, reason: 'by_guest' } });
  ok('guest cancels through cancel-order', !cancel.error && cancel.data?.status === 'cancelled_by_guest', String(await fnError(cancel)));
  const { data: l2 } = await anon.from('listings').select('seats_available').eq('id', freeId).single();
  ok('seats returned after cancel', l2?.seats_available === 3);
  const again = await guest.c.functions.invoke('cancel-order', { body: { order_id: book.data, reason: 'by_guest' } });
  ok('cancelling twice is refused', (await fnError(again)) === 'not_active');
  const wrong = await guest.c.functions.invoke('cancel-order', { body: { order_id: book.data, reason: 'by_host' } });
  ok('guest cannot cancel as host', (await fnError(wrong)) === 'not_found');

  const cl = await host.c.functions.invoke('cancel-listing', { body: { listing_id: paidId } });
  ok('host cancels an unbooked listing via cancel-listing', !cl.error && cl.data?.cancelled_orders === 0, String(await fnError(cl)));
}

// ---- Past booking: done, review, rating ----
{
  const { data: past } = await guest.c.from('orders').select('id').eq('payment_intent_id', 'pi_demo_past').single();
  const done = await guest.c.rpc('mark_order_done', { p_order: past.id });
  ok('guest marks past meal done', !done.error, done.error?.message);
  const rev = await guest.c.rpc('submit_review', { p_order: past.id, p_rating: 5, p_comment: 'Wonderful paella' });
  ok('guest reviews the host', !rev.error, rev.error?.message);
  const { data: hp } = await anon.from('profiles').select('host_rating').eq('id', host.id).single();
  ok('host rating updated', Number(hp?.host_rating) === 5);
}

// ---- Storage: own folder only ----
{
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const own = await guest.c.storage.from('avatars').upload(`${guest.id}/smoke.png`, png, { contentType: 'image/png', upsert: true });
  ok('upload to own avatar folder', !own.error, own.error?.message);
  const other = await guest.c.storage.from('avatars').upload(`${host.id}/evil.png`, png, { contentType: 'image/png' });
  ok("cannot upload into someone else's folder", !!other.error);
}

// ---- Block, report ----
{
  const blk = await guest.c.from('blocks').insert({ blocker_id: guest.id, blocked_id: host.id });
  ok('guest blocks host', !blk.error, blk.error?.message);
  const { data: vis } = await guest.c.from('listings').select('id').eq('host_id', host.id);
  ok("blocked host's listings hidden", (vis ?? []).length === 0);
  await guest.c.from('blocks').delete().eq('blocker_id', guest.id).eq('blocked_id', host.id);
  const rep = await guest.c.from('reports').insert({ reporter_id: guest.id, listing_id: freeId, reason: 'misleading_listing' });
  ok('report a listing', !rep.error, rep.error?.message);
}

// ---- Account deletion (the fresh smoke account) ----
{
  const del = await fresh.functions.invoke('delete-account', { body: {} });
  ok('delete-account succeeds', !del.error && del.data?.deleted === true, String(await fnError(del)));
  const relog = await createClient(URL_, KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: 'smoke-test-123' });
  ok('deleted account can no longer sign in', !!relog.error);
}

console.log(failures ? `\n${failures} FAILED` : '\nall API smoke checks passed');
process.exit(failures ? 1 : 0);
