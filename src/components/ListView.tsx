import { Link } from "react-router-dom";
import type { Listing } from "../types";

function formatTag(tag: string): string {
  return tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ListView({ listings }: { listings: Listing[] }) {
  return (
    <div className="absolute inset-0 z-10 bg-cream-50 overflow-y-auto animate-fade-in">
      <div className="max-w-[640px] mx-auto px-4 pt-24 pb-32 divide-y divide-ink/[0.07]">
        {listings.map((l) => {
          const isTable = l.listing_type === "table";
          const primaryTags = isTable
            ? (l as { cuisine_tags: string[] }).cuisine_tags.slice(0, 2)
            : (l as { product_type_tags: string[] }).product_type_tags.slice(0, 2);
          const tags = [...primaryTags, ...l.dietary_tags.slice(0, 1)];

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
                <div className="font-display font-bold text-[15px] leading-snug mb-0.5 truncate">
                  {l.title}
                </div>
                <div className="text-xs text-ink/50 mb-2 truncate">{l.location_display}</div>
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
