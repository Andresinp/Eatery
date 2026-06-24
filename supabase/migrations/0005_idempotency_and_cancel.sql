-- Add idempotency_key to listings to prevent duplicate creation from rapid taps
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS listings_idempotency_key_idx
  ON public.listings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
