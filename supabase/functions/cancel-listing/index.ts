// cancel-listing — a host calls off a table or market listing. Every confirmed booking on it is
// cancelled by the host with its deposit refunded (guests notified by the orders trigger), then
// the listing is marked cancelled. A direct status update with bookings is refused by the
// database (guard_listing_cancel), so this is the only way to cancel a booked listing.
//
// Deploy: supabase functions deploy cancel-listing      Secrets: STRIPE_SECRET_KEY
import { admin, caller, CORS, fail, json, readJson } from '../_shared/http.ts';
import { refundDeposit } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  const user = await caller(req);
  if (!user) return fail('not_signed_in', 401);
  const body = await readJson<{ listing_id?: string }>(req);
  if (!body?.listing_id) return fail('bad_request', 400);

  const db = admin();
  const { data: listing } = await db.from('listings').select('id, host_id, status').eq('id', body.listing_id).maybeSingle();
  if (!listing || listing.host_id !== user.id) return fail('not_found', 404);
  if (listing.status === 'cancelled') return json({ cancelled_orders: 0 });

  const { data: orders, error } = await db
    .from('orders')
    .select('id, payment_intent_id, deposit_paid')
    .eq('listing_id', listing.id)
    .eq('status', 'confirmed');
  if (error) return fail('unknown', 500, error);

  let cancelled = 0;
  for (const order of orders ?? []) {
    const refundable = !!order.payment_intent_id && Number(order.deposit_paid) > 0;
    if (refundable) {
      try {
        await refundDeposit(order.payment_intent_id as string, order.id);
      } catch (refundError) {
        // Stop: the listing stays open so the host can retry; refunds already made are idempotent.
        return fail('payments_unavailable', 502, refundError);
      }
    }
    const { error: uerr } = await db
      .from('orders')
      .update({ status: 'cancelled_by_host', deposit_refunded: refundable })
      .eq('id', order.id)
      .eq('status', 'confirmed');
    if (uerr) return fail('unknown', 500, uerr);
    cancelled++;
  }
  if (cancelled > 0) {
    const { error: serr } = await db.rpc('server_add_strike', { p_user: user.id, p_kind: 'cancellation' });
    if (serr) console.error('server_add_strike', serr.message);
  }

  const { error: lerr } = await db.from('listings').update({ status: 'cancelled' }).eq('id', listing.id);
  if (lerr) return fail('unknown', 500, lerr);
  return json({ cancelled_orders: cancelled });
});
