-- Eatery — database tests for 0006. Run with supabase/tests/db-test.sh.
-- Users: 1 host, 2 guest, 3 another guest, 4 a blocked person. Every rule the native app relies
-- on is asserted here: bookings only by the server, availability, privacy, reviews, chat, blocks,
-- notifications and reminders.

\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema test;

create function test.id(i int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid
$$;

-- Act as user i through RLS, exactly as PostgREST would.
create function test.as_user(i int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', test.id(i), 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;

create function test.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
end $$;

create function test.eq(label text, got anyelement, want anyelement) returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got %, want %', label, got, want;
  end if;
  raise notice 'ok  %', label;
end $$;

-- The statement must fail with an error whose message contains `want`.
create function test.raises(label text, stmt text, want text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(want in sqlerrm) > 0 then
      raise notice 'ok  %', label;
      return;
    end if;
    raise exception 'FAIL %: raised "%", want "%"', label, sqlerrm, want;
  end;
  raise exception 'FAIL %: did not raise (want "%")', label, want;
end $$;

-- Order id by payment intent, read past RLS so a test can name an order it cannot see.
create function test.order_id(pi text) returns uuid language sql security definer as $$
  select id from public.orders where payment_intent_id = pi
$$;

grant usage on schema test to anon, authenticated, service_role;
grant execute on all functions in schema test to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Fixtures (as the superuser)
-- ---------------------------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  (test.id(1), 'host@example.com', '{"full_name": "Hana Host"}'),
  (test.id(2), 'guest@example.com', '{"name": "Gil Guest", "picture": "https://x.test/a.jpg"}'),
  (test.id(3), 'other@example.com', null),
  (test.id(4), 'blocked@example.com', null);

select test.eq('new user trigger reads full_name', (select full_name from public.profiles where id = test.id(1)), 'Hana Host');
select test.eq('new user trigger reads Google name/picture', (select full_name || '|' || avatar_url from public.profiles where id = test.id(2)), 'Gil Guest|https://x.test/a.jpg');

update public.profiles set dietary_prefs = '{vegan}', allergen_exclusions = '{nuts}' where id = test.id(2);

insert into public.listings (id, host_id, listing_type, title, description, price_per_unit,
  location_lat, location_lng, location_display, exact_address, meal_time, seats_total, seats_available, currency)
values
  (test.id(101), test.id(1), 'table', 'Sunday lunch', 'Slow-cooked', 30, 41.03, 28.97, 'Cihangir', 'Secret St 1, flat 4',
   now() + interval '3 days', 4, 4, '₺'),
  (test.id(102), test.id(1), 'table', 'Free soup', 'Soup', 0, 41.03, 28.97, 'Cihangir', 'Secret St 1',
   now() + interval '2 days', 2, 2, '€'),
  (test.id(103), test.id(1), 'table', 'Last night''s dinner', 'Done', 20, 41.03, 28.97, 'Cihangir', 'Secret St 1',
   now() - interval '5 hours', 4, 4, '€');
insert into public.listings (id, host_id, listing_type, title, description, price_per_unit,
  location_lat, location_lng, location_display, quantity_total, quantity_available,
  pickup_window_start, pickup_window_end, currency)
values
  (test.id(104), test.id(1), 'market', 'Sourdough', 'Bread', 8, 41.03, 28.97, 'Cihangir', 3, 3,
   now() + interval '20 hours', now() + interval '22 hours', '€');

-- ---------------------------------------------------------------------------------------------
-- Privacy
-- ---------------------------------------------------------------------------------------------

select test.as_anon();
select test.eq('anon can browse listings', (select count(*) from public.listings where host_id = test.id(1)), 4::bigint);
select test.raises('anon cannot read exact_address', 'select exact_address from public.listings', 'permission denied');
select test.eq('anon can read dining photos', (select count(*) >= 0 from (select dining_setting_photos from public.listings) d), true);
select test.raises('anon cannot read emails', 'select email from public.profiles', 'permission denied');
select test.eq('anon can read public profile', (select full_name from public.profiles where id = test.id(1)), 'Hana Host');
reset role;

select test.eq('public map position is snapped, not the pin',
  (select location_lat::text || ',' || location_lng::text from public.listings where id = test.id(101)), '41.032000,28.972000');
select test.as_anon();
select test.raises('nobody can read the exact pin', 'select exact_lat from public.listings', 'permission denied');
reset role;

select test.as_user(3);
select test.raises('other user cannot read allergies', 'select allergen_exclusions from public.profiles', 'permission denied');
select test.eq('my_profile returns my own private fields',
  (select email from public.my_profile()), 'other@example.com');
select test.eq('no address without a booking', public.listing_address(test.id(101)), null::text);
reset role;

select test.as_user(1);
select test.eq('host reads own address', public.listing_address(test.id(101)), 'Secret St 1, flat 4');
select test.raises('host cannot set the booking fee',
  $$update public.listings set booking_fee_rate = 0 where id = '00000000-0000-4000-8000-000000000101'$$, 'permission denied');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Bookings are created by the server only
-- ---------------------------------------------------------------------------------------------

select test.as_user(2);
select test.raises('guest cannot insert an order directly',
  $$insert into public.orders (listing_id, listing_type, guest_id, quantity, deposit_paid, balance_due)
    values ('00000000-0000-4000-8000-000000000101', 'table', '00000000-0000-4000-8000-000000000002', 1, 0, 0)$$,
  'permission denied');
select test.raises('guest cannot call the server order function',
  $$select public.server_create_order('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000002', 1, 0, 'pi_x')$$,
  'permission denied');

select test.eq('quote in the listing currency',
  (select total || '|' || deposit || '|' || balance || '|' || currency_iso || '|' || bookable
   from public.quote_booking(test.id(101), 2)), '60.00|7.20|52.80|TRY|true');
select test.eq('quote refuses more than available', (select reason from public.quote_booking(test.id(101), 5)), 'sold_out');
select test.eq('quote refuses a past meal', (select reason from public.quote_booking(test.id(103), 1)), 'past');
-- 0009: booking closes half an hour before the end. 103 has no end time, so it ends 3h after start.
reset role;
update public.listings set meal_time = now() - interval '2 hours 40 minutes' where id = test.id(103);
select test.as_user(2);
select test.eq('quote refuses a meal ending within half an hour', (select reason from public.quote_booking(test.id(103), 1)), 'past');
reset role;
update public.listings set meal_time = now() - interval '2 hours' where id = test.id(103);
select test.as_user(2);
select test.eq('quote books a meal under way that ends in an hour', (select bookable from public.quote_booking(test.id(103), 1)), true);
reset role;
select test.eq('pickup closes half an hour before the window ends',
  (select private.booking_closes_at(l) = l.pickup_window_end - interval '30 minutes' from public.listings l where id = test.id(104)), true);
update public.listings set pickup_window_end = pickup_window_start + interval '10 minutes' where id = test.id(104);
select test.eq('a window shorter than half an hour stays bookable until it opens',
  (select private.booking_closes_at(l) = l.pickup_window_start from public.listings l where id = test.id(104)), true);
update public.listings set pickup_window_end = pickup_window_start + interval '2 hours' where id = test.id(104);
update public.listings set meal_time = now() - interval '5 hours' where id = test.id(103);
select test.as_user(2);
select test.raises('a paid listing cannot be booked free',
  $$select public.book_free_listing('00000000-0000-4000-8000-000000000101', 1)$$, 'payment_required');

select test.eq('free listing books without payment', public.book_free_listing(test.id(102), 2) is not null, true);
select test.eq('free listing is now full', (select status::text || seats_available from public.listings where id = test.id(102)), 'full0');
select test.raises('full listing refuses another booking',
  $$select public.book_free_listing('00000000-0000-4000-8000-000000000102', 1)$$, 'not_active');
reset role;

select test.as_user(1);
select test.eq('host cannot book own listing', (select reason from public.quote_booking(test.id(101), 1)), 'own_listing');
reset role;

-- The payment webhook, as service role.
set role service_role;
select test.eq('webhook creates the order',
  public.server_create_order(test.id(101), test.id(2), 3, 7.20, 'pi_1') is not null, true);
select test.eq('webhook retry is idempotent',
  public.server_create_order(test.id(101), test.id(2), 3, 7.20, 'pi_1') = (select id from public.orders where payment_intent_id = 'pi_1'), true);
select test.eq('seats taken exactly once', (select seats_available from public.listings where id = test.id(101)), 1);
select test.eq('order records currency and balance',
  (select currency || '|' || balance_due from public.orders where payment_intent_id = 'pi_1'), '₺|82.80');
select test.raises('overbooking refused', $$select public.server_create_order('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000003', 2, 1, 'pi_2')$$, 'sold_out');
reset role;

select test.eq('booking notified guest and host',
  (select count(*) from public.notifications where data ->> 'order_id' = (select id::text from public.orders where payment_intent_id = 'pi_1')), 2::bigint);

-- ---------------------------------------------------------------------------------------------
-- Address after booking, orders visibility, no client updates
-- ---------------------------------------------------------------------------------------------

select test.as_user(2);
select test.eq('booked guest gets the address', public.listing_address(test.id(101)), 'Secret St 1, flat 4');
select test.raises('guest cannot change an order',
  $$update public.orders set deposit_paid = 0 where payment_intent_id = 'pi_1'$$, 'permission denied');
reset role;

select test.as_user(3);
select test.eq('a stranger sees no orders', (select count(*) from public.orders), 0::bigint);
reset role;

select test.as_user(1);
select test.eq('host sees orders on own listings', (select count(*) from public.orders where listing_id = test.id(101)), 1::bigint);
select test.raises('host cannot cancel a listing with bookings directly',
  $$update public.listings set status = 'cancelled' where id = '00000000-0000-4000-8000-000000000101'$$, 'has_bookings');
select test.raises('host cannot delete a listing', $$delete from public.listings where id = '00000000-0000-4000-8000-000000000103'$$, 'permission denied');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Cancellation gives the seats back (status is changed by the cancel-order function, as postgres)
-- ---------------------------------------------------------------------------------------------

update public.orders set status = 'cancelled_by_guest' where payment_intent_id = 'pi_1';
select test.eq('cancel returns seats', (select seats_available from public.listings where id = test.id(101)), 4);
select test.eq('cancel stamps cancelled_at', (select cancelled_at is not null from public.orders where payment_intent_id = 'pi_1'), true);
select test.eq('host told about the cancellation',
  (select count(*) from public.notifications where user_id = test.id(1) and type = 'order_cancelled'), 1::bigint);

-- ---------------------------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------------------------

set role service_role;
select public.server_create_order(test.id(101), test.id(2), 1, 3.60, 'pi_3');
reset role;

select test.as_user(2);
insert into public.messages (order_id, sender_id, content)
  select id, test.id(2), 'Is there parking?' from public.orders where payment_intent_id = 'pi_3';
select test.raises('cannot send as someone else',
  $$insert into public.messages (order_id, sender_id, content)
    select id, '00000000-0000-4000-8000-000000000001', 'fake' from public.orders where payment_intent_id = 'pi_3'$$,
  'row-level security');
select test.raises('cannot edit a sent message',
  $$update public.messages set content = 'edited'$$, 'permission denied');
reset role;

select test.eq('message notified the host',
  (select count(*) from public.notifications where user_id = test.id(1) and type = 'message'), 1::bigint);

select test.as_user(3);
select test.eq('stranger cannot read the chat', (select count(*) from public.messages), 0::bigint);
select test.raises('stranger cannot write into the chat',
  $$insert into public.messages (order_id, sender_id, content)
    values (test.order_id('pi_3'), '00000000-0000-4000-8000-000000000003', 'hi')$$,
  'row-level security');
reset role;

select test.as_user(1);
select public.mark_messages_read((select id from public.orders where payment_intent_id = 'pi_3'));
select test.eq('host marked guest message read', (select bool_and(read) from public.messages), true);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Reviews and ratings
-- ---------------------------------------------------------------------------------------------

-- A past meal cannot be booked, so book it while upcoming and then move it into the past.
update public.listings set meal_time = now() + interval '1 hour' where id = test.id(103);
set role service_role;
select public.server_create_order(test.id(103), test.id(2), 1, 2.40, 'pi_past');
reset role;
update public.listings set meal_time = now() - interval '5 hours' where id = test.id(103);

select test.as_user(2);
select test.raises('cannot review before the meal',
  $$select public.submit_review((select id from public.orders where payment_intent_id = 'pi_3'), 5, 'x')$$, 'too_early');
select test.raises('rating out of range',
  $$select public.submit_review((select id from public.orders where payment_intent_id = 'pi_past'), 6, 'x')$$, 'bad_rating');
select public.submit_review((select id from public.orders where payment_intent_id = 'pi_past'), 4, 'Lovely');
select test.raises('cannot insert a review directly',
  $$insert into public.reviews (order_id, reviewer_id, reviewee_id, role, rating)
    values ((select id from public.orders where payment_intent_id = 'pi_past'), '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'guest_reviewing_host', 5)$$,
  'permission denied');
reset role;
select test.eq('host rating updated through the trigger', (select host_rating from public.profiles where id = test.id(1)), 4.00::numeric(3,2));

select test.as_user(3);
select test.raises('stranger cannot review', $$select public.submit_review(test.order_id('pi_past'), 5, 'x')$$, 'not_found');
reset role;

select test.as_user(2);
select test.eq('guest marks done', public.mark_order_done((select id from public.orders where payment_intent_id = 'pi_past'))::text, 'confirmed');
reset role;
select test.as_user(1);
select test.eq('both done → completed', public.mark_order_done((select id from public.orders where payment_intent_id = 'pi_past'))::text, 'completed');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Blocks
-- ---------------------------------------------------------------------------------------------

select test.as_user(4);
insert into public.blocks (blocker_id, blocked_id) values (test.id(4), test.id(1));
select test.eq('blocked host''s listings disappear', (select count(*) from public.listings where host_id = test.id(1)), 0::bigint);
select test.eq('blocked host cannot be booked', (select reason from public.quote_booking(test.id(101), 1)), 'not_found');
reset role;
select test.as_user(1);
select test.eq('blocks are private to the blocker', (select count(*) from public.blocks), 0::bigint);
reset role;

select test.as_user(2);
insert into public.reports (reporter_id, listing_id, reason, details) values (test.id(2), test.id(101), 'unsafe', 'test');
select test.raises('cannot file a report as someone else',
  $$insert into public.reports (reporter_id, reason) values ('00000000-0000-4000-8000-000000000003', 'x')$$, 'row-level security');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Notifications: own only, only `read` is writable; push tokens
-- ---------------------------------------------------------------------------------------------

select test.as_user(2);
select test.eq('sees only own notifications', (select bool_and(user_id = test.id(2)) from public.notifications), true);
update public.notifications set read = true;
select test.raises('cannot rewrite a notification', $$update public.notifications set title = 'x'$$, 'permission denied');
select test.raises('cannot create notifications', $$insert into public.notifications (user_id, type, title) values ('00000000-0000-4000-8000-000000000001', 'system', 'spam')$$, 'permission denied');
select public.register_push_token('ExponentPushToken[abc]', 'ios');
reset role;
select test.as_user(3);
select public.register_push_token('ExponentPushToken[abc]', 'ios');
select test.eq('token moves to whoever signed in last', (select count(*) from public.push_tokens), 1::bigint);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Reminders and review requests (cron job)
-- ---------------------------------------------------------------------------------------------

set role service_role;
select public.server_create_order(test.id(104), test.id(2), 1, 0.96, 'pi_bread');
reset role;
select private.run_scheduled_notifications();
select private.run_scheduled_notifications();
select test.eq('one reminder for a pickup within 24h, not two',
  (select count(*) from public.notifications where type = 'reminder' and data ->> 'order_id' = (select id::text from public.orders where payment_intent_id = 'pi_bread')), 1::bigint);
select test.eq('review requested once from both sides after the meal',
  (select count(*) from public.notifications where type = 'review_request'), 2::bigint);
select test.eq('market quantity decremented', (select quantity_available from public.listings where id = test.id(104)), 2);

-- ---------------------------------------------------------------------------------------------
-- Account deletion cascades
-- ---------------------------------------------------------------------------------------------

set role service_role;
select test.eq('refund list covers upcoming bookings as host',
  (select count(*) from public.server_orders_to_refund(test.id(1))), 3::bigint);
reset role;
delete from auth.users where id = test.id(1);
select test.eq('deleting the host removes their listings', (select count(*) from public.listings), 0::bigint);
select test.eq('and their profile', (select count(*) from public.profiles where id = test.id(1)), 0::bigint);
