-- Eatery — what the native app needs, and the holes it closes.
--
-- Written to apply on top of the LIVE project, which has drifted from 0001–0005 (it has a
-- `currency` column no migration creates). Every change is guarded (`if not exists`, `drop … if
-- exists`) and backward-compatible: the web app keeps working, phones on old builds keep working.
--
-- What changes, and why:
--  1. Bookings are created only by the server. Before this, the guest's app inserted its own
--     `orders` row with whatever deposit it liked, so a booking could be "confirmed" unpaid.
--  2. Seats and quantities are decremented atomically when a booking is confirmed and given back
--     when it is cancelled. Before this, nothing ever decremented them: tables overbooked freely.
--  3. Private columns are no longer public: profiles.email / dietary_prefs / allergen_exclusions
--     (health data) and listings.exact_address (someone's home) were readable by anyone with the
--     publishable key. Address now goes only to the host and to guests with a confirmed booking.
--  4. refresh_user_ratings is security definer. Without it the trigger ran as the reviewer, RLS
--     let them update only their own profile, and ratings silently never changed.
--  5. Store requirements: push tokens, notification preferences, block and report (guideline
--     1.2), account deletion (5.1.1(v)) is an Edge Function, reminders and review requests.

-- ---------------------------------------------------------------------------------------------
-- 0. Schema drift and private schema
-- ---------------------------------------------------------------------------------------------

alter table public.listings add column if not exists currency text not null default '€';
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.secrets (name text primary key, value text not null);
revoke all on private.secrets from public;

-- Orders are created already confirmed, by the server, once the deposit is paid; there is no
-- pending state. Reviews get their own notification type.
alter type public.notification_type add value if not exists 'review_received';

-- ---------------------------------------------------------------------------------------------
-- 1. Profiles: new fields, new-user trigger reads Apple / Google metadata
-- ---------------------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default
    '{"bookings": true, "reminders": true, "messages": true, "reviews": true, "marketing": false}'::jsonb,
  add column if not exists deleted_at timestamptz,
  -- Set by create-payment-intent; never granted to clients.
  add column if not exists stripe_customer_id text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(coalesce(meta ->> 'full_name', meta ->> 'name'), ''),
    nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Ratings: the trigger must be able to write someone else's profile.
create or replace function public.refresh_user_ratings(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    host_rating = (
      select avg(rating)::numeric(3, 2) from public.reviews
      where reviewee_id = uid and role = 'guest_reviewing_host'
    ),
    guest_rating = (
      select avg(rating)::numeric(3, 2) from public.reviews
      where reviewee_id = uid and role = 'host_reviewing_guest'
    )
  where id = uid;
end;
$$;
revoke execute on function public.refresh_user_ratings(uuid) from public, anon, authenticated;

-- Column privileges: everyone may read the public face of a profile; the private fields are read
-- through my_profile(). A client writes only the fields a person edits about themselves.
revoke select, insert, update on public.profiles from anon, authenticated;
grant select (id, username, full_name, avatar_url, bio, identity_verified, host_rating,
              guest_rating, no_show_count, cancellation_count, language, created_at)
  on public.profiles to anon, authenticated;
grant update (username, full_name, avatar_url, bio, dietary_prefs, allergen_exclusions,
              language, onboarded, notification_prefs)
  on public.profiles to authenticated;

create or replace function public.my_profile()
returns setof public.profiles
language sql stable security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Blocks and reports (guideline 1.2: a way to report content and block abusive users)
-- ---------------------------------------------------------------------------------------------

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks own" on public.blocks;
create policy "blocks own" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
grant select, insert, delete on public.blocks to authenticated;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

alter table public.reports
  add column if not exists listing_id uuid references public.listings(id) on delete set null,
  add column if not exists details text,
  add column if not exists resolved_at timestamptz;
alter table public.reports alter column reported_user_id drop not null;
revoke all on public.reports from anon, authenticated;
grant insert (reporter_id, reported_user_id, listing_id, order_id, reason, details)
  on public.reports to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Listings: hide exact address, hide blocked hosts, availability bookkeeping
-- ---------------------------------------------------------------------------------------------

drop policy if exists "listings read public" on public.listings;
create policy "listings read public" on public.listings for select
  using (
    (status <> 'cancelled' or host_id = auth.uid())
    and not public.is_blocked_between(auth.uid(), host_id)
  );

revoke select on public.listings from anon, authenticated;
grant select (id, host_id, listing_type, title, description, photos, currency, cuisine_tags,
              dietary_tags, allergen_flags, price_per_unit, booking_fee_rate, location_lat,
              location_lng, location_display, status, created_at, meal_time, meal_end_time,
              seats_total, seats_available, dining_setting, drinks_included, drinks,
              product_type_tags, quantity_total, quantity_available, pickup_window_start,
              pickup_window_end, allows_local_delivery, idempotency_key)
  on public.listings to anon, authenticated;
-- A host never sets the booking fee: it is the platform's number. Listings are never deleted by a
-- client (that cascaded away guests' bookings); a host cancels instead.
revoke insert, update, delete on public.listings from anon, authenticated;
drop policy if exists "listings delete own" on public.listings;
grant insert (host_id, listing_type, title, description, photos, currency, cuisine_tags,
              dietary_tags, allergen_flags, price_per_unit, location_lat, location_lng,
              location_display, exact_address, status, meal_time, meal_end_time, seats_total,
              seats_available, dining_setting, drinks_included, drinks, product_type_tags,
              quantity_total, quantity_available, pickup_window_start, pickup_window_end,
              allows_local_delivery, idempotency_key)
  on public.listings to authenticated;
grant update (title, description, photos, currency, cuisine_tags, dietary_tags, allergen_flags,
              price_per_unit, location_lat, location_lng, location_display, exact_address,
              status, meal_time, meal_end_time, seats_total, seats_available, dining_setting,
              drinks_included, drinks, product_type_tags, quantity_total, quantity_available,
              pickup_window_start, pickup_window_end, allows_local_delivery)
  on public.listings to authenticated;

-- The exact address goes to the host and to guests holding a confirmed or completed booking.
create or replace function public.listing_address(p_listing uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select l.exact_address from public.listings l
  where l.id = p_listing
    and (l.host_id = auth.uid() or exists (
      select 1 from public.orders o
      where o.listing_id = l.id and o.guest_id = auth.uid()
        and o.status in ('confirmed', 'completed')));
$$;
revoke execute on function public.listing_address(uuid) from public, anon;
grant execute on function public.listing_address(uuid) to authenticated;

-- A host cancelling a listing that still has upcoming bookings must go through the cancel-listing
-- Edge Function, which refunds each guest. A direct update would leave guests holding a
-- "confirmed" booking for a meal that is not happening.
create or replace function private.guard_listing_cancel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled'
     and current_user in ('anon', 'authenticated')
     and exists (select 1 from public.orders o where o.listing_id = new.id and o.status = 'confirmed') then
    raise exception 'has_bookings' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists listings_guard_cancel on public.listings;
create trigger listings_guard_cancel before update of status on public.listings
  for each row execute function private.guard_listing_cancel();

-- The map shows where a listing is only roughly: the public coordinates are snapped to a grid of
-- about 300–500 m, and the pin the host dropped is kept in exact_lat/exact_lng, which no client
-- can read. Before this the map pin was the host's front door, whatever the address field said.
alter table public.listings
  add column if not exists exact_lat numeric(9, 6),
  add column if not exists exact_lng numeric(9, 6);

create or replace function private.fuzz_listing_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.location_lat is distinct from old.location_lat
     or new.location_lng is distinct from old.location_lng then
    new.exact_lat := new.location_lat;
    new.exact_lng := new.location_lng;
    new.location_lat := round(new.location_lat / 0.004) * 0.004;
    new.location_lng := round(new.location_lng / 0.004) * 0.004;
  end if;
  return new;
end;
$$;
drop trigger if exists listings_fuzz_location on public.listings;
create trigger listings_fuzz_location before insert or update of location_lat, location_lng on public.listings
  for each row execute function private.fuzz_listing_location();

-- Never below zero. NOT VALID so a live row that is already wrong does not stop the migration.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_availability_nonneg') then
    alter table public.listings add constraint listings_availability_nonneg
      check (coalesce(seats_available, 0) >= 0 and coalesce(quantity_available, 0) >= 0) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 4. Orders: only the server creates them; status changes go through functions
-- ---------------------------------------------------------------------------------------------

alter table public.orders
  add column if not exists currency text not null default '€',
  add column if not exists reminded_at timestamptz,
  add column if not exists review_requested_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists deposit_refunded boolean not null default false;
create unique index if not exists orders_payment_intent_uniq
  on public.orders (payment_intent_id) where payment_intent_id is not null;

drop policy if exists "orders insert as guest" on public.orders;
drop policy if exists "orders update participants" on public.orders;
revoke insert, update, delete on public.orders from anon, authenticated;
grant select on public.orders to authenticated;

-- When the meal or pickup starts. Used for cancellation windows, reminders and reviews.
create or replace function private.event_start(l public.listings)
returns timestamptz language sql immutable as $$
  select case when l.listing_type = 'table' then l.meal_time else l.pickup_window_start end;
$$;

create or replace function private.event_end(l public.listings)
returns timestamptz language sql immutable as $$
  select case when l.listing_type = 'table'
              then coalesce(l.meal_end_time, l.meal_time + interval '3 hours')
              else l.pickup_window_end end;
$$;

-- ISO 4217 code for the price prefix a listing stores (src/lib/currencies.ts on the web).
create or replace function private.currency_iso(prefix text)
returns text language sql immutable as $$
  select coalesce((
    select code from (values
      ('€','EUR'),('$','USD'),('£','GBP'),('¥','JPY'),('₹','INR'),('₩','KRW'),('CN¥','CNY'),
      ('₺','TRY'),('CHF','CHF'),('SEK','SEK'),('NOK','NOK'),('DKK','DKK'),('PLN','PLN'),
      ('CZK','CZK'),('RON','RON'),('HUF','HUF'),('BGN','BGN'),('RSD','RSD'),('BAM','BAM'),
      ('MKD','MKD'),('ALL','ALL'),('د.إ','AED'),('SAR','SAR'),('QAR','QAR'),('KWD','KWD'),
      ('BHD','BHD'),('OMR','OMR'),('EGP','EGP'),('MAD','MAD'),('TND','TND'),('NGN','NGN'),
      ('KES','KES'),('GHS','GHS'),('ZAR','ZAR'),('THB','THB'),('S$','SGD'),('HK$','HKD'),
      ('MYR','MYR'),('IDR','IDR'),('PKR','PKR'),('CA$','CAD'),('A$','AUD'),('NZ$','NZD'),
      ('R$','BRL'),('MX$','MXN'),('ARS','ARS'),('CLP','CLP'),('COP','COP'),('PEN','PEN')
    ) as t(p, code) where p = prefix), 'EUR');
$$;

-- The price of a booking, in the listing's currency, computed in one place. The deposit is what
-- the app charges (the platform fee); the balance is paid to the host in person.
create or replace function public.quote_booking(p_listing uuid, p_quantity int)
returns table (total numeric, deposit numeric, balance numeric, currency text, currency_iso text,
               available int, bookable boolean, reason text)
language plpgsql stable security definer
set search_path = public
as $$
declare
  l public.listings;
  avail int;
begin
  select * into l from public.listings where id = p_listing;
  if not found then
    return query select 0::numeric, 0::numeric, 0::numeric, '€'::text, 'EUR'::text, 0, false, 'not_found'::text;
    return;
  end if;
  avail := case when l.listing_type = 'table' then coalesce(l.seats_available, 0)
                else coalesce(l.quantity_available, 0) end;
  total := round(l.price_per_unit * greatest(p_quantity, 0), 2);
  deposit := round(total * l.booking_fee_rate, 2);
  balance := total - deposit;
  currency := l.currency;
  currency_iso := private.currency_iso(l.currency);
  available := avail;
  reason := case
    when p_quantity is null or p_quantity < 1 then 'bad_quantity'
    when l.status <> 'active' then 'not_active'
    when l.host_id = auth.uid() then 'own_listing'
    when public.is_blocked_between(auth.uid(), l.host_id) then 'not_found'
    when coalesce(private.event_end(l), private.event_start(l)) < now() then 'past'
    when avail < p_quantity then 'sold_out'
    else null end;
  bookable := reason is null;
  return next;
end;
$$;
grant execute on function public.quote_booking(uuid, int) to anon, authenticated;

-- Create a confirmed order and take the seats in one statement. Called by the server only: by the
-- payment webhook (deposit paid) and by book_free_listing (nothing to pay). Idempotent on the
-- payment intent, so a webhook retried by Stripe does not double-book.
create or replace function private.create_confirmed_order(
  p_listing uuid, p_guest uuid, p_quantity int, p_deposit numeric, p_payment_intent text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  l public.listings;
  existing uuid;
  new_id uuid;
  total numeric;
begin
  if p_payment_intent is not null then
    select id into existing from public.orders where payment_intent_id = p_payment_intent;
    if existing is not null then return existing; end if;
  end if;

  select * into l from public.listings where id = p_listing for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if l.status <> 'active' then raise exception 'not_active' using errcode = 'P0001'; end if;
  if l.host_id = p_guest then raise exception 'own_listing' using errcode = 'P0001'; end if;

  if l.listing_type = 'table' then
    if coalesce(l.seats_available, 0) < p_quantity then raise exception 'sold_out' using errcode = 'P0001'; end if;
    update public.listings set seats_available = seats_available - p_quantity,
      status = case when seats_available - p_quantity = 0 then 'full' else status end
    where id = l.id;
  else
    if coalesce(l.quantity_available, 0) < p_quantity then raise exception 'sold_out' using errcode = 'P0001'; end if;
    update public.listings set quantity_available = quantity_available - p_quantity,
      status = case when quantity_available - p_quantity = 0 then 'full' else status end
    where id = l.id;
  end if;

  total := round(l.price_per_unit * p_quantity, 2);
  insert into public.orders (listing_id, listing_type, guest_id, quantity, deposit_paid,
                             balance_due, payment_intent_id, status, currency)
  values (l.id, l.listing_type, p_guest, p_quantity, p_deposit, greatest(total - p_deposit, 0),
          p_payment_intent, 'confirmed', l.currency)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function private.create_confirmed_order(uuid, uuid, int, numeric, text) from public;

-- A wrapper the service role can reach through PostgREST (private is not exposed).
create or replace function public.server_create_order(
  p_listing uuid, p_guest uuid, p_quantity int, p_deposit numeric, p_payment_intent text)
returns uuid language sql security definer set search_path = public as $$
  select private.create_confirmed_order(p_listing, p_guest, p_quantity, p_deposit, p_payment_intent);
$$;
revoke execute on function public.server_create_order(uuid, uuid, int, numeric, text) from public, anon, authenticated;
grant execute on function public.server_create_order(uuid, uuid, int, numeric, text) to service_role;

-- Booking a listing whose deposit is zero (a free listing): nothing to pay, so no Stripe.
create or replace function public.book_free_listing(p_listing uuid, p_quantity int)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  q record;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select * into q from public.quote_booking(p_listing, p_quantity);
  if not q.bookable then raise exception '%', q.reason using errcode = 'P0001'; end if;
  if q.deposit > 0 then raise exception 'payment_required' using errcode = 'P0001'; end if;
  return private.create_confirmed_order(p_listing, auth.uid(), p_quantity, 0, null);
end;
$$;
revoke execute on function public.book_free_listing(uuid, int) from public, anon;
grant execute on function public.book_free_listing(uuid, int) to authenticated;

-- Seats come back when a confirmed booking is cancelled (not on a no-show: the meal happened).
create or replace function private.on_order_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.status = 'confirmed' and new.status in ('cancelled_by_guest', 'cancelled_by_host') then
    update public.listings set
      seats_available = case when listing_type = 'table'
        then least(coalesce(seats_available, 0) + old.quantity, coalesce(seats_total, seats_available + old.quantity))
        else seats_available end,
      quantity_available = case when listing_type = 'market'
        then least(coalesce(quantity_available, 0) + old.quantity, coalesce(quantity_total, quantity_available + old.quantity))
        else quantity_available end,
      status = case when status = 'full' then 'active' else status end
    where id = old.listing_id;
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;
  return new;
end;
$$;
drop trigger if exists orders_status on public.orders;
create trigger orders_status before update of status on public.orders
  for each row execute function private.on_order_status();

-- Either side marks the meal or pickup as done once it has started; both → completed.
create or replace function public.mark_order_done(p_order uuid)
returns public.order_status
language plpgsql security definer
set search_path = public
as $$
declare
  o public.orders;
  l public.listings;
  me uuid := auth.uid();
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into l from public.listings where id = o.listing_id;
  if me is null or (me <> o.guest_id and me <> l.host_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status <> 'confirmed' then return o.status; end if;
  if private.event_start(l) > now() then raise exception 'too_early' using errcode = 'P0001'; end if;
  update public.orders set
    host_confirmed = host_confirmed or me = l.host_id,
    guest_confirmed = guest_confirmed or me = o.guest_id,
    status = case when (host_confirmed or me = l.host_id) and (guest_confirmed or me = o.guest_id)
                  then 'completed' else status end
  where id = o.id
  returning status into o.status;
  return o.status;
end;
$$;
revoke execute on function public.mark_order_done(uuid) from public, anon;
grant execute on function public.mark_order_done(uuid) to authenticated;

-- A strike on someone's public record (shown on their profile): a host cancelling, or a no-show.
-- Atomic increment, server only (the cancel-order function).
create or replace function public.server_add_strike(p_user uuid, p_kind text)
returns void
language sql security definer
set search_path = public
as $$
  update public.profiles set
    cancellation_count = cancellation_count + case when p_kind = 'cancellation' then 1 else 0 end,
    no_show_count = no_show_count + case when p_kind = 'no_show' then 1 else 0 end
  where id = p_user;
$$;
revoke execute on function public.server_add_strike(uuid, text) from public, anon, authenticated;
grant execute on function public.server_add_strike(uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- 5. Reviews: one per side per order, after the event, reviewee derived not chosen
-- ---------------------------------------------------------------------------------------------

drop policy if exists "reviews insert participant" on public.reviews;
revoke insert, update, delete on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

create or replace function public.submit_review(p_order uuid, p_rating int, p_comment text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  o public.orders;
  l public.listings;
  me uuid := auth.uid();
  new_id uuid;
begin
  select * into o from public.orders where id = p_order;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into l from public.listings where id = o.listing_id;
  if me is null or (me <> o.guest_id and me <> l.host_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if o.status not in ('confirmed', 'completed') or private.event_start(l) > now() then
    raise exception 'too_early' using errcode = 'P0001';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'bad_rating' using errcode = 'P0001';
  end if;
  insert into public.reviews (order_id, reviewer_id, reviewee_id, role, rating, comment)
  values (o.id, me,
          case when me = o.guest_id then l.host_id else o.guest_id end,
          case when me = o.guest_id then 'guest_reviewing_host'::public.review_role
               else 'host_reviewing_guest'::public.review_role end,
          p_rating, nullif(trim(left(coalesce(p_comment, ''), 1000)), ''))
  on conflict (order_id, reviewer_id) do update set rating = excluded.rating, comment = excluded.comment
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.submit_review(uuid, int, text) from public, anon;
grant execute on function public.submit_review(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Messages: participants only, not across a block, length-limited
-- ---------------------------------------------------------------------------------------------

drop policy if exists "messages insert participant" on public.messages;
create policy "messages insert participant" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and length(content) <= 2000
    and exists (
      select 1 from public.orders o join public.listings l on l.id = o.listing_id
      where o.id = messages.order_id
        and (o.guest_id = auth.uid() or l.host_id = auth.uid())
        and not public.is_blocked_between(o.guest_id, l.host_id))
  );

-- "messages update own" let a sender rewrite their own message after it was read. The only
-- legitimate update is the recipient marking messages read, which goes through a function.
drop policy if exists "messages update own" on public.messages;
revoke update, delete on public.messages from anon, authenticated;

create or replace function public.mark_messages_read(p_order uuid)
returns void
language sql security definer
set search_path = public
as $$
  update public.messages m set read = true
  where m.order_id = p_order and m.sender_id <> auth.uid() and not m.read
    and exists (
      select 1 from public.orders o join public.listings l on l.id = o.listing_id
      where o.id = p_order and (o.guest_id = auth.uid() or l.host_id = auth.uid()));
$$;
revoke execute on function public.mark_messages_read(uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 7. Notifications: written by triggers, pushed through pg_net → send-push
-- ---------------------------------------------------------------------------------------------

alter table public.notifications add column if not exists push boolean not null default true;
revoke insert, update, delete on public.notifications from anon, authenticated;
grant select, update (read) on public.notifications to authenticated;

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists "push tokens own" on public.push_tokens;
create policy "push tokens own" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.push_tokens from anon, authenticated;
grant select, delete on public.push_tokens to authenticated;

-- A token belongs to whoever signed in last on that phone.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language sql security definer
set search_path = public
as $$
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform,
                                    updated_at = now();
$$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

create or replace function private.notify(
  p_user uuid, p_type public.notification_type, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb));
end;
$$;

-- New booking → guest and host. Cancellation → the other side.
create or replace function private.on_order_notify()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  l public.listings;
  guest_name text;
begin
  select * into l from public.listings where id = new.listing_id;
  select coalesce(full_name, 'A guest') into guest_name from public.profiles where id = new.guest_id;
  if tg_op = 'INSERT' and new.status = 'confirmed' then
    perform private.notify(new.guest_id, 'booking_confirmed', 'Booking confirmed', l.title,
      jsonb_build_object('order_id', new.id, 'listing_id', l.id));
    perform private.notify(l.host_id, 'booking_received', 'New booking',
      guest_name || ' · ' || new.quantity || ' · ' || l.title,
      jsonb_build_object('order_id', new.id, 'listing_id', l.id, 'quantity', new.quantity));
  elsif tg_op = 'UPDATE' and old.status = 'confirmed' and new.status <> old.status
        and new.status <> 'completed' then
    perform private.notify(
      case when new.status in ('cancelled_by_guest', 'no_show_guest') then l.host_id else new.guest_id end,
      case when new.status::text like 'no_show%' then 'no_show'::public.notification_type
           else 'order_cancelled'::public.notification_type end,
      'Booking cancelled', l.title,
      jsonb_build_object('order_id', new.id, 'listing_id', l.id, 'status', new.status));
  end if;
  return null;
end;
$$;
drop trigger if exists orders_notify on public.orders;
create trigger orders_notify after insert or update of status on public.orders
  for each row execute function private.on_order_notify();

create or replace function private.on_message_notify()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  o public.orders;
  l public.listings;
  sender_name text;
begin
  select * into o from public.orders where id = new.order_id;
  select * into l from public.listings where id = o.listing_id;
  select coalesce(full_name, 'Someone') into sender_name from public.profiles where id = new.sender_id;
  perform private.notify(
    case when new.sender_id = o.guest_id then l.host_id else o.guest_id end,
    'message', sender_name, left(new.content, 140),
    jsonb_build_object('order_id', o.id, 'listing_id', l.id));
  return null;
end;
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function private.on_message_notify();

create or replace function private.on_review_notify()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.reviewee_id, 'review_received', 'New review',
      repeat('★', new.rating), jsonb_build_object('order_id', new.order_id));
  end if;
  return null;
end;
$$;
drop trigger if exists reviews_notify on public.reviews;
create trigger reviews_notify after insert on public.reviews
  for each row execute function private.on_review_notify();

-- Push: configure after deploying send-push (values are never committed):
--   insert into private.secrets values ('push_function_url', 'https://<ref>.supabase.co/functions/v1/send-push');
--   insert into private.secrets values ('push_webhook_secret', '<same value as the function secret>');
create or replace function private.dispatch_push()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  url text := (select value from private.secrets where name = 'push_function_url');
  secret text := (select value from private.secrets where name = 'push_webhook_secret');
begin
  if new.push and url is not null and secret is not null
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using url,
            jsonb_build_object('notification_id', new.id),
            jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret);
  end if;
  return null;
end;
$$;
drop trigger if exists dispatch_push on public.notifications;
create trigger dispatch_push after insert on public.notifications
  for each row execute function private.dispatch_push();

-- Reminders the day before, review requests after. Run every 15 minutes by pg_cron.
create or replace function private.run_scheduled_notifications()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select o.id, o.guest_id, l.host_id, l.id as listing_id, l.title
    from public.orders o join public.listings l on l.id = o.listing_id
    where o.status = 'confirmed' and o.reminded_at is null
      and private.event_start(l) between now() and now() + interval '24 hours'
    for update of o skip locked
  loop
    perform private.notify(r.guest_id, 'reminder', 'Tomorrow', r.title,
      jsonb_build_object('order_id', r.id, 'listing_id', r.listing_id));
    update public.orders set reminded_at = now() where id = r.id;
  end loop;

  for r in
    select o.id, o.guest_id, l.host_id, l.id as listing_id, l.title
    from public.orders o join public.listings l on l.id = o.listing_id
    where o.status in ('confirmed', 'completed') and o.review_requested_at is null
      and coalesce(private.event_end(l), private.event_start(l)) < now()
      and coalesce(private.event_end(l), private.event_start(l)) > now() - interval '14 days'
    for update of o skip locked
  loop
    perform private.notify(r.guest_id, 'review_request', 'How was it?', r.title,
      jsonb_build_object('order_id', r.id, 'listing_id', r.listing_id));
    perform private.notify(r.host_id, 'review_request', 'How was it?', r.title,
      jsonb_build_object('order_id', r.id, 'listing_id', r.listing_id));
    update public.orders set review_requested_at = now() where id = r.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 8. Account deletion support (the delete-account Edge Function calls this, then deletes the
--    auth user, which cascades). Upcoming bookings on the person's tables are cancelled first so
--    their guests are told and refunded by the function.
-- ---------------------------------------------------------------------------------------------

create or replace function public.server_orders_to_refund(p_user uuid)
returns table (order_id uuid, payment_intent_id text, deposit numeric, guest_id uuid)
language sql stable security definer
set search_path = public
as $$
  select o.id, o.payment_intent_id, o.deposit_paid, o.guest_id
  from public.orders o join public.listings l on l.id = o.listing_id
  where o.status = 'confirmed' and private.event_start(l) > now()
    and (l.host_id = p_user or o.guest_id = p_user);
$$;
revoke execute on function public.server_orders_to_refund(uuid) from public, anon, authenticated;
grant execute on function public.server_orders_to_refund(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- 9. Storage: let people remove their own avatar
-- ---------------------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    drop policy if exists "auth delete own avatars" on storage.objects;
    create policy "auth delete own avatars" on storage.objects for delete
      using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 10. Realtime for chat and the notification badge; jobs; pg_net
-- ---------------------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    execute $j$select cron.schedule('eatery-scheduled-notifications', '*/15 * * * *', 'select private.run_scheduled_notifications()')$j$;
  end if;
end $$;
