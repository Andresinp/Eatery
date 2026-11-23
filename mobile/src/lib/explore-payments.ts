// Payment constants for the booking screen.

// The two-letter country of the Stripe account (e.g. 'ES', 'TR'). Apple Pay and Google Pay are
// offered in the payment sheet only when this is set. It MUST match the country of the Stripe
// account that takes the payments; leave empty until that account exists.
export const MERCHANT_COUNTRY_CODE = '';

export const MERCHANT_DISPLAY_NAME = 'Eatery';
export const STRIPE_RETURN_URL = 'eatery://stripe-redirect';

// After the payment sheet succeeds the webhook creates the order; poll for it this often, this long.
export const ORDER_POLL_INTERVAL_MS = 1500;
export const ORDER_POLL_TIMEOUT_MS = 25_000;
