import { useNavigate } from "react-router-dom";
import type { Listing } from "../types";
import { Chip } from "./Chip";
import { useT } from "../i18n";

export default function ListingSheet({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const t = useT();
  const isTable = listing.listing_type === "table";
  const openDetail = () => nav(`/listing/${listing.id}`);
  return (
    <div className="absolute left-0 right-0 bottom-0 z-30 px-3 pb-3 pointer-events-none">
      <div className="mx-auto max-w-[680px] pointer-events-auto animate-slide-up">
        <div className="rounded-3xl bg-cream-50 border-2 border-ink/90 shadow-sheet overflow-hidden">
          <div className="relative h-56 sm:h-64">
            <img
              src={listing.photo}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
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

          <div className="p-4 sm:p-5 space-y-4">
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
              <div className="text-right">
                <div className="font-display font-extrabold text-2xl leading-none">
                  {listing.currency}
                  {listing.price_per_unit}
                </div>
                <div className="text-[11px] text-ink/60 mt-0.5">
                  {isTable ? t("map.perSeat") : t("map.perUnit")}
                </div>
              </div>
            </div>

            <p className="text-sm text-ink/80 leading-relaxed line-clamp-3">
              {listing.description}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {isTable && (
                <Chip variant="amber">⏱ {(listing as { meal_time: string }).meal_time}</Chip>
              )}
              {isTable && (
                <Chip variant="amber">
                  {(listing as { seats_available: number }).seats_available} {t("map.seatsLeft")}
                </Chip>
              )}
              {!isTable && (
                <Chip variant="leaf">
                  ⏱ {(listing as { pickup_window_start: string }).pickup_window_start}–
                  {(listing as { pickup_window_end: string }).pickup_window_end}
                </Chip>
              )}
              {!isTable && (
                <Chip variant="leaf">
                  {(listing as { quantity_available: number }).quantity_available} {t("map.left")}
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

            {listing.allergen_flags.length > 0 && (
              <div className="rounded-2xl border border-amber/60 bg-amber/10 px-3 py-2 text-xs text-amber-ink">
                <span className="font-semibold">⚠ {t("map.contains")}</span>{" "}
                {listing.allergen_flags.join(", ")}
              </div>
            )}

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
