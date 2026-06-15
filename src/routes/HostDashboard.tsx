import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useHost, ME } from "../store/hostListings";
import { useOrders } from "../store/orders";
import { useT } from "../i18n";
import type { MarketListing, TableListing } from "../types";

export default function HostDashboard() {
  const myListings = useHost((s) => s.myListings);
  const orders = useOrders((s) => s.orders);
  const [tab, setTab] = useState<"table" | "market">("table");
  const t = useT();

  const stats = useMemo(() => {
    const myIds = new Set(myListings.map((l) => l.id));
    const myOrders = orders.filter((o) => myIds.has(o.listing_id));
    const upcoming = myOrders.filter((o) => o.status === "confirmed").length;
    const revenue = myOrders
      .filter((o) => o.status === "confirmed" || o.status === "completed")
      .reduce((sum, o) => sum + o.balance_due + o.deposit_paid, 0);
    return {
      active: myListings.length,
      upcoming,
      revenue,
    };
  }, [myListings, orders]);

  const filtered = myListings.filter((l) => l.listing_type === tab);

  return (
    <div className="min-h-full bg-cream-50 pb-10">
      <TopBar toggle="host" />

      <div className="max-w-[760px] mx-auto px-4 pt-2 space-y-5">
        <div className="rounded-3xl border-2 border-ink/90 bg-amber p-5 sm:p-6 shadow-float">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-ink/70">
                {t("host.welcomeBack")}
              </div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-amber-ink leading-tight">
                {t("host.greeting")}, {ME.name}.
              </h1>
              <p className="text-amber-ink/80 text-sm mt-1">
                {t("host.intro")}
              </p>
            </div>
            <img
              src={ME.avatar}
              alt={ME.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-ink flex-none"
            />
          </div>
          <Link
            to="/host/new"
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
          >
            {t("host.postNew")}
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t("host.activeListings")} value={stats.active} />
          <StatCard label={t("host.upcomingOrders")} value={stats.upcoming} />
          <StatCard label={t("host.earnings")} value={`€${stats.revenue.toFixed(0)}`} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-full bg-white border-2 border-ink shadow-float">
            <Tab active={tab === "table"} onClick={() => setTab("table")}>
              {t("host.tables")}
            </Tab>
            <Tab active={tab === "market"} onClick={() => setTab("market")}>
              {t("host.market")}
            </Tab>
          </div>
          <Link
            to="/host/earnings"
            className="text-sm font-semibold text-ink/70 hover:text-ink underline-offset-4 hover:underline"
          >
            {t("host.earningsLink")}
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/30 p-10 text-center">
            <div className="font-display font-extrabold text-2xl mb-2">
              {tab === "table" ? t("host.noTablesTitle") : t("host.noMarketTitle")}
            </div>
            <p className="text-ink/60 mb-5">
              {tab === "table" ? t("host.noTablesBody") : t("host.noMarketBody")}
            </p>
            <Link
              to="/host/new"
              className="inline-block px-5 py-3 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold"
            >
              {tab === "table" ? t("host.postTable") : t("host.postProduct")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((l) => {
              const isTable = l.listing_type === "table";
              const left = isTable
                ? (l as TableListing).seats_available
                : (l as MarketListing).quantity_available;
              const total = isTable
                ? (l as TableListing).seats_total
                : (l as MarketListing).quantity_total;
              const when = isTable
                ? (l as TableListing).meal_time
                : `${(l as MarketListing).pickup_window_start}–${(l as MarketListing).pickup_window_end}`;
              return (
                <Link
                  key={l.id}
                  to={`/host/listing/${l.id}`}
                  className="flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition"
                >
                  <img
                    src={l.photo}
                    alt={l.title}
                    className="w-20 h-20 rounded-xl object-cover flex-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
                        {isTable ? `🍽 ${t("map.table")}` : `🛍 ${t("map.market")}`}
                      </span>
                    </div>
                    <div className="font-display font-bold text-lg leading-tight truncate">
                      {l.title}
                    </div>
                    <div className="text-xs text-ink/60">{when}</div>
                    <div className="text-xs text-ink/60">
                      {left} / {total} {isTable ? t("host.seats") : t("host.units")} {t("host.leftSuffix")}
                    </div>
                  </div>
                  <div className="text-right flex-none">
                    <div className="font-display font-extrabold text-xl">
                      {l.currency}
                      {l.price_per_unit}
                    </div>
                    <div className="text-[11px] text-ink/60 mt-1">
                      {isTable ? t("host.perSeat") : t("host.perUnit")}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-ink/90 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink/60">{label}</div>
      <div className="font-display font-extrabold text-2xl mt-0.5">{value}</div>
    </div>
  );
}

function Tab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-1.5 rounded-full text-sm font-semibold transition " +
        (active ? "bg-ink text-cream-50" : "text-ink/70 hover:text-ink")
      }
    >
      {children}
    </button>
  );
}
