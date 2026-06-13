// Supabase Edge Function: cancel-order
//
// Authoritative cancellation handler. Enforces the policy in
// src/lib/cancellation.ts (mirrored below to keep the function
// self-contained) and issues a Stripe refund when due.
//
// Deploy:
//   supabase functions deploy cancel-order

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
const ANON = env("SUPABASE_ANON_KEY")!;

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
  : null;

const GUEST_FREE_CANCEL_HOURS = 24;

type CancellationReason =
  | "by_guest"
  | "by_host"
  | "no_show_guest"
  | "no_show_host";

function decide(reason: CancellationReason, eventStartIso: string) {
  const hoursUntil =
    (new Date(eventStartIso).getTime() - Date.now()) / (1000 * 60 * 60);
  switch (reason) {
    case "by_guest":
      return {
        refund: hoursUntil >= GUEST_FREE_CANCEL_HOURS,
        guestStrike: false,
        hostCancelStrike: false,
        hostNoShowStrike: false,
        newStatus: "cancelled_by_guest" as const,
      };
    case "by_host":
      return {
        refund: true,
        guestStrike: false,
        hostCancelStrike: true,
        hostNoShowStrike: false,
        newStatus: "cancelled_by_host" as const,
      };
    case "no_show_guest":
      return {
        refund: false,
        guestStrike: true,
        hostCancelStrike: false,
        hostNoShowStrike: false,
        newStatus: "no_show_guest" as const,
      };
    case "no_show_host":
      return {
        refund: true,
        guestStrike: false,
        hostCancelStrike: false,
        hostNoShowStrike: true,
        newStatus: "no_show_host" as const,
      };
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return json({ error: "not signed in" }, 401);

  let body: { order_id?: string; reason?: CancellationReason };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.order_id || !body.reason) {
    return json({ error: "order_id and reason required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: order, error: oerr } = await admin
    .from("orders")
    .select(
      "id, listing_id, guest_id, status, deposit_paid, payment_intent_id, listing:listings(host_id, meal_time, pickup_window_start)",
    )
    .eq("id", body.order_id)
    .single();
  if (oerr || !order) return json({ error: "order not found" }, 404);
  if (order.status !== "confirmed") {
    return json({ error: `cannot cancel from status ${order.status}` }, 409);
  }

  // Authz — only the guest or host of this order can cancel it.
  const isGuest = order.guest_id === user.id;
  const isHost = order.listing?.host_id === user.id;
  if (!isGuest && !isHost) return json({ error: "forbidden" }, 403);
  if (body.reason === "by_guest" && !isGuest) return json({ error: "forbidden" }, 403);
  if ((body.reason === "by_host" || body.reason === "no_show_guest") && !isHost) {
    return json({ error: "forbidden" }, 403);
  }
  if (body.reason === "no_show_host" && !isGuest) return json({ error: "forbidden" }, 403);

  const eventStart =
    order.listing?.meal_time ?? order.listing?.pickup_window_start ?? new Date().toISOString();
  const outcome = decide(body.reason, eventStart);

  // Refund first — if it fails we don't want to mark the order cancelled.
  if (outcome.refund && order.payment_intent_id && stripe) {
    try {
      await stripe.refunds.create({
        payment_intent: order.payment_intent_id,
        reason:
          body.reason === "by_host"
            ? "requested_by_customer"
            : body.reason === "no_show_host"
            ? "requested_by_customer"
            : "requested_by_customer",
      });
    } catch (e) {
      return json({ error: "refund failed", detail: String(e) }, 502);
    }
  }

  await admin.from("orders").update({ status: outcome.newStatus }).eq("id", order.id);

  // Strikes
  if (outcome.guestStrike) {
    await admin.rpc("increment_no_show", { uid: order.guest_id }).then(() => {}).catch(async () => {
      // Fallback if no RPC: read-modify-write.
      const { data: p } = await admin.from("profiles").select("no_show_count").eq("id", order.guest_id).single();
      await admin.from("profiles").update({ no_show_count: (p?.no_show_count ?? 0) + 1 }).eq("id", order.guest_id);
    });
  }
  if (outcome.hostCancelStrike) {
    const { data: p } = await admin
      .from("profiles")
      .select("cancellation_count")
      .eq("id", order.listing?.host_id)
      .single();
    await admin
      .from("profiles")
      .update({ cancellation_count: (p?.cancellation_count ?? 0) + 1 })
      .eq("id", order.listing?.host_id);
  }
  if (outcome.hostNoShowStrike) {
    const { data: p } = await admin
      .from("profiles")
      .select("no_show_count")
      .eq("id", order.listing?.host_id)
      .single();
    await admin
      .from("profiles")
      .update({ no_show_count: (p?.no_show_count ?? 0) + 1 })
      .eq("id", order.listing?.host_id);
  }

  // Notify the other party.
  const recipient = isGuest ? order.listing?.host_id : order.guest_id;
  if (recipient) {
    await admin.from("notifications").insert({
      user_id: recipient,
      type: outcome.refund ? "order_cancelled" : "no_show",
      title: outcome.newStatus.replace(/_/g, " "),
      body: `Order ${order.id.slice(0, 8)} · ${outcome.newStatus.replace(/_/g, " ")}`,
      data: { order_id: order.id },
    });
  }

  return json({
    status: outcome.newStatus,
    refunded: outcome.refund,
    deposit_refunded: outcome.refund ? Number(order.deposit_paid) : 0,
  });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
