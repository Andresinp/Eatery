-- Eatery — row-level security policies

alter table public.profiles       enable row level security;
alter table public.listings       enable row level security;
alter table public.orders         enable row level security;
alter table public.reviews        enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;
alter table public.reports        enable row level security;

-- =========================================================================
-- profiles — public read, self-only write
-- =========================================================================
create policy "profiles read public"
  on public.profiles for select
  using (true);

create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profile rows are created by the on_auth_user_created trigger; no direct inserts.

-- =========================================================================
-- listings — public read of active; host can write their own
-- =========================================================================
create policy "listings read public"
  on public.listings for select
  using (status <> 'cancelled' or host_id = auth.uid());

create policy "listings insert own"
  on public.listings for insert
  with check (host_id = auth.uid());

create policy "listings update own"
  on public.listings for update
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "listings delete own"
  on public.listings for delete
  using (host_id = auth.uid());

-- =========================================================================
-- orders — visible to guest + host; insert by guest; update by either party
-- =========================================================================
create policy "orders read participants"
  on public.orders for select
  using (
    guest_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = orders.listing_id and l.host_id = auth.uid()
    )
  );

create policy "orders insert as guest"
  on public.orders for insert
  with check (guest_id = auth.uid());

create policy "orders update participants"
  on public.orders for update
  using (
    guest_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = orders.listing_id and l.host_id = auth.uid()
    )
  );

-- =========================================================================
-- reviews — public read; insert only if you're a participant in the order
-- =========================================================================
create policy "reviews read public"
  on public.reviews for select
  using (true);

create policy "reviews insert participant"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      left join public.listings l on l.id = o.listing_id
      where o.id = reviews.order_id
        and (o.guest_id = auth.uid() or l.host_id = auth.uid())
    )
  );

-- =========================================================================
-- messages — only participants in the order can read/write
-- =========================================================================
create policy "messages read participants"
  on public.messages for select
  using (
    exists (
      select 1 from public.orders o
      left join public.listings l on l.id = o.listing_id
      where o.id = messages.order_id
        and (o.guest_id = auth.uid() or l.host_id = auth.uid())
    )
  );

create policy "messages insert participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.orders o
      left join public.listings l on l.id = o.listing_id
      where o.id = messages.order_id
        and (o.guest_id = auth.uid() or l.host_id = auth.uid())
    )
  );

create policy "messages update own"
  on public.messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- =========================================================================
-- notifications — self-only
-- =========================================================================
create policy "notifications read own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications update own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts come from server-side flows (Edge Functions / service role); no
-- broad insert policy for end-users.

-- =========================================================================
-- reports — write-only for end users; reads via service role / admin
-- =========================================================================
create policy "reports insert authenticated"
  on public.reports for insert
  with check (reporter_id = auth.uid());
