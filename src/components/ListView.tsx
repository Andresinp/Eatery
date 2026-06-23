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
}: {
  listings: Listing[];
  userLocation?: LngLat | null;
}) {
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
              className="flex gap-3 items-start py-2.5 transition-colors active:bg-ink/[0.02]"
            >
              <img
                src={l.photo}
                alt={l.title}
                className="w-[70px] h-[70px] rounded-xl object-cover flex-none"
              />
              <div className="flex-1 min-w-0 pt-0">
                {/* Title row with price + availability pill */}
                <div className="flex items-start justify-between gap-2 mb-0">
                  <p className="font-display font-bold text-[15px] leading-tight line-clamp-2 flex-1 min-w-0">
                    {l.title}
                  </p>
                  <div className="flex-none text-right shrink-0">
                    <p className="text-[13px] font-semibold text-ink leading-tight">
                      {formatPrice(l.price_per_unit, l.currency)}
                    </p>
                    <p className="text-[10px] text-ink/35 leading-tight">{priceLabel}</p>
                    {availability > 0 && (
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight ${
                        isLow
                          ? "bg-amber/20 text-amber-ink"
                          : "bg-leaf/15 text-leaf-ink"
                      }`}>
                        {availability} {unitLabel} left
                      </span>
                    )}
                    {distance !== null && (
                      <p className="text-[10px] text-ink/40 mt-0.5 leading-tight">
                        {formatDistance(distance)} away
                      </p>
                    )}
                  </div>
                </div>

                {/* Location — pulled tight to title, aligned with availability badge */}
                <p className="text-xs text-ink/50 -mt-1 mb-0 truncate">{l.location_display}</p>

                {/* Rating · type */}
                {l.host_rating > 0 && (
                  <div className="flex items-center gap-1.5 mt-0.5 mb-0">
                    <span className="text-[11px] text-ink/50 flex items-center gap-0.5">
                      <span className="text-amber text-[10px]">★</span>
                      {l.host_rating.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-ink/20">·</span>
                    <span className="text-[11px] text-ink/50">{typeLabel}</span>
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {tags.map((tag) => (
                      <span key={tag} className="chip-sm">{formatTag(tag)}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
