import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "./supabase";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise: Promise<Stripe | null> | null = pk
  ? loadStripe(pk)
  : null;

export const isStripeConfigured = !!pk && !!supabase;

export interface CreatePIResult {
  client_secret: string;
  payment_intent_id: string;
  deposit: number;
  balance: number;
  total: number;
  currency: string;
}

export async function createPaymentIntent(
  listing_id: string,
  quantity: number,
): Promise<CreatePIResult> {
  if (!supabase) throw new Error("Supabase isn't configured");
  const { data, error } = await supabase.functions.invoke<CreatePIResult>(
    "create-payment-intent",
    { body: { listing_id, quantity } },
  );
  if (error) throw error;
  if (!data?.client_secret) throw new Error("No client_secret returned");
  return data;
}

export async function cancelOrder(
  order_id: string,
  reason: "by_guest" | "by_host" | "no_show_guest" | "no_show_host",
): Promise<{ status: string; refunded: boolean; deposit_refunded: number }> {
  if (!supabase) throw new Error("Supabase isn't configured");
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    refunded: boolean;
    deposit_refunded: number;
  }>("cancel-order", { body: { order_id, reason } });
  if (error) throw error;
  if (!data) throw new Error("No response");
  return data;
}
