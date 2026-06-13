// Supabase Edge Function: create-payment-intent
//
// Creates a Stripe PaymentIntent for the booking deposit only.
// Spec §7 — Hostelworld split: app charges the deposit, the balance is
// settled in person with the host.
//
// Deploy:
//   supabase functions deploy create-payment-intent
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)

// @ts-expect-error — Deno globals available at runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error — esm.sh
import Stripe from "https://esm.sh/stripe@17.6.0?target=deno";
// @ts-expect-error — esm.sh
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (k: string) =>
  (globalThis as { Deno?: { env: { get: (k: string) => string | undefined } } })
    .Deno?.env.get(k);

const STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY");
const SUPABASE_URL = env("SUPABASE_URL")!;
const SERVICE_ROLE = env("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
  : null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!stripe) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

  const authHeader = req.headers.get("authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, env("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userResp } = await userClient.auth.getUser();
  const user = userResp?.user;
  if (!user) return json({ error: "not signed in" }, 401);

  let body: { listing_id?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (!body.listing_id || !body.quantity || body.quantity < 1) {
    return json({ error: "listing_id and quantity required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: listing, error: lerr } = await admin
    .from("listings")
    .select("id, host_id, listing_type, price_per_unit, booking_fee_rate, title, meal_time, pickup_window_start, seats_available, quantity_available")
    .eq("id", body.listing_id)
    .single();
  if (lerr || !listing) return json({ error: "listing not found" }, 404);

  const available =
    listing.listing_type === "table"
      ? listing.seats_available ?? 0
      : listing.quantity_available ?? 0;
  if (available < body.quantity) {
    return json({ error: "not enough left" }, 409);
  }

  const total = Number(listing.price_per_unit) * body.quantity;
  const deposit = Math.round(total * Number(listing.booking_fee_rate) * 100); // cents
  const balance = Math.round(total * 100 - deposit);

  // Look up / create Stripe customer; store the id on profile via metadata.
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", user.id)
    .single();

  // Search Stripe by email; if not found, create.
  let customerId: string | null = null;
  if (profile?.email) {
    const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
    if (customers.data.length) customerId = customers.data[0].id;
  }
  if (!customerId) {
    const created = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { eatery_user_id: user.id },
    });
    customerId = created.id;
  }

  const pi = await stripe.paymentIntents.create({
    amount: deposit,
    currency: "eur",
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    setup_future_usage: "off_session",
    metadata: {
      eatery_listing_id: listing.id,
      eatery_user_id: user.id,
      eatery_host_id: listing.host_id,
      eatery_quantity: String(body.quantity),
      eatery_listing_type: listing.listing_type,
    },
    description: `Deposit · ${listing.title}`,
  });

  return json({
    client_secret: pi.client_secret,
    payment_intent_id: pi.id,
    deposit: deposit / 100,
    balance: balance / 100,
    total,
    currency: "EUR",
  });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
