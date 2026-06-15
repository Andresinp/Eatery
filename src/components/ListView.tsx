import { Link } from "react-router-dom";
import type { Listing } from "../types";
import { Chip } from "./Chip";
import { useT } from "../i18n";

export default function ListView({ listings }: { listings: Listing[] }) {
  const t = useT();
  return (
    <div className="absolute inset-0 z-10 bg-cream-50 overflow-y-auto animate-fade-in">
      <div className="max-w-[760px] mx-auto px-4 pt-24 pb-32 space-y-3">
        {listings.map((l) => {
          const isTable = l.listing_type === "table";
          return (
            <Link
              key={l.id}
              to={`/listing/${l.id}`}
              className="w-full text-left flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition"
            >
              <img
                src={l.photo}
                alt={l.title}
                className="w-24 h-24 rounded-xl object-cover flex-none"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
                    {isTable ? `🍽 ${t("map.table")}` : `🛍 ${t("map.market")}`}
                  </span>
                  <span className="text-xs text-ink/60">★ {l.host_rating.toFixed(2)}</span>
                </div>
                <div className="font-display font-bold text-lg leading-tight truncate">
                  {l.title}
                </div>
                <div className="text-xs text-ink/60 mb-1.5">{l.location_display}</div>
                <div className="flex flex-wrap gap-1">
                  {(isTable
                    ? (l as { cuisine_tags: string[] }).cuisine_tags
                    : (l as { product_type_tags: string[] }).product_type_tags
                  )
                    .slice(0, 2)
                    .map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  {l.dietary_tags.slice(0, 1).map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              </div>
              <div className="flex-none text-right">
                <div className="font-display font-extrabold text-xl leading-none">
                  {l.currency}
                  {l.price_per_unit}
                </div>
                <div className="text-[11px] text-ink/60 mt-1">
                  {isTable ? t("map.perSeat") : t("map.perUnit")}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
