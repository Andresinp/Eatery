// cancel-order — cancel one booking, by the guest or the host, or record a no-show.
//
// Who may do what:   by_guest, no_show_host → the guest      by_host, no_show_guest → the host
// When:              cancellations before the event starts; no-shows only after it has started
// Money:             _shared/cancellation.ts decides the refund; the refund is made BEFORE the
//                    status changes, so a failed refund never leaves a cancelled-but-charged order.
// Seats come back and the other side is notified by triggers on `orders` (migration 0006).
//
// Deploy: supabase functions deploy cancel-order        Secrets: STRIPE_SECRET_KEY
import { decide, type CancellationReason } from '../_shared/cancellation.ts';
import { admin, caller, CORS, fail, json, readJson } from '../_shared/http.ts';
import { refundDeposit } from '../_shared/stripe.ts';

const REASONS: CancellationReason[] = ['by_guest', 'by_host', 'no_show_guest', 'no_show_host'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  const user = await caller(req);
  if (!user) return fail('not_signed_in', 401);
  const body = await readJson<{ order_id?: string; reason?: CancellationReason }>(req);
  if (!body?.order_id || !body.reason || !REASONS.includes(body.reason)) return fail('bad_request', 400);

  const db = admin();
  const { data: order, error } = await db
    .from('orders')
    .select('id, guest_id, status, deposit_paid, payment_intent_id, listing:listings(host_id, listing_type, meal_time, pickup_window_start)')
    .eq('id', body.order_id)
    .maybeSingle();
  const listing = order?.listing as unknown as { host_id: string; listing_type: string; meal_time: string | null; pickup_window_start: string | null } | null;
  if (error || !order || !listing) return fail('not_found', 404, error);

  const isGuest = order.guest_id === user.id;
  const isHost = listing.host_id === user.id;
  const allowed =
    ((body.reason === 'by_guest' || body.reason === 'no_show_host') && isGuest) ||
    ((body.reason === 'by_host' || body.reason === 'no_show_guest') && isHost);
  if (!allowed) return fail('not_found', 404);
  if (order.status !== 'confirmed') return fail('not_active', 409);

  const start = (listing.listing_type === 'table' ? listing.meal_time : listing.pickup_window_start) ?? new Date().toISOString();
  const hasStarted = new Date(start).getTime() <= Date.now();
  const isNoShow = body.reason === 'no_show_guest' || body.reason === 'no_show_host';
  if (isNoShow && !hasStarted) return fail('too_early', 409);
  if (!isNoShow && hasStarted) return fail('past', 409);

  const outcome = decide(body.reason, start);
  const refundable = outcome.refund && !!order.payment_intent_id && Number(order.deposit_paid) > 0;
  if (refundable) {
    try {
      await refundDeposit(order.payment_intent_id as string, order.id);
    } catch (refundError) {
      return fail('payments_unavailable', 502, refundError);
    }
  }

  const { error: uerr } = await db
    .from('orders')
    .update({ status: outcome.status, deposit_refunded: refundable })
    .eq('id', order.id)
    .eq('status', 'confirmed'); // a concurrent cancel loses instead of double-counting
  if (uerr) return fail('unknown', 500, uerr);

  if (outcome.strike) {
    const target = outcome.strikeOn === 'host' ? listing.host_id : order.guest_id;
    const { error: serr } = await db.rpc('server_add_strike', { p_user: target, p_kind: outcome.strike });
    if (serr) console.error('server_add_strike', serr.message);
  }

  return json({ status: outcome.status, refunded: refundable, deposit_refunded: refundable ? Number(order.deposit_paid) : 0 });
});
