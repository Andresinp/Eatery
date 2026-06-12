-- Eatery — storage buckets

-- Public bucket for listing photos.
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Public bucket for profile avatars.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read both buckets (they're public).
create policy "public read listing-photos"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload to a folder named by their auth.uid().
-- We enforce that folder ownership via the path prefix.
create policy "auth write own listing-photos"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "auth update own listing-photos"
  on storage.objects for update
  using (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "auth delete own listing-photos"
  on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "auth write own avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "auth update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
