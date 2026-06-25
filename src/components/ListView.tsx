import { Link } from "react-router-dom";
import type { Listing, TableListing, MarketListing } from "../types";
import { haversineDistance, formatDistance, type LngLat } from "../lib/map";

function formatTag(tag: string): string {
  return tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrice(amount: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", TRY: "₺" };
  return `${symbols[currency] ?? currency}${amount.toLocaleString()}`;
}

export default function ListView({
  listings,
  userLocation,
  hasFilters = false,
  onClearFilters,
}: {
  listings: Listing[];
  userLocation?: LngLat | null;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}) {
  if (listings.length === 0) {
    return (
      <div className="absolute inset-0 z-10 bg-cream-50 overflow-y-auto animate-fade-in">
        <div className="max-w-[640px] mx-auto px-6 pt-32 text-center">
          <p className="font-display font-bold text-lg mb-1">No listings match</p>
          <p className="text-sm text-ink/50">
            {hasFilters
              ? "Try clearing or loosening your filters to see more nearby."
              : "Nothing available nearby right now — check back soon."}
          </p>
          {hasFilters && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="mt-4 px-4 py-2 rounded-full border-2 border-ink font-semibold text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    );
  }

  const sorted = userLocation
    ? [...listings].sort((a, b) => {
        const da = haversineDistance(userLocation[1], userLocation[0], a.location_lat, a.location_lng);
        const db = haversineDistance(userLocation[1], userLocation[0], b.location_lat, b.location_lng);
        return da - db;
      })
    : listings;

  return (
    <div className="absolute inset-0 z-10 bg-cream-50 overflow-y-auto animate-fade-in">
      <div className="max-w-[640px] mx-auto px-4 pt-24 pb-32 divide-y divide-ink/[0.07]">
        {sorted.map((l) => {
          const isTable = l.listing_type === "table";
          const primaryTags = isTable
            ? (l as TableListing).cuisine_tags.slice(0, 2)
            : (l as MarketListing).product_type_tags.slice(0, 2);
          const tags = [...primaryTags, ...l.dietary_tags.slice(0, 1)];
          const availability = isTable
            ? (l as TableListing).seats_available
            : (l as MarketListing).quantity_available;
          const unitLabel = isTable ? "seats" : "items";
          const priceLabel = isTable ? "per seat" : "per item";
          const typeLabel = isTable ? "Table" : "Market";
          const isLow = availability > 0 && availability <= 5;

          const distance = userLocation
            ? haversineDistance(userLocation[1], userLocation[0], l.location_lat, l.location_lng)
            : null;

          return (
            <Link
              key={l.id}
              to={`/listing/${l.id}`}
              className="flex gap-3 items-start py-3 transition-colors active:bg-ink/[0.02]"
            >
              {/* Column 1: Thumbnail */}
              {l.photo ? (
                <img
                  src={l.photo}
                  alt={l.title}
                  className="w-[70px] h-[70px] rounded-xl object-cover flex-none"
                />
              ) : (
                <div className="w-[70px] h-[70px] rounded-xl bg-ink/10 flex-none flex items-center justify-center text-2xl">
                  🍽
                </div>
              )}

              {/* Column 2: Main content — compact vertical stack */}
              <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
                <p className="font-display font-bold text-[15px] leading-tight line-clamp-2">
                  {l.title}
                </p>
                <p className="text-[12px] text-ink/50 leading-tight truncate">
                  {l.location_display}
                </p>
                {l.host_rating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-ink/50 flex items-center gap-0.5">
                      <span className="text-amber text-[10px]">★</span>
                      {l.host_rating.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-ink/20">·</span>
                    <span className="text-[11px] text-ink/50">{typeLabel}</span>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span key={tag} className="chip-sm">{formatTag(tag)}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 3: Metadata — right-aligned compact vertical stack */}
              <div className="flex-none text-right flex flex-col gap-[4px] items-end">
                <div className="flex flex-col items-end">
                  <p className="text-[13px] font-semibold text-ink leading-tight">
                    {formatPrice(l.price_per_unit, l.currency)}
                  </p>
                  <p className="text-[10px] text-ink/35 leading-tight">{priceLabel}</p>
                </div>
                {availability > 0 && (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight ${
                    isLow
                      ? "bg-amber/20 text-amber-ink"
                      : "bg-leaf/15 text-leaf-ink"
                  }`}>
                    {availability} {unitLabel} left
                  </span>
                )}
                {distance !== null && (
                  <p className="text-[10px] text-ink/40 leading-tight">
                    {formatDistance(distance)} away
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
