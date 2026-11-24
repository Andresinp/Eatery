-- Photos of where guests eat are public listing content (the web app's detail page and the native
-- app both show them), but 0006's column grant left them out, so clients could never read them.
--
-- The live project already has this column (added outside any migration, like listings.currency);
-- `if not exists` matches its live definition so this applies on top of it and on a fresh database.
-- Additive only: older app builds never select this column.
alter table public.listings add column if not exists dining_setting_photos text[] not null default '{}';
grant select (dining_setting_photos) on public.listings to anon, authenticated;
