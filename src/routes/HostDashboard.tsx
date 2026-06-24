import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useHost, ME } from "../store/hostListings";
import { useSession } from "../store/session";
import { cancelListing, fetchMyListings } from "../lib/db";
import { useOrders } from "../store/orders";
import { useT } from "../i18n";
import type { Listing, MarketListing, TableListing } from "../types";

function useMyListings(): Listing[] {
  const localListings = useHost((s) => s.myListings);
  const sessionUser = useSession((s) => s.user);
  const [dbListings, setDbListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!sessionUser) return;
    fetchMyListings(sessionUser.id)
      .then(setDbListings)
      .catch(() => {});
  }, [sessionUser]);

  return useMemo(() => {
    const localIds = new Set(localListings.map((l) => l.id));
    return [...localListings, ...dbListings.filter((l) => !localIds.has(l.id))];
  }, [localListings, dbListings]);
}

interface UndoItem {
  listing: Listing;
  timeoutId: ReturnType<typeof setTimeout>;
}

export default function HostDashboard() {
  const myListings = useMyListings();
  const orders = useOrders((s) => s.orders);
  const remove = useHost((s) => s.remove);
  const [tab, setTab] = useState<"table" | "market">("table");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undoItem, setUndoItem] = useState<UndoItem | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
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

  const commitDelete = async (id: string) => {
    remove(id);
    try {
      await cancelListing(id);
    } catch {
      // local state already removed; DB error is non-fatal
    }
    setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleDelete = (listing: Listing) => {
    // Cancel any existing undo for a previous deletion first
    if (undoItem) {
      clearTimeout(undoItem.timeoutId);
      commitDelete(undoItem.listing.id);
    }

    const timeoutId = setTimeout(() => {
      commitDelete(listing.id);
      setUndoItem(null);
    }, 5000);

    // Optimistically hide from list
    setDeletingIds((prev) => new Set([...prev, listing.id]));
    setUndoItem({ listing, timeoutId });
    setSelected((prev) => { const next = new Set(prev); next.delete(listing.id); return next; });
  };

  const handleUndo = () => {
    if (!undoItem) return;
    clearTimeout(undoItem.timeoutId);
    setDeletingIds((prev) => { const next = new Set(prev); next.delete(undoItem.listing.id); return next; });
    setUndoItem(null);
  };

  const handleBulkDelete = () => {
    selected.forEach((id) => {
      const listing = myListings.find((l) => l.id === id);
      if (listing) handleDelete(listing);
    });
    setSelected(new Set());
    setBulkMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleFiltered = filtered.filter((l) => !deletingIds.has(l.id));

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
          <div className="flex items-center gap-3">
            {bulkMode ? (
              <>
                {selected.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    Delete {selected.size}
                  </button>
                )}
                <button
                  onClick={() => { setBulkMode(false); setSelected(new Set()); }}
                  className="text-sm font-semibold text-ink/70 hover:text-ink"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {visibleFiltered.length > 1 && (
                  <button
                    onClick={() => setBulkMode(true)}
                    className="text-sm font-semibold text-ink/70 hover:text-ink"
                  >
                    Select
                  </button>
                )}
                <Link
                  to="/host/earnings"
                  className="text-sm font-semibold text-ink/70 hover:text-ink underline-offset-4 hover:underline"
                >
                  {t("host.earningsLink")}
                </Link>
              </>
            )}
          </div>
        </div>

        {visibleFiltered.length === 0 ? (
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
            {visibleFiltered.map((l) => {
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

              if (bulkMode) {
                const checked = selected.has(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleSelect(l.id)}
                    className={
                      "w-full flex gap-3 p-3 rounded-2xl bg-white border-2 transition text-left " +
                      (checked ? "border-ink bg-ink/5" : "border-ink/90")
                    }
                  >
                    <div className="flex items-center justify-center w-6 h-6 mt-7 flex-none">
                      <div className={
                        "w-5 h-5 rounded-full border-2 border-ink flex items-center justify-center " +
                        (checked ? "bg-ink" : "")
                      }>
                        {checked && <span className="text-cream-50 text-xs font-bold">✓</span>}
                      </div>
                    </div>
                    <ListingCardContent l={l} left={left} total={total} when={when} isTable={isTable} t={t} />
                  </button>
                );
              }

              return (
                <SwipeableCard
                  key={l.id}
                  onDelete={() => handleDelete(l)}
                >
                  <Link
                    to={`/host/listing/${l.id}`}
                    className="flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition"
                  >
                    <ListingCardContent l={l} left={left} total={total} when={when} isTable={isTable} t={t} />
                  </Link>
                </SwipeableCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Undo snackbar */}
      {undoItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-ink text-cream-50 shadow-float text-sm font-medium">
          <span>Listing deleted</span>
          <button
            onClick={handleUndo}
            className="font-bold text-amber underline-offset-2 hover:underline"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function ListingCardContent({
  l, left, total, when, isTable, t,
}: {
  l: Listing;
  left: number | undefined;
  total: number | undefined;
  when: string | undefined;
  isTable: boolean;
  t: (key: string) => string;
}) {
  return (
    <>
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
    </>
  );
}

// Swipeable wrapper: swipe left to reveal delete button
function SwipeableCard({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const DELETE_THRESHOLD = 80;
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startXRef.current === null) return;
    const dx = startXRef.current - e.clientX; // positive = swiping left
    if (dx > 0) setOffset(Math.min(dx, DELETE_THRESHOLD + 20));
  };

  const handlePointerUp = () => {
    if (startXRef.current === null) return;
    startXRef.current = null;
    if (offset >= DELETE_THRESHOLD) {
      setOffset(DELETE_THRESHOLD);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
  };

  const handleClose = () => {
    setOffset(0);
    setRevealed(false);
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Delete action behind the card */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-3 bg-red-500 rounded-2xl"
        style={{ width: DELETE_THRESHOLD + 20 }}
      >
        <button
          onClick={() => { handleClose(); onDelete(); }}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-red-600 text-white text-xs font-bold gap-1"
        >
          <span className="text-lg">🗑</span>
          Delete
        </button>
      </div>

      {/* Swipeable card */}
      <div
        className="relative touch-pan-y select-none"
        style={{ transform: `translateX(-${offset}px)`, transition: offset === 0 || offset === DELETE_THRESHOLD ? "transform 0.2s ease" : "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>

      {/* Tap outside overlay to close */}
      {revealed && (
        <div
          className="absolute inset-0 z-10"
          style={{ right: DELETE_THRESHOLD + 20 }}
          onClick={handleClose}
        />
      )}
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
