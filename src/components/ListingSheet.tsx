import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Listing, MarketListing, TableListing } from "../types";
import { Chip } from "./Chip";
import { useLanguage, useT } from "../i18n";
import { formatMealTime, formatPickupWindow } from "../lib/datetime";

// Drag past this many px (downward) to dismiss the sheet on touch release.
const SWIPE_CLOSE_THRESHOLD = 90;

export default function ListingSheet({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const t = useT();
  const { code: lang } = useLanguage();
  const isTable = listing.listing_type === "table";
  const seatsLeft = isTable ? (listing as TableListing).seats_available : (listing as MarketListing).quantity_available;
  const table = isTable ? (listing as TableListing) : null;
  const drinks = table?.drinks ?? [];
  const openDetail = () => nav(`/listing/${listing.id}`);

  // Swipe-down-to-close. We only follow downward drags and snap back if the
  // release falls short of the threshold, so the sheet feels like a native
  // bottom sheet without hijacking normal taps/scrolls.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startY.current;
    setDragY(Math.max(0, delta));
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (dragY > SWIPE_CLOSE_THRESHOLD) onClose();
    else setDragY(0);
  };

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-30 px-3 pointer-events-none"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className={
          "mx-auto max-w-[680px] pointer-events-auto " +
          (dragY === 0 && !dragging ? "animate-slide-up" : "")
        }
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? "none" : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* The card is a flex column capped to the viewport (minus safe areas)
            so it never overflows the top of the screen. The photo header and
            the booking button stay pinned while the middle scrolls — users
            always see the start and end of the sheet. */}
        <div className="flex flex-col max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_1.5rem)] rounded-3xl bg-cream-50 border-2 border-ink/90 shadow-sheet overflow-hidden">
          <div
            className="relative flex-none w-full aspect-[16/10] sm:aspect-[2/1] overflow-hidden bg-ink/5"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={listing.photo}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient keeps the overlaid title legible over any photo. */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none" />
            {/* Grab handle — signals the sheet can be swiped down to dismiss. */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-cream-50/80 shadow pointer-events-none" />
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-cream-50 border-2 border-ink/90 grid place-items-center shadow-float"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
            <div className="absolute left-3 top-3">
              <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
                {isTable ? `🍽 ${t("map.table")}` : `🛍 ${t("map.market")}`}
              </span>
            </div>
            <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-3">
              <div className="text-cream-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                <div className="font-display font-extrabold text-2xl leading-tight">
                  {listing.title}
                </div>
                <div className="text-sm opacity-95">{listing.location_display}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={listing.host_avatar}
                alt={listing.host_name}
                className="w-10 h-10 rounded-full object-cover border border-ink/20"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{listing.host_name}</span>
                  {listing.host_verified && (
                    <svg width="14" height="14" viewBox="0 0 24 24" className="text-amber-deep" fill="currentColor">
                      <path d="M12 2l2.39 2.39 3.39-.39.39 3.39L20.56 9.83 18.83 12.56l1.73 2.73-2.39 2.34-.39 3.39-3.39-.39L12 23l-2.39-2.39-3.39.39-.39-3.39L3.44 14.17 5.17 11.44 3.44 8.71l2.39-2.34.39-3.39 3.39.39L12 1z" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-ink/60 flex items-center gap-1">
                  <span>★ {listing.host_rating.toFixed(2)}</span>
                  <span>·</span>
                  <span>{isTable ? t("map.host") : t("map.maker")}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-none">
                <div className="text-right">
                  <div className="font-display font-extrabold text-2xl leading-none">
                    {listing.currency}
                    {listing.price_per_unit}
                  </div>
                  <div className="text-[11px] text-ink/60 mt-0.5">
                    {isTable ? t("map.perSeat") : t("map.perUnit")}
                  </div>
                </div>
                <SeatsLeftBadge
                  count={seatsLeft}
                  label={isTable ? t("map.seatsLeft") : t("map.left")}
                />
              </div>
            </div>

            <p className="text-sm text-ink/80 leading-relaxed line-clamp-3">
              {listing.description}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {isTable && (
                <Chip variant="amber">
                  ⏱ {formatMealTime((listing as TableListing).meal_time, lang, (listing as TableListing).meal_end_time)}
                </Chip>
              )}
              {!isTable && (
                <Chip variant="leaf">
                  ⏱ {formatPickupWindow(
                    (listing as MarketListing).pickup_window_start,
                    (listing as MarketListing).pickup_window_end,
                    lang,
                  )}
                </Chip>
              )}
              {isTable &&
                (listing as { cuisine_tags: string[] }).cuisine_tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              {!isTable &&
                (listing as { product_type_tags: string[] }).product_type_tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              {listing.dietary_tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>

            {/* Whether drinks come with the table — a booking-relevant fact, so
                it gets a clear included/not-included badge of its own. */}
            {table && (
              <div
                className={
                  "rounded-2xl border px-3 py-2 text-xs flex items-start gap-1.5 " +
                  (table.drinks_included
                    ? "border-leaf/60 bg-leaf/10 text-leaf-ink"
                    : "border-ink/15 bg-ink/5 text-ink/60")
                }
              >
                {table.drinks_included ? (
                  <span>
                    <span className="font-semibold">🍷 {t("map.drinks")}</span>{" "}
                    {drinks.length > 0 ? drinks.join(", ") : t("map.drinksIncluded")}
                  </span>
                ) : (
                  <span className="font-semibold">🚫 {t("map.drinksNotIncluded")}</span>
                )}
              </div>
            )}

            {listing.allergen_flags.length > 0 && (
              <div className="rounded-2xl border border-amber/60 bg-amber/10 px-3 py-2 text-xs text-amber-ink">
                <span className="font-semibold">⚠ {t("map.contains")}</span>{" "}
                {listing.allergen_flags.join(", ")}
              </div>
            )}
          </div>

          {/* Pinned footer keeps the primary action in view even when the body
              scrolls, so the end of the sheet is always reachable. */}
          <div className="flex-none p-4 sm:p-5 pt-3 border-t border-ink/10 bg-cream-50">
            <button
              onClick={openDetail}
              className={
                "w-full py-3.5 rounded-2xl font-semibold text-base border-2 border-ink transition " +
                (isTable
                  ? "bg-amber text-amber-ink hover:bg-amber-deep hover:text-cream-50"
                  : "bg-leaf text-leaf-ink hover:bg-leaf-deep hover:text-cream-50")
              }
            >
              {isTable ? t("map.bookSeat") : t("map.orderNow")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Availability is key booking info, so it gets its own badge rather than being
// buried among the cuisine/dietary tags. Low stock turns red to draw the eye.
export function SeatsLeftBadge({ count, label }: { count: number; label: string }) {
  const soldOut = count <= 0;
  const low = count > 0 && count <= 2;
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 font-bold text-sm leading-none whitespace-nowrap " +
        (soldOut
          ? "border-ink/30 bg-ink/5 text-ink/50"
          : low
            ? "border-red-600 bg-red-50 text-red-700"
            : "border-amber-deep bg-amber/25 text-amber-ink")
      }
    >
      <span className="text-base">{Math.max(0, count)}</span>
      <span className="font-semibold">{label}</span>
    </span>
  );
}
