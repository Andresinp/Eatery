import { useMemo } from "react";
import { Chip } from "./Chip";
import {
  useFilters,
  applyFilters,
  countWithOption,
  getMealTimeCategory,
  MAX_BUDGET,
  type FilterCriteria,
} from "../store/filters";
import { useT } from "../i18n";
import type { Listing } from "../types";

const ALL_MEAL_TIMES = ["Breakfast", "Brunch", "Lunch", "Dinner", "Late Night"];

/** Local date as YYYY-MM-DD, for <input type="date"> and the "custom" mode. */
function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function FilterPanel({
  open,
  onClose,
  listings,
}: {
  open: boolean;
  onClose: () => void;
  listings: Listing[];
}) {
  const t = useT();
  const {
    listingType, dietary, cuisines, productTypes, mealTimes, maxBudget, dateMode, customDate,
    setListingType, toggleDietary, toggleCuisine, toggleProductType, toggleMealTime,
    setMaxBudget, setDate, clearAll,
  } = useFilters();

  // The exact criteria the map/list use — counts below are derived from this so
  // a chip's badge always equals the result count after selecting it.
  const criteria: FilterCriteria = {
    listingType, dietary, cuisines, productTypes, mealTimes, maxBudget, dateMode, customDate,
  };

  // Derive available options + counts from the full listing set (context-aware)
  const available = useMemo(() => {
    const dietaryMap = new Map<string, number>();
    const cuisineMap = new Map<string, number>();
    const productMap = new Map<string, number>();
    const timeMap = new Map<string, number>();

    listings.forEach((l) => {
      l.dietary_tags.forEach((d) => dietaryMap.set(d, (dietaryMap.get(d) ?? 0) + 1));
      l.cuisine_tags.forEach((c) => cuisineMap.set(c, (cuisineMap.get(c) ?? 0) + 1));
      if (l.listing_type === "market") {
        l.product_type_tags.forEach((p) => productMap.set(p, (productMap.get(p) ?? 0) + 1));
      }
      if (l.listing_type === "table") {
        getMealTimeCategory(l.meal_time).forEach((tm) => timeMap.set(tm, (timeMap.get(tm) ?? 0) + 1));
      }
    });

    return { dietaryMap, cuisineMap, productMap, timeMap };
  }, [listings]);

  const resultCount = useMemo(
    () => applyFilters(listings, criteria).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listings, listingType, dietary, cuisines, productTypes, mealTimes, maxBudget, dateMode, customDate],
  );

  const hasActiveFilters =
    listingType !== "all" ||
    dietary.length > 0 ||
    cuisines.length > 0 ||
    productTypes.length > 0 ||
    mealTimes.length > 0 ||
    maxBudget < MAX_BUDGET ||
    dateMode !== "any";

  const dateOptions: { mode: "today" | "week" | "custom"; label: string }[] = [
    { mode: "today", label: t("filters.dateToday") },
    { mode: "week", label: t("filters.dateWeek") },
    { mode: "custom", label: t("filters.dateChoose") },
  ];

  const budgetLabel = maxBudget >= MAX_BUDGET ? `€3 — €${MAX_BUDGET}+` : `€3 — €${maxBudget}`;

  const typeOptions: { value: "all" | "table" | "market"; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: "table", label: t("filters.tableOnly") },
    { value: "market", label: t("filters.marketOnly") },
  ];

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
          <div className="font-display font-extrabold text-2xl">{t("filters.title")}</div>
          <button
            onClick={onClose}
            aria-label={t("filters.close")}
            className="w-9 h-9 rounded-full border-2 border-ink grid place-items-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-72px-72px)] px-5 py-5 space-y-6">
          <Section title={t("filters.date")}>
            <div className="flex gap-2 flex-wrap">
              {dateOptions.map(({ mode, label }) => (
                <Chip
                  key={mode}
                  active={dateMode === mode}
                  onClick={() =>
                    dateMode === mode
                      ? setDate("any")
                      : setDate(mode, mode === "custom" ? (customDate ?? todayISO()) : null)
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>
            {dateMode === "custom" && (
              <input
                type="date"
                value={customDate ?? todayISO()}
                onChange={(e) => setDate("custom", e.target.value)}
                className="mt-3 w-full rounded-2xl border-2 border-ink bg-cream-50 px-3 py-2 font-semibold"
              />
            )}
          </Section>

          <Section title={t("filters.listingType")}>
            <div className="flex gap-2 flex-wrap">
              {typeOptions.map(({ value, label }) => (
                <Chip
                  key={value}
                  active={listingType === value}
                  onClick={() => setListingType(value)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Section>

          {available.dietaryMap.size > 0 && (
            <Section title={t("filters.dietary")}>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(available.dietaryMap.keys()).map((tag) => (
                  <Chip
                    key={tag}
                    active={dietary.includes(tag)}
                    onClick={() => toggleDietary(tag)}
                    count={countWithOption(listings, criteria, "dietary", tag)}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          <Section title={t("filters.budget")} hint={budgetLabel}>
            <input
              type="range"
              min={3}
              max={MAX_BUDGET}
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="w-full accent-amber"
            />
          </Section>

          {available.cuisineMap.size > 0 && (
            <Section title={t("filters.cuisine")}>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(available.cuisineMap.keys()).map((tag) => (
                  <Chip
                    key={tag}
                    active={cuisines.includes(tag)}
                    onClick={() => toggleCuisine(tag)}
                    count={countWithOption(listings, criteria, "cuisines", tag)}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          {available.productMap.size > 0 && (
            <Section title={t("filters.productType")}>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(available.productMap.keys()).map((tag) => (
                  <Chip
                    key={tag}
                    active={productTypes.includes(tag)}
                    onClick={() => toggleProductType(tag)}
                    count={countWithOption(listings, criteria, "productTypes", tag)}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          {available.timeMap.size > 0 && (
            <Section title={t("filters.timeTables")}>
              <div className="flex flex-wrap gap-1.5">
                {ALL_MEAL_TIMES.filter((tm) => available.timeMap.has(tm)).map((tm) => (
                  <Chip
                    key={tm}
                    active={mealTimes.includes(tm)}
                    onClick={() => toggleMealTime(tm)}
                    count={countWithOption(listings, criteria, "mealTimes", tm)}
                  >
                    {tm}
                  </Chip>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="absolute left-0 right-0 bottom-0 px-5 py-4 border-t border-ink/10 bg-cream-50 flex items-center gap-3">
          <button
            onClick={clearAll}
            disabled={!hasActiveFilters}
            className={
              "flex-1 py-3 rounded-2xl border-2 border-ink font-semibold transition-opacity " +
              (hasActiveFilters ? "opacity-100 cursor-pointer" : "opacity-30 cursor-default")
            }
          >
            {t("filters.clear")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
          >
            {resultCount === 0
              ? t("filters.showResults")
              : `${t("filters.showResults")} (${resultCount})`}
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
