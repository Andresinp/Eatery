import { Link } from "react-router-dom";
import type { Listing, TableListing, MarketListing } from "../types";

function formatTag(tag: string): string {
  return tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrice(amount: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", TRY: "₺" };
  return `${symbols[currency] ?? currency}${amount.toLocaleString()}`;
}

export default function ListView({ listings }: { listings: Listing[] }) {
  return (
    <div className="absolute inset-0 z-10 bg-cream-50 overflow-y-auto animate-fade-in">
      <div className="max-w-[640px] mx-auto px-4 pt-24 pb-32 divide-y divide-ink/[0.07]">
        {listings.map((l) => {
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
          const isLow = availability > 0 && availability <= 3;

          return (
            <Link
              key={l.id}
              to={`/listing/${l.id}`}
              className="flex gap-3 items-start py-4 transition-colors active:bg-ink/[0.02]"
            >
              <img
                src={l.photo}
                alt={l.title}
                className="w-16 h-16 rounded-xl object-cover flex-none"
              />
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Title row with price */}
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="font-display font-bold text-[15px] leading-snug truncate flex-1 min-w-0">
                    {l.title}
                  </p>
                  <div className="flex-none text-right shrink-0">
                    <p className="text-[13px] font-semibold text-ink leading-tight">
                      {formatPrice(l.price_per_unit, l.currency)}
                    </p>
                    <p className="text-[10px] text-ink/35 leading-tight">{priceLabel}</p>
                  </div>
                </div>

                {/* Location */}
                <p className="text-xs text-ink/50 mb-1.5 truncate">{l.location_display}</p>

                {/* Secondary metadata: rating · seats left */}
                {(l.host_rating > 0 || availability > 0) && (
                  <div className="flex items-center gap-1.5 mb-2">
                    {l.host_rating > 0 && (
                      <span className="text-[11px] text-ink/50 flex items-center gap-0.5">
                        <span className="text-amber-400 text-[10px]">★</span>
                        {l.host_rating.toFixed(1)}
                      </span>
                    )}
                    {l.host_rating > 0 && availability > 0 && (
                      <span className="text-[10px] text-ink/20">·</span>
                    )}
                    {availability > 0 && (
                      <span className={`text-[11px] ${isLow ? "text-amber-600/70" : "text-ink/40"}`}>
                        {availability} {unitLabel} left
                      </span>
                    )}
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
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
