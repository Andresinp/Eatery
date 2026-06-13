// Supabase Edge Function: stripe-webhook
//
// Receives Stripe events and reconciles them with our orders table.
// Primary jobs:
//   - payment_intent.succeeded     → confirm the order, push notifications
//   - payment_intent.payment_failed → cancel the (pending) order
//   - charge.refunded               → log on the existing order
//
// Deploy:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//
// Configure the endpoint in Stripe Dashboard → Developers → Webhooks,
// listening on the three events above.

// @ts-expect-error — Deno globals
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error — esm.sh
import Stripe from "https://esm.sh/stripe@17.6.0?target=deno";
// @ts-expect-error — esm.sh
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (k: string) =>
  (globalThis as { Deno?: { env: { get: (k: string) => string | undefined } } })
    .Deno?.env.get(k);

const STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = env("SUPABASE_URL")!;
const SERVICE_ROLE = env("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
  : null;

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return new Response("stripe not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`bad signature: ${String(e)}`, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata ?? {};
      // Idempotent upsert: an order with this PI may already exist if the
      // client wrote it after confirmPayment. If not, create it.
      const { data: existing } = await admin
        .from("orders")
        .select("id, guest_id, listing:listings(host_id, title)")
        .eq("payment_intent_id", pi.id)
        .maybeSingle();

      if (existing) {
        await admin
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", existing.id);
        await admin.from("notifications").insert([
          {
            user_id: existing.guest_id,
            type: "booking_confirmed",
            title: "Your deposit is confirmed",
            body: existing.listing?.title ?? "",
            data: { order_id: existing.id },
          },
          ...(existing.listing?.host_id
            ? [
                {
                  user_id: existing.listing.host_id,
                  type: "booking_received" as const,
                  title: "New booking",
                  body: existing.listing?.title ?? "",
                  data: { order_id: existing.id },
                },
              ]
            : []),
        ]);
      } else if (meta.eatery_listing_id && meta.eatery_user_id) {
        const quantity = Number(meta.eatery_quantity ?? 1);
        const deposit = (pi.amount_received ?? pi.amount) / 100;
        const { data: listing } = await admin
          .from("listings")
          .select("price_per_unit, host_id, title")
          .eq("id", meta.eatery_listing_id)
          .single();
        const balance = listing
          ? Number(listing.price_per_unit) * quantity - deposit
          : 0;
        const { data: created } = await admin
          .from("orders")
          .insert({
            listing_id: meta.eatery_listing_id,
            listing_type: meta.eatery_listing_type as "table" | "market",
            guest_id: meta.eatery_user_id,
            quantity,
            deposit_paid: deposit,
            balance_due: balance,
            payment_intent_id: pi.id,
            status: "confirmed",
          })
          .select()
          .single();
        if (created) {
          await admin.from("notifications").insert([
            {
              user_id: meta.eatery_user_id,
              type: "booking_confirmed",
              title: "Your deposit is confirmed",
              body: listing?.title ?? "",
              data: { order_id: created.id },
            },
            {
              user_id: meta.eatery_host_id ?? listing?.host_id,
              type: "booking_received",
              title: "New booking",
              body: listing?.title ?? "",
              data: { order_id: created.id },
            },
          ]);
        }
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await admin
        .from("orders")
        .update({ status: "cancelled_by_guest" })
        .eq("payment_intent_id", pi.id);
      break;
    }
    case "charge.refunded": {
      // Refunds are typically initiated by our cancel-order function; this
      // is a safety net to ensure the order row reflects reality if a refund
      // is issued from the dashboard.
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) {
        const { data: o } = await admin
          .from("orders")
          .select("id, status")
          .eq("payment_intent_id", pi)
          .maybeSingle();
        if (o && o.status === "confirmed") {
          await admin
            .from("orders")
            .update({ status: "cancelled_by_host" })
            .eq("id", o.id);
        }
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
});
