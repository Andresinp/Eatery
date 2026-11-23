import Stripe from 'npm:stripe@17.7.0';

import { env } from './http.ts';

export function stripe(): Stripe {
  return new Stripe(env('STRIPE_SECRET_KEY'), { apiVersion: '2025-02-24.acacia', httpClient: Stripe.createFetchHttpClient() });
}

// Stripe amounts are in the currency's minor unit. Zero-decimal currencies take whole units;
// three-decimal ones take thousandths rounded to a multiple of 10 (Stripe's rule).
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

export function toMinorUnits(amount: number, iso: string): number {
  if (ZERO_DECIMAL.has(iso)) return Math.round(amount);
  if (THREE_DECIMAL.has(iso)) return Math.round(amount * 100) * 10;
  return Math.round(amount * 100);
}

export function fromMinorUnits(minor: number, iso: string): number {
  if (ZERO_DECIMAL.has(iso)) return minor;
  if (THREE_DECIMAL.has(iso)) return minor / 1000;
  return minor / 100;
}

// Refund a deposit exactly once per order, whatever retries happen.
export async function refundDeposit(paymentIntentId: string, orderId: string): Promise<void> {
  await stripe().refunds.create(
    { payment_intent: paymentIntentId, reason: 'requested_by_customer', metadata: { eatery_order_id: orderId } },
    { idempotencyKey: `refund-${orderId}` },
  );
}
