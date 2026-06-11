import { Chip } from "./Chip";

const DIETARY = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free"];
const CUISINES = ["Moroccan", "Italian", "Japanese", "Spanish", "Lebanese", "Mexican", "Indian", "Turkish", "French", "Greek"];
const PRODUCT_TYPES = ["Baked Goods", "Bread", "Cake", "Frozen Meals", "Jam & Preserves", "Pasta", "Desserts"];
const TIMES = ["Breakfast", "Brunch", "Lunch", "Dinner", "Late Night"];

export default function FilterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        className={
          "fixed inset-0 bg-ink/40 z-40 transition-opacity " +
          (open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        onClick={onClose}
      />
      <aside
        className={
          "fixed top-0 right-0 bottom-0 z-50 w-full max-w-[440px] bg-cream-50 border-l-2 border-ink shadow-sheet transition-transform " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10">
          <div className="font-display font-extrabold text-2xl">Filters</div>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="w-9 h-9 rounded-full border-2 border-ink grid place-items-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-72px-72px)] px-5 py-5 space-y-6">
          <Section title="Listing Type">
            <div className="flex gap-2">
              <Chip variant="amber">All</Chip>
              <Chip>🍽 Table only</Chip>
              <Chip>🛍 Market only</Chip>
            </div>
          </Section>

          <Section title="Dietary requirements">
            <div className="flex flex-wrap gap-1.5">
              {DIETARY.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </Section>

          <Section title="Budget" hint="€3 — €100+">
            <input type="range" min={3} max={100} defaultValue={30} className="w-full accent-amber" />
          </Section>

          <Section title="Cuisine">
            <div className="flex flex-wrap gap-1.5">
              {CUISINES.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </Section>

          <Section title="Product type">
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_TYPES.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </Section>

          <Section title="Time (Tables)">
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </Section>
        </div>

        <div className="absolute left-0 right-0 bottom-0 px-5 py-4 border-t border-ink/10 bg-cream-50 flex items-center gap-3">
          <button className="flex-1 py-3 rounded-2xl border-2 border-ink font-semibold">
            Clear
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
          >
            Show results
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display font-bold text-base">{title}</h3>
        {hint && <span className="text-xs text-ink/50">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
