import { useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import { useHost } from "../store/hostListings";
import { useOrders } from "../store/orders";

export default function HostEarnings() {
  const myListings = useHost((s) => s.myListings);
  const orders = useOrders((s) => s.orders);
  const [tab, setTab] = useState<"all" | "table" | "market">("all");

  const totals = useMemo(() => {
    const myIds = new Set(myListings.map((l) => l.id));
    const filteredOrders = orders.filter((o) => {
      if (!myIds.has(o.listing_id)) return false;
      if (tab !== "all" && o.listing_type !== tab) return false;
      return o.status === "confirmed" || o.status === "completed";
    });
    const balance = filteredOrders.reduce((s, o) => s + o.balance_due, 0);
    const deposit = filteredOrders.reduce((s, o) => s + o.deposit_paid, 0);
    const units = filteredOrders.reduce((s, o) => s + o.quantity, 0);
    return { balance, deposit, units, count: filteredOrders.length };
  }, [myListings, orders, tab]);

  return (
    <div className="min-h-full bg-cream-50 pb-10">
      <TopBar back title="Earnings" />

      <div className="max-w-[680px] mx-auto px-4 pt-2 space-y-5">
        <div className="flex items-center gap-1 p-1 rounded-full bg-white border-2 border-ink w-fit mx-auto shadow-float">
          {(["all", "table", "market"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-4 py-1.5 rounded-full text-sm font-semibold transition " +
                (tab === t ? "bg-ink text-cream-50" : "text-ink/70 hover:text-ink")
              }
            >
              {t === "all" ? "All" : t === "table" ? "🍽 Tables" : "🛍 Market"}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border-2 border-ink/90 bg-amber p-5 sm:p-6">
          <div className="text-xs uppercase tracking-wider text-amber-ink/70">
            In-person revenue (so far)
          </div>
          <div className="font-display font-extrabold text-5xl text-amber-ink leading-none mt-1">
            €{totals.balance.toFixed(0)}
          </div>
          <div className="text-sm text-amber-ink/80 mt-2">
            From {totals.count} order{totals.count === 1 ? "" : "s"} · {totals.units} seat/unit total
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-ink/90 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink/60">
              App collected (deposits)
            </div>
            <div className="font-display font-extrabold text-2xl mt-1">
              €{totals.deposit.toFixed(2)}
            </div>
            <div className="text-xs text-ink/60 mt-1">12% booking deposit</div>
          </div>
          <div className="rounded-2xl border-2 border-ink/90 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink/60">
              Active listings
            </div>
            <div className="font-display font-extrabold text-2xl mt-1">
              {myListings.length}
            </div>
            <div className="text-xs text-ink/60 mt-1">In your kitchen</div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-ink/90 bg-white p-4 text-sm text-ink/70">
          <div className="font-display font-bold text-ink text-base mb-1">
            How earnings work
          </div>
          Guests pay a small deposit to Eatery when they book — that's our commission.
          The full balance is paid to you in person on the day, in cash, Bizum,
          Revolut, or however you agree. The total above is what guests will hand to
          you across all your confirmed orders.
        </div>
      </div>
    </div>
  );
}
