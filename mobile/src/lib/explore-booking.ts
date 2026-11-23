// Booking helpers: waiting for the webhook's order, and the one-time push prompt after a booking.

import { api, type Order } from './api';
import { ORDER_POLL_INTERVAL_MS, ORDER_POLL_TIMEOUT_MS } from './explore-payments';
import { logError } from './log';
import { registerForPush } from './push';

const PUSH_ASKED_KEY = 'eatery.push.askedAfterBooking';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Polls until the webhook has created the order for this payment, or gives up (null).
// `isCancelled` stops early when the screen goes away. A failed poll is logged and retried.
export async function waitForOrder(paymentIntentId: string, isCancelled: () => boolean): Promise<Order | null> {
  const deadline = Date.now() + ORDER_POLL_TIMEOUT_MS;
  while (Date.now() < deadline && !isCancelled()) {
    try {
      const order = await api.orderByPaymentIntent(paymentIntentId);
      if (order) return order;
    } catch (error) {
      logError('booking: orderByPaymentIntent', error);
    }
    await sleep(ORDER_POLL_INTERVAL_MS);
  }
  return null;
}

// After the first successful booking, ask for notifications (booking updates, host messages).
export function askForPushAfterFirstBooking(): void {
  try {
    if (localStorage.getItem(PUSH_ASKED_KEY)) return;
    localStorage.setItem(PUSH_ASKED_KEY, '1');
  } catch (error) {
    logError('booking: push flag', error);
  }
  registerForPush().catch((error: unknown) => logError('booking: registerForPush', error));
}
