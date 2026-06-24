import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Listing, MarketListing, TableListing } from "../types";
import { Chip } from "./Chip";
import { useLanguage, useT } from "../i18n";
import { formatMealTime, formatPickupWindow, isIso, localeFor } from "../lib/datetime";

const SWIPE_CLOSE_THRESHOLD = 80;
const SWIPE_EXPAND_THRESHOLD = -60;

function haversineKm(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatListingDate(
  value: string | undefined,
  lang: string,
  tToday: string,
  tTomorrow: string,
): string | null {
  if (!value || !isIso(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateDay = new Date(date);
  dateDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return tToday;
  if (diffDays === 1) return tTomorrow;

  const locale = localeFor(lang);
  if (diffDays >= 2 && diffDays <= 6) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function ListingSheet({
  listing,
  onClose,
  userLocation,
}: {
  listing: Listing;
  onClose: () => void;
  userLocation?: [number, number] | null;
}) {
  const nav = useNavigate();
  const t = useT();
  const { code: lang } = useLanguage();
  const isTable = listing.listing_type === "table";
  const availability = isTable
    ? (listing as TableListing).seats_available
    : (listing as MarketListing).quantity_available;
  const table = isTable ? (listing as TableListing) : null;
  const drinks = table?.drinks ?? [];
  const openDetail = () => nav(`/listing/${listing.id}`);

  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  // Reset to collapsed when a new listing is opened
  useEffect(() => {
    setExpanded(false);
    setDragY(0);
  }, [listing.id]);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startY.current;
    if (expanded) {
      setDragY(Math.max(0, delta));
    } else {
      setDragY(delta);
    }
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (expanded) {
      if (dragY > SWIPE_CLOSE_THRESHOLD) setExpanded(false);
    } else {
      if (dragY > SWIPE_CLOSE_THRESHOLD) onClose();
      else if (dragY < SWIPE_EXPAND_THRESHOLD) setExpanded(true);
    }
    setDragY(0);
  };

  const distance =
    userLocation != null
      ? haversineKm(userLocation, [listing.location_lng, listing.location_lat])
      : null;

  const cuisineTags = isTable
    ? (listing as TableListing).cuisine_tags
    : (listing as MarketListing).product_type_tags;
  const previewTags = [...cuisineTags, ...listing.dietary_tags].slice(0, 2);

  const typeLabel = isTable ? t("map.table") : t("map.market");
  const priceLabel = isTable ? t("map.perSeat") : t("map.perUnit");
  const availLabel = isTable ? t("map.seatsLeft") : t("map.itemsLeft");
  const isLow = availability > 0 && availability <= 5;

  const dateStr = isTable
    ? (listing as TableListing).meal_time
    : (listing as MarketListing).pickup_window_start;
  const listingDate = formatListingDate(
    dateStr,
    lang,
    t("map.today"),
    t("map.tomorrow"),
  );

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
          transition: dragging
            ? "none"
            : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          className="flex flex-col rounded-3xl bg-cream-50 border-2 border-ink/90 shadow-sheet overflow-hidden"
          style={{
            maxHeight: expanded
              ? "calc(92dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)"
              : "48vh",
            transition: dragging
              ? "none"
              : "max-height 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Photo — compact in collapsed, taller in expanded */}
          <div
            className="relative flex-none overflow-hidden bg-ink/5"
            style={{
              height: expanded ? undefined : "7rem",
              aspectRatio: expanded ? "16/10" : undefined,
              transition: dragging
                ? "none"
                : "height 320ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={listing.photo}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {expanded && (
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none" />
            )}
            {/* Grab handle */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-cream-50/80 shadow pointer-events-none" />
            <button
              onClick={onClose}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => { e.stopPropagation(); onClose(); }}
              aria-label={t("common.close")}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cream-50 border-2 border-ink/90 grid place-items-center shadow-float"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
            <div className="absolute left-3 top-3">
              <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
                {isTable ? `🍽 ${t("map.table")}` : `🛍 ${t("map.market")}`}
              </span>
            </div>
            {/* Title overlay — only in expanded state */}
            {expanded && (
              <div className="absolute left-3 bottom-3 right-3">
                <div className="text-cream-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  <div className="font-display font-extrabold text-2xl leading-tight">
                    {listing.title}
                  </div>
                  <div className="text-sm opacity-95">{listing.location_display}</div>
                </div>
              </div>
            )}
          </div>

          {/* Collapsed summary — list-view-style two-column layout */}
          {!expanded && (
            <div className="flex-none px-4 pt-3 pb-2">
              <div className="flex items-start gap-3">
                {/* Left / main column */}
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  {/* Title + date badge */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-display font-bold text-[15px] leading-tight line-clamp-1 flex-1 min-w-0">
                      {listing.title}
                    </p>
                    {listingDate && (
                      <span className="flex-none text-[10px] text-ink/55 bg-ink/[0.06] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {listingDate}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <p className="text-[12px] text-ink/50 leading-tight truncate">
                    {listing.location_display}
                  </p>

                  {/* Rating + type */}
                  {listing.host_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-amber text-[10px]">★</span>
                      <span className="text-[11px] text-ink/55">
                        {listing.host_rating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-ink/20">·</span>
                      <span className="text-[11px] text-ink/55">{typeLabel}</span>
                    </div>
                  )}

                  {/* Description preview */}
                  {listing.description && (
                    <p className="text-[12px] text-ink/60 leading-tight line-clamp-1">
                      {listing.description}
                    </p>
                  )}

                  {/* Tags */}
                  {previewTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {previewTags.map((tag) => (
                        <span key={tag} className="chip-sm">
                          {formatTag(tag)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Drinks info (table only) */}
                  {table && (
                    <p
                      className={
                        "text-[11px] leading-tight mt-0.5 " +
                        (table.drinks_included
                          ? "text-leaf-ink"
                          : "text-ink/40")
                      }
                    >
                      {table.drinks_included
                        ? `🍷 ${drinks.length > 0 ? drinks.join(", ") : t("map.drinksIncluded")}`
                        : `🚫 ${t("map.drinksNotIncluded")}`}
                    </p>
                  )}
                </div>

                {/* Right column — price, availability, distance */}
                <div className="flex-none text-right flex flex-col gap-[4px] items-end">
                  <div className="flex flex-col items-end">
                    <p className="text-[13px] font-semibold text-ink leading-tight">
                      {listing.currency}{listing.price_per_unit}
                    </p>
                    <p className="text-[10px] text-ink/35 leading-tight">
                      {priceLabel}
                    </p>
                  </div>
                  {availability > 0 && (
                    <span
                      className={
                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight whitespace-nowrap " +
                        (isLow
                          ? "bg-amber/20 text-amber-ink"
                          : "bg-leaf/15 text-leaf-ink")
                      }
                    >
                      {availability} {availLabel}
                    </span>
                  )}
                  {distance !== null && (
                    <p className="text-[10px] text-ink/40 leading-tight">
                      {formatDistance(distance)} away
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Expanded scrollable body */}
          {expanded && (
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
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        className="text-amber-deep"
                        fill="currentColor"
                      >
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
                      {priceLabel}
                    </div>
                  </div>
                  <SeatsLeftBadge
                    count={availability}
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
                    ⏱{" "}
                    {formatMealTime(
                      (listing as TableListing).meal_time,
                      lang,
                      (listing as TableListing).meal_end_time,
                    )}
                  </Chip>
                )}
                {!isTable && (
                  <Chip variant="leaf">
                    ⏱{" "}
                    {formatPickupWindow(
                      (listing as MarketListing).pickup_window_start,
                      (listing as MarketListing).pickup_window_end,
                      lang,
                    )}
                  </Chip>
                )}
                {isTable &&
                  (listing as TableListing).cuisine_tags.map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                {!isTable &&
                  (listing as MarketListing).product_type_tags.map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                {listing.dietary_tags.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </div>

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
          )}

          {/* Pinned CTA — always visible */}
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
