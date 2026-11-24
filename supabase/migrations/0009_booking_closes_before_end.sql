-- Booking closes half an hour before the meal or pickup window ends (it used to stay open until
-- the very end, which for a meal with no end time meant three hours after it started). Never
-- before the start: a pickup window shorter than half an hour stays bookable until it opens.
-- The app mirrors this in bookingClosesAt (mobile/src/lib/explore-filter-logic.ts).
-- Additive: one new function, and quote_booking redefined with the same signature and columns.

create or replace function private.booking_closes_at(l public.listings)
returns timestamptz language sql immutable as $$
  select greatest(private.event_start(l),
                  coalesce(private.event_end(l), private.event_start(l)) - interval '30 minutes');
$$;

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
    when private.booking_closes_at(l) <= now() then 'past'
    when avail < p_quantity then 'sold_out'
    else null end;
  bookable := reason is null;
  return next;
end;
$$;
grant execute on function public.quote_booking(uuid, int) to anon, authenticated;
