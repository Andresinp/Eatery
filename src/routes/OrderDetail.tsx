import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import CancelOrderDialog from "../components/CancelOrderDialog";
import { useOrders } from "../store/orders";
import { useLanguage } from "../i18n";
import { formatWhen } from "../lib/datetime";
import type { CancellationReason } from "../lib/cancellation";

export default function OrderDetail() {
  const { id = "" } = useParams();
  const order = useOrders((s) => s.getById(id));
  const updateOrder = useOrders((s) => s.updateOrder);
  const { code: lang } = useLanguage();

  const [confirming, setConfirming] = useState(false);
  const [review, setReview] = useState<{ rating: number; comment: string } | null>(null);
  const [cancelReason, setCancelReason] = useState<CancellationReason | null>(null);

  if (!order) {
    return (
      <div className="min-h-full">
        <TopBar back title="Order" />
        <div className="p-6 text-ink/70">
          We couldn't find that order.{" "}
          <Link className="underline" to="/orders">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const isTable = order.listing_type === "table";
  const snap = order.listing_snapshot;
  const when = formatWhen(snap.when, lang);
  const showConfirmPrompt = order.status === "confirmed" && !order.guest_confirmed;

  const onAttended = (attended: boolean) => {
    if (attended) {
      updateOrder(order.id, { guest_confirmed: true });
      setConfirming(true);
    } else {
      updateOrder(order.id, { guest_confirmed: true });
      setCancelReason("no_show_host");
    }
  };

  const submitReview = () => {
    if (!review) return;
    updateOrder(order.id, { status: "completed" });
    setConfirming(false);
  };

  return (
    <div className="min-h-full bg-cream-50 pb-20">
      <TopBar back title="Order detail" />

      <div className="max-w-[640px] mx-auto px-4 py-4 space-y-5">
        <div className="rounded-3xl overflow-hidden border-2 border-ink/90 bg-white">
          <img src={snap.photo} alt={snap.title} className="w-full h-48 object-cover" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
                {isTable ? "🍽 Table" : "🛍 Market"}
              </span>
              <span className="text-xs text-ink/60">{snap.location_display}</span>
            </div>
            <h1 className="font-display font-extrabold text-2xl leading-tight">{snap.title}</h1>
            <div className="flex items-center gap-3 mt-3">
              <img
                src={snap.host_avatar}
                alt={snap.host_name}
                className="w-9 h-9 rounded-full object-cover border border-ink/20"
              />
              <div className="text-sm">
                <div className="font-semibold">{snap.host_name}</div>
                <div className="text-xs text-ink/60">{when}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-ink/90 bg-white p-4">
          <div className="text-xs uppercase tracking-wider text-ink/60 mb-1">Exact address</div>
          <div className="font-display font-bold text-lg">{order.exact_address}</div>
          <div className="text-xs text-ink/60 mt-1">{when}</div>
        </div>

        <div className="rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-1.5 text-sm">
          <Row label="Quantity" value={`${order.quantity} × ${snap.currency}${order.price_per_unit}`} />
          <Row label="Deposit paid" value={`${snap.currency}${order.deposit_paid.toFixed(2)}`} />
          <Row
            label={`Balance to ${snap.host_name} on ${isTable ? "arrival" : "pickup"}`}
            value={`${snap.currency}${order.balance_due.toFixed(2)}`}
            bold
          />
        </div>

        <div className="flex gap-3">
          <Link
            to={`/chat/${order.id}`}
            className="flex-1 py-3 rounded-2xl border-2 border-ink font-semibold text-center"
          >
            Message host
          </Link>
          <button
            onClick={() => setCancelReason("by_guest")}
            disabled={order.status !== "confirmed"}
            className="flex-1 py-3 rounded-2xl border-2 border-ink font-semibold disabled:opacity-40"
          >
            Cancel
          </button>
        </div>

        {showConfirmPrompt && !confirming && (
          <div className="rounded-2xl border-2 border-ink/90 bg-amber/15 p-4 space-y-3">
            <div className="font-display font-extrabold text-lg">
              {isTable ? `Did you attend the meal with ${snap.host_name}?` : `Did you pick up your order from ${snap.host_name}?`}
            </div>
            <p className="text-sm text-ink/70">
              Confirm so {snap.host_name} can review you, and you can review them.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => onAttended(false)}
                className="flex-1 py-2.5 rounded-2xl border-2 border-ink font-semibold"
              >
                No
              </button>
              <button
                onClick={() => onAttended(true)}
                className="flex-1 py-2.5 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold"
              >
                Yes, I {isTable ? "attended" : "picked up"}
              </button>
            </div>
          </div>
        )}

        {confirming && (
          <div className="rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-3">
            <div className="font-display font-extrabold text-lg">Review {snap.host_name}</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setReview({ rating: n, comment: review?.comment ?? "" })}
                  aria-label={`${n} stars`}
                  className={
                    "w-10 h-10 rounded-full grid place-items-center text-xl border-2 transition " +
                    ((review?.rating ?? 0) >= n
                      ? "bg-amber text-amber-ink border-amber-deep"
                      : "bg-cream-50 text-ink/40 border-ink/20")
                  }
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="What was it like?"
              value={review?.comment ?? ""}
              onChange={(e) =>
                setReview({ rating: review?.rating ?? 0, comment: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink resize-none"
            />
            <button
              onClick={submitReview}
              disabled={!review?.rating}
              className="w-full py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
            >
              Submit review
            </button>
          </div>
        )}
      </div>

      {cancelReason && (
        <CancelOrderDialog
          orderId={order.id}
          reason={cancelReason}
          eventStartIso={order.listing_snapshot.starts_at ?? iso(order.listing_snapshot.when)}
          depositAmount={order.deposit_paid}
          currency={order.listing_snapshot.currency}
          onClose={() => setCancelReason(null)}
          onDone={() => setCancelReason(null)}
        />
      )}
    </div>
  );
}

// Best-effort parser: the listing snapshot stores friendly date strings
// like "Sat, 20:30" — we treat unparseable values as "now" so the policy
// falls into the late-cancel bucket. Real bookings have ISO meal_time.
function iso(raw: string): string {
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/70">{label}</span>
      <span className={bold ? "font-display font-extrabold text-lg" : "font-medium"}>{value}</span>
    </div>
  );
}
