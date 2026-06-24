import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { mockListings } from "../data/mockListings";
import { mockReviews } from "../data/mockReviews";
import { formatReviewDate } from "../lib/datetime";
import { useLanguage } from "../i18n";
import type { Listing } from "../types";

export default function PublicProfile() {
  const { id = "" } = useParams();
  const { code: lang } = useLanguage();

  const ctx = useMemo(() => {
    const sample = mockListings.find((l) => l.host_name === id) ?? mockListings[0];
    const theirListings = mockListings.filter((l) => l.host_name === sample.host_name);
    const reviews = mockReviews[sample.host_name] ?? [];
    return { sample, theirListings, reviews };
  }, [id]);

  const [tab, setTab] = useState<"host" | "guest">("host");
  const [reported, setReported] = useState(false);

  return (
    <div className="min-h-full bg-cream-50 pb-10">
      <TopBar back title="Profile" />

      <div className="max-w-[640px] mx-auto px-4 pt-2 space-y-5">
        <div className="rounded-3xl border-2 border-ink/90 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <img
              src={ctx.sample.host_avatar}
              alt={ctx.sample.host_name}
              className="w-20 h-20 rounded-full object-cover border-2 border-ink flex-none"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-display font-extrabold text-2xl leading-tight">
                  {ctx.sample.host_name}
                </div>
                {ctx.sample.host_verified && (
                  <span title="Verified" className="text-amber-deep">★</span>
                )}
              </div>
              <div className="text-sm text-ink/60 mt-1">
                ★ {ctx.sample.host_rating.toFixed(2)} · {ctx.theirListings.length} listing{ctx.theirListings.length === 1 ? "" : "s"}
              </div>
              <div className="text-sm text-ink/60">{ctx.sample.location_display}</div>
            </div>
            <button
              onClick={() => setReported(true)}
              disabled={reported}
              className="px-3 py-1.5 rounded-full border-2 border-ink text-xs font-semibold flex-none disabled:opacity-50"
            >
              {reported ? "Reported" : "Report"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Hosted" value={ctx.theirListings.length} />
          <Stat label="Rating" value={`★ ${ctx.sample.host_rating.toFixed(1)}`} />
          <Stat label="Member since" value="2025" />
        </div>

        <div>
          <div className="flex items-center gap-1 p-1 rounded-full bg-white border-2 border-ink w-fit shadow-float mb-3">
            <Tab active={tab === "host"} onClick={() => setTab("host")}>As host</Tab>
            <Tab active={tab === "guest"} onClick={() => setTab("guest")}>As guest</Tab>
          </div>

          {tab === "host" ? (
            <ReviewList reviews={ctx.reviews} lang={lang} />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-ink/25 p-8 text-center text-ink/60">
              No reviews as a guest yet.
            </div>
          )}
        </div>

        {ctx.theirListings.length > 0 && (
          <div>
            <h2 className="font-display font-extrabold text-xl mb-2">
              Their listings
            </h2>
            <div className="space-y-3">
              {ctx.theirListings.map((l) => (
                <ListingMini key={l.id} l={l} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewList({ reviews, lang }: { reviews: typeof mockReviews[string]; lang: string }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-ink/25 p-8 text-center text-ink/60">
        No reviews yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border-2 border-ink/90 bg-white p-4">
          <div className="flex items-center gap-3">
            <img
              src={r.reviewer_avatar}
              alt={r.reviewer_name}
              className="w-10 h-10 rounded-full object-cover border border-ink/20"
            />
            <div className="flex-1">
              <div className="font-semibold leading-tight">{r.reviewer_name}</div>
              <div className="text-xs text-ink/60">{formatReviewDate(r.created_at, lang)}</div>
            </div>
            <div className="text-amber-deep font-semibold">
              {"★".repeat(r.rating)}
            </div>
          </div>
          <p className="mt-2 text-sm text-ink/85 leading-relaxed">{r.comment}</p>
        </div>
      ))}
    </div>
  );
}

function ListingMini({ l }: { l: Listing }) {
  const isTable = l.listing_type === "table";
  return (
    <a
      href={`/listing/${l.id}`}
      className="flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition"
    >
      <img src={l.photo} alt={l.title} className="w-16 h-16 rounded-xl object-cover flex-none" />
      <div className="flex-1 min-w-0">
        <div className="flex gap-1.5 mb-0.5">
          <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
            {isTable ? "🍽" : "🛍"}
          </span>
        </div>
        <div className="font-display font-bold leading-tight truncate">{l.title}</div>
        <div className="text-xs text-ink/60">
          {l.currency}
          {l.price_per_unit} · {l.location_display}
        </div>
      </div>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-ink/90 bg-white p-3 text-center">
      <div className="text-[11px] uppercase tracking-wider text-ink/60">{label}</div>
      <div className="font-display font-extrabold text-xl mt-0.5">{value}</div>
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
