-- 0004_table_drinks_and_extras.sql
-- Adds the fields introduced by the "Post a Table" flow improvements:
--   * currency selector on price
--   * meal end time (start time already lives in meal_time)
--   * drinks included + the list of drinks served
--   * dining-setting photos (up to 3, enforced in the app)
--
-- All columns are nullable or have defaults, so this is safe to run on a
-- table that already holds data.

alter table public.listings
  add column if not exists currency              text    not null default '€',
  add column if not exists meal_end_time         timestamptz,
  add column if not exists drinks_included       boolean not null default false,
  add column if not exists drinks                text[]  not null default '{}',
  add column if not exists dining_setting_photos text[]  not null default '{}';
