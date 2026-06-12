-- Eatery — initial schema
-- Apply via: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Or via Supabase CLI: supabase db push

create extension if not exists "uuid-ossp";

-- =========================================================================
-- profiles
-- One row per authenticated user (1:1 with auth.users).
-- =========================================================================
create table public.profiles (
  id                    uuid primary key references auth.users on delete cascade,
  username              text unique,
  full_name             text,
  avatar_url            text,
  bio                   text,
  email                 text,
  phone_verified        boolean not null default false,
  identity_verified     boolean not null default false,
  host_rating           numeric(3, 2),
  guest_rating          numeric(3, 2),
  no_show_count         int not null default 0,
  cancellation_count    int not null default 0,
  dietary_prefs         text[] not null default '{}',
  allergen_exclusions   text[] not null default '{}',
  language              text not null default 'en',
  onboarded             boolean not null default false,
  created_at            timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

-- Auto-create a profile row when a new auth.users row is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- listings (unified for Table + Market)
-- =========================================================================
create type public.listing_type as enum ('table', 'market');
create type public.listing_status as enum ('active', 'full', 'cancelled', 'completed');
create type public.dining_setting as enum (
  'indoor_table', 'garden', 'terrace', 'rooftop', 'open_kitchen'
);

create table public.listings (
  id                    uuid primary key default uuid_generate_v4(),
  host_id               uuid not null references public.profiles(id) on delete cascade,
  listing_type          public.listing_type not null,
  title                 text not null,
  description           text not null,
  photos                text[] not null default '{}',
  cuisine_tags          text[] not null default '{}',
  dietary_tags          text[] not null default '{}',
  allergen_flags        text[] not null default '{}',
  price_per_unit        numeric(10, 2) not null check (price_per_unit >= 0),
  booking_fee_rate      numeric(4, 3) not null default 0.12,
  location_lat          numeric(9, 6) not null,
  location_lng          numeric(9, 6) not null,
  location_display      text not null,
  exact_address         text,
  status                public.listing_status not null default 'active',
  created_at            timestamptz not null default now(),

  -- TABLE-only fields (null for market listings)
  meal_time             timestamptz,
  seats_total           int,
  seats_available       int,
  dining_setting        public.dining_setting,

  -- MARKET-only fields (null for table listings)
  product_type_tags     text[] not null default '{}',
  quantity_total        int,
  quantity_available    int,
  pickup_window_start   timestamptz,
  pickup_window_end     timestamptz,
  allows_local_delivery boolean not null default false,

  constraint listings_table_fields check (
    listing_type <> 'table' or (meal_time is not null and seats_total is not null)
  ),
  constraint listings_market_fields check (
    listing_type <> 'market' or (
      quantity_total is not null
      and pickup_window_start is not null
      and pickup_window_end is not null
    )
  )
);

create index listings_status_type_idx on public.listings (status, listing_type);
create index listings_host_idx on public.listings (host_id);
create index listings_geo_idx on public.listings (location_lat, location_lng);

-- =========================================================================
-- orders (bookings for Table + Market)
-- =========================================================================
create type public.order_status as enum (
  'confirmed',
  'completed',
  'cancelled_by_guest',
  'cancelled_by_host',
  'no_show_guest',
  'no_show_host'
);

create table public.orders (
  id                    uuid primary key default uuid_generate_v4(),
  listing_id            uuid not null references public.listings(id) on delete cascade,
  listing_type          public.listing_type not null,
  guest_id              uuid not null references public.profiles(id) on delete cascade,
  quantity              int not null check (quantity > 0),
  deposit_paid          numeric(10, 2) not null,
  balance_due           numeric(10, 2) not null,
  payment_intent_id     text,
  status                public.order_status not null default 'confirmed',
  host_confirmed        boolean not null default false,
  guest_confirmed       boolean not null default false,
  created_at            timestamptz not null default now()
);

create index orders_guest_idx on public.orders (guest_id, status);
create index orders_listing_idx on public.orders (listing_id);

-- =========================================================================
-- reviews
-- =========================================================================
create type public.review_role as enum ('guest_reviewing_host', 'host_reviewing_guest');

create table public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  reviewer_id   uuid not null references public.profiles(id) on delete cascade,
  reviewee_id   uuid not null references public.profiles(id) on delete cascade,
  role          public.review_role not null,
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (order_id, reviewer_id)
);

create index reviews_reviewee_idx on public.reviews (reviewee_id);

-- =========================================================================
-- messages
-- =========================================================================
create table public.messages (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  content       text not null check (length(content) > 0),
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index messages_order_idx on public.messages (order_id, created_at);

-- =========================================================================
-- notifications
-- =========================================================================
create type public.notification_type as enum (
  'booking_confirmed',
  'booking_received',
  'order_cancelled',
  'reminder',
  'message',
  'review_request',
  'no_show',
  'system'
);

create table public.notifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          public.notification_type not null,
  title         text not null,
  body          text,
  read          boolean not null default false,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- =========================================================================
-- reports
-- =========================================================================
create table public.reports (
  id                  uuid primary key default uuid_generate_v4(),
  reporter_id         uuid not null references public.profiles(id) on delete cascade,
  reported_user_id    uuid not null references public.profiles(id) on delete cascade,
  order_id            uuid references public.orders(id) on delete set null,
  reason              text not null,
  created_at          timestamptz not null default now()
);

-- =========================================================================
-- Updated rating triggers — keep profiles.host_rating / guest_rating fresh.
-- =========================================================================
create or replace function public.refresh_user_ratings(uid uuid)
returns void
language plpgsql
as $$
begin
  update public.profiles set
    host_rating = (
      select avg(rating)::numeric(3, 2)
      from public.reviews
      where reviewee_id = uid and role = 'guest_reviewing_host'
    ),
    guest_rating = (
      select avg(rating)::numeric(3, 2)
      from public.reviews
      where reviewee_id = uid and role = 'host_reviewing_guest'
    )
  where id = uid;
end;
$$;

create or replace function public.on_review_change()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_user_ratings(coalesce(new.reviewee_id, old.reviewee_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_aggregate on public.reviews;
create trigger reviews_aggregate
  after insert or update or delete on public.reviews
  for each row execute procedure public.on_review_change();
