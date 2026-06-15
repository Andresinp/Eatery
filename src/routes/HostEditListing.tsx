import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useHost } from "../store/hostListings";
import type { TableListing, MarketListing } from "../types";

const DINING_SETTINGS = ["Indoor Table", "Garden", "Terrace", "Rooftop", "Open Kitchen"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold">{label}</span>
        {hint && <span className="text-[11px] text-ink/50">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export default function HostEditListing() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const listing = useHost((s) => s.getById(id));
  const update = useHost((s) => s.update);

  const isTable = listing?.listing_type === "table";
  const tl = listing as TableListing | undefined;
  const ml = listing as MarketListing | undefined;

  const parseMealTime = (mt: string) => {
    const sep = mt.lastIndexOf(", ");
    if (sep === -1) return { date: "", time: mt };
    return { date: mt.slice(0, sep), time: mt.slice(sep + 2) };
  };

  const mealParts = tl ? parseMealTime(tl.meal_time) : { date: "", time: "" };
  const pickupTime = (w: string | undefined) => w?.split(" ").pop() ?? "";
  const pickupDate = (w: string | undefined) => w?.split(" ").slice(0, -1).join(" ") ?? "";

  const [form, setForm] = useState({
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    photo: listing?.photo ?? "",
    price_per_unit: listing?.price_per_unit ?? 0,
    meal_date: mealParts.date,
    meal_time: mealParts.time,
    seats_total: tl?.seats_total ?? 0,
    dining_setting: tl?.dining_setting ?? "",
    quantity_total: ml?.quantity_total ?? 0,
    pickup_date: pickupDate(ml?.pickup_window_start),
    pickup_start: pickupTime(ml?.pickup_window_start),
    pickup_end: pickupTime(ml?.pickup_window_end),
  });

  if (!listing) {
    return (
      <div className="min-h-full">
        <TopBar back title="Edit listing" />
        <div className="p-6 text-ink/70">Listing not found.</div>
      </div>
    );
  }

  const save = () => {
    const patch: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      photo: form.photo,
      price_per_unit: form.price_per_unit,
    };
    if (isTable) {
      patch.meal_time = `${form.meal_date || "Soon"}, ${form.meal_time}`;
      patch.seats_total = form.seats_total;
      patch.dining_setting = form.dining_setting;
    } else {
      patch.quantity_total = form.quantity_total;
      patch.pickup_window_start = `${form.pickup_date || "Sat"} ${form.pickup_start}`;
      patch.pickup_window_end = `${form.pickup_date || "Sat"} ${form.pickup_end}`;
    }
    update(id, patch);
    nav(`/host/listing/${id}`);
  };

  const inp = "w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink";

  return (
    <div className="min-h-full bg-cream-50 pb-32">
      <TopBar back title="Edit listing" />

      <div className="max-w-[640px] mx-auto px-4 pt-4 space-y-5">
        <Field label="Title">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inp}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className={inp + " resize-none"}
          />
        </Field>

        <Field label="Cover photo URL">
          <input
            value={form.photo}
            onChange={(e) => setForm({ ...form, photo: e.target.value })}
            className={inp}
          />
          {form.photo && (
            <img src={form.photo} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-xl border border-ink/15" />
          )}
        </Field>

        <Field label={isTable ? "Price per seat (€)" : "Price per unit (€)"}>
          <input
            type="number"
            min={1}
            value={form.price_per_unit}
            onChange={(e) => setForm({ ...form, price_per_unit: Math.max(0, Number(e.target.value)) })}
            className={inp}
          />
        </Field>

        {isTable ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  value={form.meal_date}
                  onChange={(e) => setForm({ ...form, meal_date: e.target.value })}
                  className={inp}
                />
              </Field>
              <Field label="Arrival time">
                <input
                  type="time"
                  value={form.meal_time}
                  onChange={(e) => setForm({ ...form, meal_time: e.target.value })}
                  className={inp}
                />
              </Field>
            </div>
            <Field label="Seats available">
              <input
                type="number"
                min={1}
                max={20}
                value={form.seats_total}
                onChange={(e) => setForm({ ...form, seats_total: Math.max(1, Number(e.target.value)) })}
                className={inp}
              />
            </Field>
            <Field label="Dining setting">
              <div className="flex flex-wrap gap-1.5">
                {DINING_SETTINGS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, dining_setting: s })}
                  >
                    <span className={"chip " + (form.dining_setting === s ? "chip-amber" : "")}>
                      {s}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label="Quantity available">
              <input
                type="number"
                min={1}
                value={form.quantity_total}
                onChange={(e) => setForm({ ...form, quantity_total: Math.max(1, Number(e.target.value)) })}
                className={inp}
              />
            </Field>
            <Field label="Pickup day">
              <input
                type="date"
                value={form.pickup_date}
                onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
                className={inp}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup from">
                <input
                  type="time"
                  value={form.pickup_start}
                  onChange={(e) => setForm({ ...form, pickup_start: e.target.value })}
                  className={inp}
                />
              </Field>
              <Field label="Pickup until">
                <input
                  type="time"
                  value={form.pickup_end}
                  onChange={(e) => setForm({ ...form, pickup_end: e.target.value })}
                  className={inp}
                />
              </Field>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-cream-50/95 border-t border-ink/10">
        <div className="max-w-[640px] mx-auto">
          <button
            onClick={save}
            disabled={!form.title.trim()}
            className="w-full py-3.5 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold disabled:opacity-40"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
