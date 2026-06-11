import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import PhotoCarousel from "../components/PhotoCarousel";
import QuantityStepper from "../components/QuantityStepper";
import { Chip } from "../components/Chip";
import { mockListings } from "../data/mockListings";
import { depositFor } from "../store/orders";
import type { Listing, MarketListing, TableListing } from "../types";

export default function ListingDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const listing = useMemo<Listing | undefined>(
    () => mockListings.find((l) => l.id === id),
    [id],
  );
  const [qty, setQty] = useState(1);

  if (!listing) {
    return (
      <div className="min-h-full">
        <TopBar back title="Listing not found" />
        <div className="p-6 text-ink/70">This listing no longer exists.</div>
      </div>
    );
  }

  const isTable = listing.listing_type === "table";
  const max = isTable
    ? (listing as TableListing).seats_available
    : (listing as MarketListing).quantity_available;
  const unit = isTable ? "seat" : "unit";
  const { total, deposit, balance } = depositFor(listing.price_per_unit, qty);

  return (
    <div className="min-h-full bg-cream-50 pb-32">
      <TopBar back />

      <PhotoCarousel photos={[listing.photo, listing.photo, listing.photo]} alt={listing.title} />

      <div className="max-w-[760px] mx-auto px-4 sm:px-6 -mt-6 relative">
        <div className="rounded-3xl bg-cream-50 border-2 border-ink/90 shadow-sheet p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
              {isTable ? "🍽 Table" : "🛍 Market"}
            </span>
            <span className="text-xs text-ink/60">{listing.location_display}</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-4xl leading-[1.05]">
            {listing.title}
          </h1>

          <div className="flex items-center gap-3">
            <img
              src={listing.host_avatar}
              alt={listing.host_name}
              className="w-12 h-12 rounded-full object-cover border border-ink/20"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{listing.host_name}</span>
                {listing.host_verified && (
                  <span className="text-amber-deep" title="Verified">★</span>
                )}
              </div>
              <div className="text-xs text-ink/60">
                ★ {listing.host_rating.toFixed(2)} · {isTable ? "Host" : "Maker"}
              </div>
            </div>
          </div>

          <p className="text-[15px] text-ink/85 leading-relaxed">{listing.description}</p>

          <div className="flex flex-wrap gap-1.5">
            {isTable && (
              <Chip variant="amber">⏱ {(listing as TableListing).meal_time}</Chip>
            )}
            {isTable && (
              <Chip variant="amber">
                {(listing as TableListing).seats_available} / {(listing as TableListing).seats_total} seats
              </Chip>
            )}
            {isTable && (
              <Chip variant="amber">{(listing as TableListing).dining_setting}</Chip>
            )}
            {!isTable && (
              <Chip variant="leaf">
                ⏱ {(listing as MarketListing).pickup_window_start}–
                {(listing as MarketListing).pickup_window_end}
              </Chip>
            )}
            {!isTable && (
              <Chip variant="leaf">
                {(listing as MarketListing).quantity_available} units left
              </Chip>
            )}
            {(isTable
              ? (listing as TableListing).cuisine_tags
              : (listing as MarketListing).product_type_tags
            ).map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
            {listing.dietary_tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>

          {listing.allergen_flags.length > 0 && (
            <div className="rounded-2xl border border-amber/60 bg-amber/10 px-4 py-3 text-sm text-amber-ink">
              <div className="font-semibold mb-0.5">⚠ Allergen alert</div>
              <div>This listing contains: {listing.allergen_flags.join(", ")}.</div>
            </div>
          )}

          <div className="rounded-2xl border border-ink/10 bg-white p-4">
            <div className="text-xs uppercase tracking-wider text-ink/60 mb-1">
              Approximate location
            </div>
            <div className="font-medium">{listing.location_display}</div>
            <div className="text-xs text-ink/60 mt-1">
              Exact address shared after your {isTable ? "booking" : "order"} is confirmed.
            </div>
          </div>

          <QuantityStepper value={qty} max={Math.max(1, max)} unit={unit} onChange={setQty} />

          <div className="rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-1.5 text-sm">
            <Row label={`Per ${unit}`} value={`${listing.currency}${listing.price_per_unit}`} />
            <Row label={`× ${qty}`} value={`${listing.currency}${total.toFixed(2)}`} />
            <div className="border-t border-ink/10 my-2" />
            <Row
              label="Deposit (paid now)"
              value={`${listing.currency}${deposit.toFixed(2)}`}
              bold
            />
            <Row
              label={`Balance — paid to host on ${isTable ? "arrival" : "pickup"}`}
              value={`${listing.currency}${balance.toFixed(2)}`}
              muted
            />
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-30 p-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pt-8">
        <div className="max-w-[760px] mx-auto">
          <button
            onClick={() => nav(`/listing/${listing.id}/book?qty=${qty}`)}
            disabled={max < 1}
            className={
              "w-full py-3.5 rounded-2xl font-semibold text-base border-2 border-ink transition disabled:opacity-50 " +
              (isTable
                ? "bg-amber text-amber-ink hover:bg-amber-deep hover:text-cream-50"
                : "bg-leaf text-leaf-ink hover:bg-leaf-deep hover:text-cream-50")
            }
          >
            {max < 1 ? "Sold out" : isTable ? "Book a Seat" : "Order Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-ink/60" : "text-ink/80"}>{label}</span>
      <span className={bold ? "font-display font-extrabold text-lg" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
