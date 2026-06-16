import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useOrders, type Order } from "../store/orders";
import { useT } from "../i18n";

export default function MyOrders() {
  const orders = useOrders((s) => s.orders);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const t = useT();

  const { upcoming, past } = useMemo(() => {
    const up: Order[] = [];
    const pa: Order[] = [];
    for (const o of orders) {
      if (o.status === "confirmed") up.push(o);
      else pa.push(o);
    }
    return { upcoming: up, past: pa };
  }, [orders]);

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-full bg-cream-50">
      <TopBar back title={t("orders.title")} />

      <div className="max-w-[760px] mx-auto px-4 pt-2 pb-10">
        <div className="flex items-center gap-1 p-1 rounded-full bg-white border-2 border-ink w-fit mx-auto shadow-float mb-6">
          <Tab active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
            {t("orders.upcoming")} {upcoming.length > 0 && `· ${upcoming.length}`}
          </Tab>
          <Tab active={tab === "past"} onClick={() => setTab("past")}>
            {t("orders.past")} {past.length > 0 && `· ${past.length}`}
          </Tab>
        </div>

        {list.length === 0 ? (
          <Empty tab={tab} />
        ) : (
          <div className="space-y-3">
            {list.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
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

function OrderCard({ order }: { order: Order }) {
  const isTable = order.listing_type === "table";
  const t = useT();
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition"
    >
      <img
        src={order.listing_snapshot.photo}
        alt={order.listing_snapshot.title}
        className="w-24 h-24 rounded-xl object-cover flex-none"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
            {isTable ? `🍽 ${t("map.table")}` : `🛍 ${t("map.market")}`}
          </span>
          <StatusBadge status={order.status} />
        </div>
        <div className="font-display font-bold text-lg leading-tight truncate">
          {order.listing_snapshot.title}
        </div>
        <div className="text-xs text-ink/60">
          {order.listing_snapshot.host_name} · {order.listing_snapshot.when}
        </div>
        <div className="text-xs text-ink/60">
          {order.quantity} × {order.listing_snapshot.currency}
          {order.price_per_unit}
        </div>
      </div>
      <div className="text-right flex-none">
        <div className="text-[11px] text-ink/60">{t("orders.balance")}</div>
        <div className="font-display font-extrabold text-xl">
          {order.listing_snapshot.currency}
          {order.balance_due.toFixed(2)}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const t = useT();
  const map: Record<Order["status"], { label: string; cls: string }> = {
    confirmed: { label: t("orders.statusConfirmed"), cls: "bg-leaf/15 text-leaf-ink border-leaf/50" },
    completed: { label: t("orders.statusCompleted"), cls: "bg-ink/10 text-ink/80 border-ink/30" },
    cancelled_by_guest: { label: t("orders.statusCancelled"), cls: "bg-ink/10 text-ink/60 border-ink/20" },
    cancelled_by_host: { label: t("orders.statusHostCancelled"), cls: "bg-ink/10 text-ink/60 border-ink/20" },
    no_show_guest: { label: t("orders.statusNoShow"), cls: "bg-amber/20 text-amber-ink border-amber/60" },
    no_show_host: { label: t("orders.statusHostNoShow"), cls: "bg-amber/20 text-amber-ink border-amber/60" },
  };
  const m = map[status];
  return (
    <span
      className={
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border " + m.cls
      }
    >
      {m.label}
    </span>
  );
}

function Empty({ tab }: { tab: "upcoming" | "past" }) {
  const t = useT();
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink/30 p-10 text-center">
      <div className="font-display font-extrabold text-2xl mb-2">
        {tab === "upcoming" ? t("orders.emptyUpcomingTitle") : t("orders.emptyPastTitle")}
      </div>
      <p className="text-ink/60 mb-5">
        {tab === "upcoming" ? t("orders.emptyUpcomingBody") : t("orders.emptyPastBody")}
      </p>
      <Link
        to="/"
        className="inline-block px-5 py-3 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold"
      >
        {t("orders.browseMap")}
      </Link>
    </div>
  );
}
