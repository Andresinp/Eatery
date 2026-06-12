import { useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { findListing } from "../lib/listings";
import { depositFor, useOrders, MOCK_EXACT_ADDRESSES } from "../store/orders";
import { useNotifications } from "../store/notifications";
import type { MarketListing, TableListing } from "../types";

export default function Checkout() {
  const { id = "" } = useParams();
  const [search] = useSearchParams();
  const addOrder = useOrders((s) => s.addOrder);
  const pushNotif = useNotifications((s) => s.push);

  const listing = useMemo(() => findListing(id), [id]);
  const qty = Math.max(1, parseInt(search.get("qty") || "1", 10));

  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (!listing) {
    return (
      <div className="min-h-full">
        <TopBar back title="Checkout" />
        <div className="p-6 text-ink/70">Listing not found.</div>
      </div>
    );
  }

  const isTable = listing.listing_type === "table";
  const { total, deposit, balance } = depositFor(listing.price_per_unit, qty);
  const when = isTable
    ? (listing as TableListing).meal_time
    : `${(listing as MarketListing).pickup_window_start}–${(listing as MarketListing).pickup_window_end}`;

  const canPay =
    card.number.replace(/\s/g, "").length >= 12 &&
    card.exp.length >= 4 &&
    card.cvc.length >= 3 &&
    !processing;

  const submit = () => {
    setProcessing(true);
    setTimeout(() => {
      const orderId = `o_${Math.random().toString(36).slice(2, 10)}`;
      addOrder({
        id: orderId,
        listing_id: listing.id,
        listing_type: listing.listing_type,
        listing_snapshot: {
          title: listing.title,
          photo: listing.photo,
          host_name: listing.host_name,
          host_avatar: listing.host_avatar,
          currency: listing.currency,
          location_display: listing.location_display,
          when,
        },
        exact_address: MOCK_EXACT_ADDRESSES[listing.id] ?? listing.location_display,
        quantity: qty,
        price_per_unit: listing.price_per_unit,
        deposit_paid: deposit,
        balance_due: balance,
        status: "confirmed",
        host_confirmed: false,
        guest_confirmed: false,
        created_at: new Date().toISOString(),
      });
      pushNotif({
        type: "booking_confirmed",
        title: isTable ? "Your seat is confirmed" : "Your order is confirmed",
        body: `${listing!.title} with ${listing!.host_name} · ${when}`,
        data: { order_id: orderId, listing_id: listing!.id },
      });
      setDone(orderId);
      setProcessing(false);
    }, 900);
  };

  if (done) {
    return (
      <div className="min-h-full bg-cream-50">
        <TopBar back title="Confirmed" />
        <div className="max-w-[560px] mx-auto px-4 py-10 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-leaf/20 border-2 border-leaf grid place-items-center text-3xl">
            ✓
          </div>
          <h1 className="font-display font-extrabold text-3xl">
            You're in. {listing.host_name} has been notified.
          </h1>
          <p className="text-ink/70">
            Your {isTable ? "seat" : "order"} for{" "}
            <span className="font-semibold">{listing.title}</span> is confirmed.
          </p>
          <div className="rounded-2xl border-2 border-ink/90 bg-white p-4 text-left space-y-2">
            <div className="text-xs uppercase tracking-wider text-ink/60">Address</div>
            <div className="font-display font-bold text-lg">
              {MOCK_EXACT_ADDRESSES[listing.id]}
            </div>
            <div className="text-xs text-ink/60">{when}</div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-ink/70">Deposit charged</span>
              <span className="font-semibold">
                {listing.currency}
                {deposit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-ink/70">
                Balance to {listing.host_name} on {isTable ? "arrival" : "pickup"}
              </span>
              <span className="font-semibold">
                {listing.currency}
                {balance.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className="flex-1 py-3 rounded-2xl border-2 border-ink font-semibold text-center"
            >
              Back to map
            </Link>
            <Link
              to={`/orders/${done}`}
              className="flex-1 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold text-center"
            >
              View order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-cream-50 pb-32">
      <TopBar back title="Checkout" />

      <div className="max-w-[560px] mx-auto px-4 py-5 space-y-5">
        <div className="flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90">
          <img
            src={listing.photo}
            alt={listing.title}
            className="w-20 h-20 rounded-xl object-cover flex-none"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink/60">
              {isTable ? "🍽 Table with" : "🛍 Market from"} {listing.host_name}
            </div>
            <div className="font-display font-bold text-lg leading-tight truncate">
              {listing.title}
            </div>
            <div className="text-xs text-ink/60">
              {qty} × {listing.currency}
              {listing.price_per_unit} · {when}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-3">
          <div className="font-display font-bold text-lg">Payment</div>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-ink/60 mb-1">Card number</div>
            <input
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              value={card.number}
              onChange={(e) =>
                setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "") })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs uppercase tracking-wider text-ink/60 mb-1">Expiry</div>
              <input
                placeholder="MM/YY"
                value={card.exp}
                onChange={(e) => setCard({ ...card, exp: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <div className="text-xs uppercase tracking-wider text-ink/60 mb-1">CVC</div>
              <input
                placeholder="123"
                value={card.cvc}
                onChange={(e) =>
                  setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })
                }
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink"
              />
            </label>
          </div>
          <div className="text-xs text-ink/60">
            Stripe will be wired here. Today, this is a mock for the UI flow.
          </div>
        </div>

        <div className="rounded-2xl border-2 border-ink/90 bg-amber/15 p-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink/80">Order total</span>
            <span className="font-semibold">
              {listing.currency}
              {total.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-display font-bold">You pay now (deposit)</span>
            <span className="font-display font-extrabold text-xl">
              {listing.currency}
              {deposit.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-ink/70">
            <span>You pay {listing.host_name} on {isTable ? "arrival" : "pickup"}</span>
            <span>
              {listing.currency}
              {balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-30 p-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pt-8">
        <div className="max-w-[560px] mx-auto">
          <button
            disabled={!canPay}
            onClick={submit}
            className="w-full py-3.5 rounded-2xl font-semibold text-base border-2 border-ink bg-ink text-cream-50 disabled:opacity-40"
          >
            {processing
              ? "Processing…"
              : `Pay ${listing.currency}${deposit.toFixed(2)} deposit`}
          </button>
        </div>
      </div>
    </div>
  );
}
