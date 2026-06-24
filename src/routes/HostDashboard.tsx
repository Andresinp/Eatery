import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import ConfirmDialog from "../components/ConfirmDialog";
import { useHost, ME } from "../store/hostListings";
import { useSession } from "../store/session";
import { cancelListing, fetchMyListings } from "../lib/db";
import { useOrders } from "../store/orders";
import { useT, useLanguage, type TKey } from "../i18n";
import { formatListingWhen } from "../lib/datetime";
import type { Listing, MarketListing, TableListing } from "../types";

function useMyListings(): { listings: Listing[]; drop: (id: string) => void } {
  const localListings = useHost((s) => s.myListings);
  const sessionUser = useSession((s) => s.user);
  const [dbListings, setDbListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!sessionUser) return;
    fetchMyListings(sessionUser.id)
      .then(setDbListings)
      .catch(() => {});
  }, [sessionUser]);

  // Remove a fetched (DB-backed) listing from local view immediately so the
  // card, count and tabs all update without waiting for a refetch.
  const drop = useCallback((id: string) => {
    setDbListings((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const listings = useMemo(() => {
    const localIds = new Set(localListings.map((l) => l.id));
    return [...localListings, ...dbListings.filter((l) => !localIds.has(l.id))];
  }, [localListings, dbListings]);

  return { listings, drop };
}

export default function HostDashboard() {
  const { listings: myListings, drop } = useMyListings();
  const orders = useOrders((s) => s.orders);
  const remove = useHost((s) => s.remove);
  const [tab, setTab] = useState<"table" | "market">("table");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Pending confirmation: either a single listing or a set of ids (bulk).
  const [confirm, setConfirm] = useState<
    { kind: "single"; listing: Listing } | { kind: "bulk"; ids: string[] } | null
  >(null);
  const t = useT();
  const { code: lang } = useLanguage();

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

  // Actually delete: drop from every local source immediately, then sync the DB.
  const performDelete = useCallback(
    (id: string) => {
      remove(id);
      drop(id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      cancelListing(id).catch(() => {
        // Local state already removed; the DB error is non-fatal and will
        // reconcile on the next fetch.
      });
    },
    [remove, drop],
  );

  const confirmDelete = () => {
    if (!confirm) return;
    if (confirm.kind === "single") {
      performDelete(confirm.listing.id);
    } else {
      confirm.ids.forEach(performDelete);
      setSelected(new Set());
      setBulkMode(false);
    }
    setConfirm(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmCount =
    confirm?.kind === "bulk" ? confirm.ids.length : confirm ? 1 : 0;

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
                    onClick={() => setConfirm({ kind: "bulk", ids: [...selected] })}
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
                {filtered.length > 1 && (
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
              const when = formatListingWhen(l, lang);

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
                <ListingRow
                  key={l.id}
                  listing={l}
                  left={left}
                  total={total}
                  when={when}
                  isTable={isTable}
                  t={t}
                  onDelete={() => setConfirm({ kind: "single", listing: l })}
                />
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirmCount > 1 ? `Delete ${confirmCount} tables?` : "Delete this table?"}
        body="This action will remove it from your profile, map, and public listings."
        confirmLabel={confirmCount > 1 ? `Delete ${confirmCount}` : "Delete"}
        onConfirm={confirmDelete}
        onCancel={() => setConfirm(null)}
      />
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
  t: (key: TKey, fallback?: string) => string;
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
        <div className="text-xs text-ink/60">{when || "Date not set"}</div>
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

// A single host listing card: swipeable to reveal Delete, with a three-dot
// fallback menu so deletion always works even if the swipe gesture fails.
function ListingRow({
  listing, left, total, when, isTable, t, onDelete,
}: {
  listing: Listing;
  left: number | undefined;
  total: number | undefined;
  when: string | undefined;
  isTable: boolean;
  t: (key: TKey, fallback?: string) => string;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SwipeableCard onDelete={onDelete}>
      <div className="relative">
        <Link
          to={`/host/listing/${listing.id}`}
          className="flex gap-3 p-3 pr-10 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition"
        >
          <ListingCardContent l={listing} left={left} total={total} when={when} isTable={isTable} t={t} />
        </Link>

        {/* Three-dot fallback menu */}
        <button
          type="button"
          aria-label="More options"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="absolute top-1.5 right-1.5 w-8 h-8 flex items-center justify-center rounded-full text-ink/50 hover:bg-ink/5"
        >
          <span className="text-lg leading-none" aria-hidden>⋮</span>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }}
            />
            <div className="absolute top-10 right-2 z-30 min-w-[140px] rounded-2xl border-2 border-ink bg-white shadow-float overflow-hidden">
              <Link
                to={`/host/listing/${listing.id}`}
                className="block px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
                onClick={() => setMenuOpen(false)}
              >
                Open
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 border-t border-ink/10"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </SwipeableCard>
  );
}

// Swipeable wrapper: right-to-left swipe reveals a Delete action.
//
// Built on Pointer Events with an explicit direction lock so it works on touch
// (iOS Safari / Android), pen and mouse without fighting vertical page scroll.
function SwipeableCard({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const REVEAL = 96;   // px width of the revealed Delete action
  const COMMIT = 44;   // px past which the row snaps fully open
  const DIR_LOCK = 10; // px of movement before we lock horizontal vs vertical

  const startX = useRef(0);
  const startY = useRef(0);
  const decided = useRef(false);
  const horizontal = useRef(false);
  const moved = useRef(false);
  const offsetRef = useRef(0);
  const activePointer = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [animate, setAnimate] = useState(true);

  const setOff = (v: number) => { offsetRef.current = v; setOffset(v); };

  const close = () => { setAnimate(true); setRevealed(false); setOff(0); };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    activePointer.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    decided.current = false;
    horizontal.current = false;
    moved.current = false;
    setAnimate(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!decided.current) {
      if (Math.abs(dx) < DIR_LOCK && Math.abs(dy) < DIR_LOCK) return;
      decided.current = true;
      horizontal.current = Math.abs(dx) > Math.abs(dy);
      if (horizontal.current) {
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not fatal */ }
      }
    }
    if (!horizontal.current) return; // vertical gesture → let the page scroll
    moved.current = true;
    const base = revealed ? REVEAL : 0;
    const next = Math.max(0, Math.min(base - dx, REVEAL + 16)); // swipe left (dx<0) opens
    setOff(next);
  };

  const finish = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    if (horizontal.current) {
      const open = offsetRef.current >= COMMIT;
      setAnimate(true);
      setRevealed(open);
      setOff(open ? REVEAL : 0);
    }
    horizontal.current = false;
    decided.current = false;
  };

  // Swallow the click that follows a swipe so the underlying <Link> doesn't
  // navigate, and let a tap on an open card close it.
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current || revealed) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
      if (revealed) close();
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ overscrollBehaviorX: "contain" }}
    >
      {/* Delete action behind the card */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL }}>
        <button
          type="button"
          aria-label="Delete listing"
          onClick={() => { close(); onDelete(); }}
          className="flex flex-col items-center justify-center w-full bg-red-600 text-white text-xs font-bold gap-1 rounded-2xl"
        >
          <span className="text-lg" aria-hidden>🗑</span>
          Delete
        </button>
      </div>

      {/* Swipeable foreground */}
      <div
        className="relative select-none"
        style={{
          transform: `translateX(-${offset}px)`,
          transition: animate ? "transform 0.2s ease" : "none",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={onClickCapture}
      >
        {children}
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
