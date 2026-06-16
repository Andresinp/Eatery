-- Eatery — add drinks + meal end time to table listings
-- Apply via: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Or via Supabase CLI: supabase db push

-- Drinks are a table-listing characteristic surfaced in the listing details so
-- guests know what's included before booking. `meal_end_time` lets us render a
-- proper meal window (e.g. "20:30–23:00") instead of just a start time.
alter table public.listings
  add column if not exists meal_end_time  timestamptz,
  add column if not exists drinks_included boolean not null default false,
  add column if not exists drinks          text[] not null default '{}';
