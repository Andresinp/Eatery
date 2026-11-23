// create-payment-intent — starts paying the booking deposit (spec §7, Hostelworld split: the app
// charges the deposit, the balance is paid to the host in person).
//
// The price comes from public.quote_booking, the one place it is computed, in the LISTING's
// currency (before: always EUR). No order is created here: stripe-webhook creates it, with the
// seats, when Stripe says the money is there. Returns what the native PaymentSheet needs.
//
// Deploy: supabase functions deploy create-payment-intent
// Secrets: STRIPE_SECRET_KEY
import { admin, caller, CORS, fail, json, readJson } from '../_shared/http.ts';
import { stripe, toMinorUnits } from '../_shared/stripe.ts';

type Body = { listing_id?: string; quantity?: number };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return fail('payments_unavailable', 503, 'STRIPE_SECRET_KEY not set');

  const user = await caller(req);
  if (!user) return fail('not_signed_in', 401);
  const body = await readJson<Body>(req);
  const quantity = Number(body?.quantity);
  if (!body?.listing_id || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) return fail('bad_quantity', 400);

  const db = admin();
  // As the service role auth.uid() is null, so quote_booking cannot see who is booking: the
  // own-listing and block checks are made explicitly below.
  const { data: quotes, error: qerr } = await db.rpc('quote_booking', { p_listing: body.listing_id, p_quantity: quantity });
  const quote = Array.isArray(quotes) ? quotes[0] : null;
  if (qerr || !quote) return fail('not_found', 404, qerr);

  const { data: listing, error: lerr } = await db.from('listings').select('id, host_id, title, listing_type').eq('id', body.listing_id).single();
  if (lerr || !listing) return fail('not_found', 404, lerr);
  if (listing.host_id === user.id) return fail('own_listing', 409);
  const { data: blocked } = await db.rpc('is_blocked_between', { a: user.id, b: listing.host_id });
  if (blocked) return fail('not_found', 404);
  if (!quote.bookable) return fail(quote.reason ?? 'not_active', 409);
  if (Number(quote.deposit) <= 0) return fail('payment_required', 409, 'deposit is zero: use book_free_listing');

  const iso = String(quote.currency_iso);
  const amount = toMinorUnits(Number(quote.deposit), iso);

  try {
    const s = stripe();
    // One Stripe customer per person, remembered on the profile (never readable by clients).
    const { data: profile } = await db.from('profiles').select('email, full_name, stripe_customer_id').eq('id', user.id).single();
    let customerId: string | null = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await s.customers.create(
        { email: profile?.email ?? user.email ?? undefined, name: profile?.full_name ?? undefined, metadata: { eatery_user_id: user.id } },
        { idempotencyKey: `customer-${user.id}` },
      );
      customerId = customer.id;
      await db.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const ephemeralKey = await s.ephemeralKeys.create({ customer: customerId }, { apiVersion: '2025-02-24.acacia' });
    const intent = await s.paymentIntents.create({
      amount,
      currency: iso.toLowerCase(),
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      description: `Eatery deposit · ${listing.title}`,
      metadata: {
        eatery_listing_id: listing.id,
        eatery_user_id: user.id,
        eatery_host_id: listing.host_id,
        eatery_quantity: String(quantity),
        eatery_deposit: String(quote.deposit),
      },
    });

    return json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      customer_id: customerId,
      ephemeral_key: ephemeralKey.secret,
      deposit: Number(quote.deposit),
      balance: Number(quote.balance),
      total: Number(quote.total),
      currency: quote.currency,
      currency_iso: iso,
    });
  } catch (error) {
    return fail('payments_unavailable', 502, error);
  }
});
