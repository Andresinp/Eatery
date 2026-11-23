// stripe-webhook — turns a paid deposit into a confirmed booking.
//
//   payment_intent.succeeded → public.server_create_order (atomic: takes the seats, idempotent on
//                              the payment intent, so Stripe's retries never double-book). If the
//                              seats went to someone else in the meantime, the deposit is
//                              refunded at once and the guest is told.
//   charge.refunded          → records the refund; a full refund made from the Stripe dashboard on
//                              a still-confirmed booking cancels it (seats come back by trigger).
// Notifications for a new booking are written by the orders trigger, not here.
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Stripe Dashboard → Developers → Webhooks → https://<ref>.supabase.co/functions/v1/stripe-webhook
// with events payment_intent.succeeded and charge.refunded.
import type Stripe from 'npm:stripe@17.7.0';

import { admin, env } from '../_shared/http.ts';
import { fromMinorUnits, refundDeposit, stripe } from '../_shared/stripe.ts';

const RETRYABLE = 500; // Stripe retries non-2xx for up to three days

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const s = stripe();
  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature') ?? '', env('STRIPE_WEBHOOK_SECRET'));
  } catch (error) {
    console.error('bad signature', error instanceof Error ? error.message : error);
    return new Response('bad signature', { status: 400 });
  }

  const db = admin();

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const meta = pi.metadata ?? {};
    if (!meta.eatery_listing_id || !meta.eatery_user_id) return new Response('not an Eatery booking', { status: 200 });
    const deposit = fromMinorUnits(pi.amount_received || pi.amount, pi.currency.toUpperCase());
    const { error } = await db.rpc('server_create_order', {
      p_listing: meta.eatery_listing_id,
      p_guest: meta.eatery_user_id,
      p_quantity: Number(meta.eatery_quantity ?? 1),
      p_deposit: deposit,
      p_payment_intent: pi.id,
    });
    if (error) {
      const code = ['sold_out', 'not_active', 'own_listing', 'not_found'].find((c) => error.message.includes(c));
      if (!code) {
        console.error('server_create_order', error.message);
        return new Response('retry', { status: RETRYABLE });
      }
      // Paid, but the booking cannot exist: give the money back and say so.
      try {
        await refundDeposit(pi.id, `unbookable-${pi.id}`);
      } catch (refundError) {
        console.error('refund after failed booking', refundError);
        return new Response('retry refund', { status: RETRYABLE });
      }
      const { data: listing } = await db.from('listings').select('title').eq('id', meta.eatery_listing_id).maybeSingle();
      await db.from('notifications').insert({
        user_id: meta.eatery_user_id,
        type: 'system',
        title: "Your booking couldn't be completed",
        body: `${listing?.title ?? ''} — your deposit has been refunded.`.trim(),
        data: { listing_id: meta.eatery_listing_id, reason: code },
      });
    }
    return new Response('ok', { status: 200 });
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!piId) return new Response('ok', { status: 200 });
    const { data: order } = await db.from('orders').select('id, status').eq('payment_intent_id', piId).maybeSingle();
    if (!order) return new Response('ok', { status: 200 });
    const patch: Record<string, unknown> = { deposit_refunded: true };
    if (order.status === 'confirmed' && charge.refunded) patch.status = 'cancelled_by_host';
    const { error } = await db.from('orders').update(patch).eq('id', order.id);
    if (error) {
      console.error('record refund', error.message);
      return new Response('retry', { status: RETRYABLE });
    }
  }

  return new Response('ok', { status: 200 });
});
