import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { Chip } from "../components/Chip";
import { useHost } from "../store/hostListings";
import { useOrders, type Order } from "../store/orders";
import { cancelListing, fetchListing } from "../lib/db";
import { cancelOrder as remoteCancel, isStripeConfigured } from "../lib/stripe";
import type { Listing, MarketListing, TableListing } from "../types";

export default function HostManageListing() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const localListing = useHost((s) => s.getById(id));
  const remove = useHost((s) => s.remove);
  const orders = useOrders((s) => s.orders);
  const updateOrder = useOrders((s) => s.updateOrder);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dbListing, setDbListing] = useState<Listing | null>(null);
  const [dbLoading, setDbLoading] = useState(!localListing);

  useEffect(() => {
    if (localListing) { setDbLoading(false); return; }
    setDbLoading(true);
    fetchListing(id)
      .then(setDbListing)
      .catch(() => {})
      .finally(() => setDbLoading(false));
  }, [id, localListing]);

  const listing = localListing ?? dbListing;

  const myOrders = useMemo(
    () => orders.filter((o) => o.listing_id === id),
    [orders, id],
  );

  if (dbLoading) {
    return (
      <div className="min-h-full">
        <TopBar back title="Listing" />
        <div className="p-6 text-ink/70">Loading…</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-full">
        <TopBar back title="Listing" />
        <div className="p-6 text-ink/70">
          Listing not found.{" "}
          <Link className="underline" to="/host">
            Back to host
          </Link>
        </div>
      </div>
    );
  }

  const isTable = listing.listing_type === "table";
  const left = isTable
    ? (listing as TableListing).seats_available
    : (listing as MarketListing).quantity_available;
  const total = isTable
    ? (listing as TableListing).seats_total
    : (listing as MarketListing).quantity_total;

  return (
    <div className="min-h-full bg-cream-50 pb-10">
      <TopBar back title="Manage" />

      <div className="max-w-[760px] mx-auto px-4 pt-2 space-y-5">
        <div className="rounded-3xl overflow-hidden border-2 border-ink/90 bg-white">
          <img src={listing.photo} alt={listing.title} className="w-full h-44 object-cover" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
                {isTable ? "🍽 Table" : "🛍 Market"}
              </span>
              <Chip>
                {left} / {total} {isTable ? "seats" : "units"} left
              </Chip>
            </div>
            <h1 className="font-display font-extrabold text-2xl leading-tight">{listing.title}</h1>
            <p className="text-sm text-ink/70 mt-2">{listing.description}</p>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-display font-extrabold text-xl">
              Orders {myOrders.length > 0 && <span className="text-ink/50 text-base">· {myOrders.length}</span>}
            </h2>
          </div>
          {myOrders.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-ink/25 p-8 text-center text-ink/60">
              No orders yet — your listing is live. Share the link with friends to seed the first booking.
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((o) => (
                <HostOrderRow
                  key={o.id}
                  order={o}
                  onConfirm={async (attended) => {
                    if (attended) {
                      updateOrder(o.id, { host_confirmed: true, status: "completed" });
                      return;
                    }
                    if (isStripeConfigured) {
                      try {
                        await remoteCancel(o.id, "no_show_guest");
                      } catch {
                        // Surface failure but still reflect locally so the
                        // UI doesn't get stuck.
                      }
                    }
                    updateOrder(o.id, { host_confirmed: true, status: "no_show_guest" });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border-2 border-ink/90 bg-white p-4">
          <div className="font-display font-bold text-lg mb-2">Actions</div>
          <div className="flex gap-3">
            <button
              onClick={() => nav(`/host/listing/${id}/edit`)}
              className="flex-1 py-2.5 rounded-2xl border-2 border-ink font-semibold"
            >
              Edit
            </button>
            {confirmDelete ? (
              <button
                onClick={async () => {
                  remove(listing.id);
                  try {
                    await cancelListing(listing.id);
                  } catch {
                    // local state already updated; DB will sync on next fetch
                  }
                  window.location.href = "/host";
                }}
                className="flex-1 py-2.5 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
              >
                Confirm cancel
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 py-2.5 rounded-2xl border-2 border-ink font-semibold"
              >
                Cancel listing
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            to="/"
            className="flex-1 py-2.5 rounded-2xl border-2 border-ink font-semibold text-center text-sm"
          >
            🗺 View on map
          </Link>
          <Link
            to="/host"
            className="flex-1 py-2.5 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold text-center text-sm"
          >
            Host dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function HostOrderRow({
  order,
  onConfirm,
}: {
  order: Order;
  onConfirm: (attended: boolean) => void;
}) {
  const isTable = order.listing_type === "table";
  const showConfirm = order.status === "confirmed" && !order.host_confirmed;
  const statusLabel: Record<Order["status"], string> = {
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled_by_guest: "Cancelled by guest",
    cancelled_by_host: "Cancelled by you",
    no_show_guest: "Guest no-show",
    no_show_host: "Host no-show",
  };

  return (
    <div className="p-3 rounded-2xl bg-white border-2 border-ink/90">
      <div className="flex gap-3">
        <img
          src={order.listing_snapshot.host_avatar}
          alt={order.id}
          className="w-12 h-12 rounded-full object-cover border border-ink/20 flex-none"
        />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold leading-tight">Guest · {order.id.slice(2, 8)}</div>
          <div className="text-xs text-ink/60">
            {order.quantity} {isTable ? "seat(s)" : "unit(s)"} · {order.listing_snapshot.when}
          </div>
          <div className="text-xs text-ink/60">{statusLabel[order.status]}</div>
        </div>
        <div className="text-right flex-none">
          <div className="text-[11px] text-ink/60">Balance due</div>
          <div className="font-display font-extrabold text-lg">
            €{order.balance_due.toFixed(2)}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="mt-3 pt-3 border-t border-ink/10">
          <div className="text-sm font-semibold mb-2">
            Did this guest {isTable ? "show up" : "pick up"}?
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(false)}
              className="flex-1 py-2 rounded-xl border-2 border-ink font-semibold text-sm"
            >
              No-show
            </button>
            <button
              onClick={() => onConfirm(true)}
              className="flex-1 py-2 rounded-xl border-2 border-ink bg-amber text-amber-ink font-semibold text-sm"
            >
              Yes, {isTable ? "attended" : "picked up"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
