-- A photo of where guests eat, required on a new table listing from the native app, and kept on
-- the host's profile so the next listing can reuse it instead of uploading it again.
--
-- Additive only: older app builds and the web app never write these columns.

-- The listing's copy (column and read grant came in 0007); the host may now write it.
grant insert (dining_setting_photos), update (dining_setting_photos) on public.listings to authenticated;

-- The host's saved photos of their place, newest first. Private like the other personal fields:
-- no select grant, read through my_profile() (security definer, `select *`).
alter table public.profiles add column if not exists dining_place_photos text[] not null default '{}';
grant update (dining_place_photos) on public.profiles to authenticated;
