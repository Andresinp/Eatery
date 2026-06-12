import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import TopBar from "../components/TopBar";
import { Chip } from "../components/Chip";
import { useHost, ME } from "../store/hostListings";
import { detectAllergensAI, generateDescriptionAI } from "../lib/ai";
import { MAP_CENTER } from "../data/mockListings";
import type { Listing, ListingType } from "../types";

const CUISINES = ["Moroccan", "Italian", "Japanese", "Spanish", "Lebanese", "Mexican", "Indian", "Turkish", "French", "Greek", "Chinese", "Fusion"];
const PRODUCT_TYPES = ["Baked Goods", "Bread", "Cake", "Frozen Meals", "Jam & Preserves", "Pasta", "Desserts", "Soups"];
const DIETARY = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free"];
const ALLERGEN_CATEGORIES = ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Sesame", "Mustard", "Celery", "Sulphites", "Molluscs"];
const DINING_SETTINGS = ["Indoor Table", "Garden", "Terrace", "Rooftop", "Open Kitchen"];

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80";

interface Draft {
  listing_type: ListingType;
  title: string;
  description: string;
  photo: string;
  category_tags: string[];
  dietary_tags: string[];
  allergen_flags: string[];
  price_per_unit: number;
  // Table-only
  meal_date: string;
  meal_time: string;
  seats_total: number;
  dining_setting: string;
  // Market-only
  quantity_total: number;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  // Location
  lat: number;
  lng: number;
  neighborhood: string;
  exact_address: string;
}

const empty: Draft = {
  listing_type: "table",
  title: "",
  description: "",
  photo: DEFAULT_PHOTO,
  category_tags: [],
  dietary_tags: [],
  allergen_flags: [],
  price_per_unit: 20,
  meal_date: "",
  meal_time: "20:30",
  seats_total: 6,
  dining_setting: "Indoor Table",
  quantity_total: 12,
  pickup_date: "",
  pickup_start: "10:00",
  pickup_end: "13:00",
  lat: MAP_CENTER[1],
  lng: MAP_CENTER[0],
  neighborhood: "Malasaña, Madrid",
  exact_address: "",
};

export default function HostNew() {
  const nav = useNavigate();
  const add = useHost((s) => s.add);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(empty);

  const totalSteps = 6;
  const canNext =
    step === 0 ? true :
    step === 1 ? d.title.trim().length > 1 && d.description.trim().length > 5 && d.category_tags.length > 0 :
    step === 2 ? true :
    step === 3 ? d.price_per_unit > 0 :
    step === 4 ? true :
    true;

  const publish = () => {
    const id = `mine_${Math.random().toString(36).slice(2, 9)}`;
    const isTable = d.listing_type === "table";
    const base = {
      id,
      host_id: ME.id,
      host_name: ME.name,
      host_avatar: ME.avatar,
      host_rating: ME.rating,
      host_verified: ME.verified,
      title: d.title.trim(),
      description: d.description.trim(),
      photo: d.photo,
      dietary_tags: d.dietary_tags,
      allergen_flags: d.allergen_flags,
      price_per_unit: d.price_per_unit,
      currency: "€",
      location_lat: d.lat,
      location_lng: d.lng,
      location_display: d.neighborhood || "Madrid",
    };
    const listing: Listing = isTable
      ? {
          ...base,
          listing_type: "table",
          cuisine_tags: d.category_tags,
          meal_time: `${d.meal_date || "Soon"}, ${d.meal_time}`,
          seats_total: d.seats_total,
          seats_available: d.seats_total,
          dining_setting: d.dining_setting,
        }
      : {
          ...base,
          listing_type: "market",
          cuisine_tags: [],
          product_type_tags: d.category_tags,
          quantity_total: d.quantity_total,
          quantity_available: d.quantity_total,
          pickup_window_start: `${d.pickup_date || "Sat"} ${d.pickup_start}`,
          pickup_window_end: `${d.pickup_date || "Sat"} ${d.pickup_end}`,
        };
    add(listing);
    nav(`/host/listing/${id}`);
  };

  return (
    <div className="min-h-full bg-cream-50 pb-32">
      <TopBar back title="Post a listing" />

      <div className="max-w-[640px] mx-auto px-4 pt-2">
        <Stepper step={step} total={totalSteps} />

        {step === 0 && <Step0Type d={d} setD={setD} />}
        {step === 1 && <Step1Food d={d} setD={setD} />}
        {step === 2 && <Step2AI d={d} setD={setD} />}
        {step === 3 && <Step3Logistics d={d} setD={setD} />}
        {step === 4 && <Step4Location d={d} setD={setD} />}
        {step === 5 && <Step5Preview d={d} />}
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-30 p-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pt-8">
        <div className="max-w-[640px] mx-auto flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3.5 rounded-2xl border-2 border-ink font-semibold"
            >
              Back
            </button>
          ) : (
            <Link
              to="/host"
              className="flex-1 py-3.5 rounded-2xl border-2 border-ink font-semibold text-center"
            >
              Cancel
            </Link>
          )}
          {step < totalSteps - 1 ? (
            <button
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3.5 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={publish}
              className="flex-1 py-3.5 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold"
            >
              Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1 my-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={
            "h-1.5 flex-1 rounded-full " +
            (i <= step ? "bg-ink" : "bg-ink/15")
          }
        />
      ))}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h2 className="font-display font-extrabold text-2xl leading-tight">{title}</h2>
        {hint && <p className="text-sm text-ink/60 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ChipToggle({ tags, value, onChange, variant }: { tags: string[]; value: string[]; onChange: (next: string[]) => void; variant?: "amber" | "leaf" }) {
  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => {
        const on = value.includes(t);
        return (
          <button key={t} type="button" onClick={() => toggle(t)}>
            <span
              className={
                "chip " +
                (on
                  ? variant === "leaf"
                    ? "chip-leaf"
                    : "chip-amber"
                  : "")
              }
            >
              {on && <span>✓</span>}
              {t}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Step0Type({ d, setD }: { d: Draft; setD: (n: Draft) => void }) {
  return (
    <div className="space-y-5">
      <Section title="What are you sharing today?" hint="You can post both — one at a time." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TypeCard
          active={d.listing_type === "table"}
          onClick={() => setD({ ...d, listing_type: "table" })}
          emoji="🍽"
          title="Host a Table"
          desc="Open seats at your table for a shared home-cooked meal."
          variant="amber"
        />
        <TypeCard
          active={d.listing_type === "market"}
          onClick={() => setD({ ...d, listing_type: "market" })}
          emoji="🛍"
          title="Sell a Product"
          desc="Sell something you made — cakes, bread, jars, frozen meals."
          variant="leaf"
        />
      </div>
    </div>
  );
}

function TypeCard({ active, onClick, emoji, title, desc, variant }: { active: boolean; onClick: () => void; emoji: string; title: string; desc: string; variant: "amber" | "leaf" }) {
  return (
    <button
      onClick={onClick}
      className={
        "text-left p-5 rounded-3xl border-2 transition " +
        (active
          ? variant === "amber"
            ? "border-ink bg-amber shadow-float"
            : "border-ink bg-leaf shadow-float"
          : "border-ink/30 bg-white hover:border-ink")
      }
    >
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="font-display font-extrabold text-xl">{title}</div>
      <div className="text-sm text-ink/75 mt-1">{desc}</div>
    </button>
  );
}

function Step1Food({ d, setD }: { d: Draft; setD: (n: Draft) => void }) {
  const isTable = d.listing_type === "table";
  const [generating, setGenerating] = useState(false);
  const [genSource, setGenSource] = useState<"claude" | "fallback" | null>(null);

  const generate = async () => {
    setGenerating(true);
    setGenSource(null);
    try {
      const { description, source } = await generateDescriptionAI({
        title: d.title,
        listing_type: d.listing_type,
        ingredients: d.description,
        cuisine: d.category_tags[0],
      });
      setD({ ...d, description });
      setGenSource(source);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Section title="The food" hint="Make it sound like what you'd cook for friends." />

      <div className="space-y-3">
        <Field label="Title">
          <input
            value={d.title}
            onChange={(e) => setD({ ...d, title: e.target.value })}
            placeholder={isTable ? "Chicken Tagine & Mint Tea" : "Lemon-Olive Oil Cake"}
            className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={d.description}
            onChange={(e) => setD({ ...d, description: e.target.value })}
            rows={4}
            placeholder="Slow-cooked Moroccan tagine with preserved lemon and olives..."
            className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink resize-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={generate}
              disabled={generating || d.title.trim().length < 2}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink bg-cream-50 text-sm font-semibold disabled:opacity-40 hover:bg-amber/20"
            >
              {generating ? "Writing…" : "✨ Help me write a description"}
            </button>
            {genSource && (
              <span className="text-[11px] text-ink/50">
                {genSource === "claude"
                  ? "Generated by Claude"
                  : "Local stub — set up the ai-describe Edge Function for the real thing"}
              </span>
            )}
          </div>
        </Field>

        <Field label="Cover photo URL" hint="Image upload coming with Supabase Storage">
          <input
            value={d.photo}
            onChange={(e) => setD({ ...d, photo: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
          />
          {d.photo && (
            <img src={d.photo} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-xl border border-ink/15" />
          )}
        </Field>

        <Field label={isTable ? "Cuisine" : "Product type"}>
          <ChipToggle
            tags={isTable ? CUISINES : PRODUCT_TYPES}
            value={d.category_tags}
            onChange={(next) => setD({ ...d, category_tags: next })}
            variant={isTable ? "amber" : "leaf"}
          />
        </Field>

        <Field label="Dietary tags">
          <ChipToggle
            tags={DIETARY}
            value={d.dietary_tags}
            onChange={(next) => setD({ ...d, dietary_tags: next })}
          />
        </Field>
      </div>
    </div>
  );
}

function Step2AI({ d, setD }: { d: Draft; setD: (n: Draft) => void }) {
  const [result, setResult] = useState<{
    allergens: string[];
    dietary: string[];
    source: "claude" | "local";
  } | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const r = await detectAllergensAI({ title: d.title, description: d.description });
      setResult(r);
      const merged = Array.from(new Set([...d.allergen_flags, ...r.allergens]));
      setD({ ...d, allergen_flags: merged });
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (result === null) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <Section
        title="Allergen check"
        hint="We scanned your description. Add or remove flags before publishing."
      />

      {running && (
        <div className="rounded-2xl border border-ink/15 bg-white p-4 text-sm text-ink/60">
          Scanning ingredients…
        </div>
      )}

      {!running && result && (
        <>
          <div className="rounded-2xl border-2 border-amber/60 bg-amber/15 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="font-display font-bold text-amber-ink">⚠ We detected</div>
              <span className="text-[11px] text-amber-ink/60">
                {result.source === "claude" ? "Scanned by Claude" : "Local keyword scan"}
              </span>
            </div>
            {result.allergens.length === 0 ? (
              <div className="text-sm text-amber-ink/80">
                Nothing flagged — but double-check the list below to be sure.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {result.allergens.map((a) => (
                  <Chip key={a} variant="amber">
                    {a}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {result.dietary.length > 0 && (
            <div className="rounded-2xl border-2 border-leaf/60 bg-leaf/15 p-4">
              <div className="font-display font-bold text-leaf-ink mb-2">
                Looks like this could be
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.dietary.map((t) => {
                  const on = d.dietary_tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setD({
                          ...d,
                          dietary_tags: on
                            ? d.dietary_tags.filter((x) => x !== t)
                            : [...d.dietary_tags, t],
                        })
                      }
                    >
                      <span className={"chip " + (on ? "chip-leaf" : "")}>
                        {on && "✓ "}
                        {t}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Field label="All allergens present" hint="Tap to add or remove. Your call is final.">
        <ChipToggle
          tags={ALLERGEN_CATEGORIES}
          value={d.allergen_flags}
          onChange={(next) => setD({ ...d, allergen_flags: next })}
        />
      </Field>

      <button
        onClick={run}
        className="text-sm font-semibold text-ink/70 hover:text-ink underline-offset-4 hover:underline"
      >
        Re-run check
      </button>
    </div>
  );
}

function Step3Logistics({ d, setD }: { d: Draft; setD: (n: Draft) => void }) {
  const isTable = d.listing_type === "table";
  return (
    <div className="space-y-5">
      <Section
        title="Logistics"
        hint={isTable ? "When, how many, and where you'll seat them." : "How many you're making, and when guests can come pick up."}
      />

      <Field label={isTable ? "Price per seat (€)" : "Price per unit (€)"}>
        <input
          type="number"
          min={1}
          value={d.price_per_unit}
          onChange={(e) => setD({ ...d, price_per_unit: Math.max(0, Number(e.target.value)) })}
          className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
        />
      </Field>

      {isTable ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                value={d.meal_date}
                onChange={(e) => setD({ ...d, meal_date: e.target.value })}
                placeholder="Sat"
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
            <Field label="Arrival time">
              <input
                type="time"
                value={d.meal_time}
                onChange={(e) => setD({ ...d, meal_time: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
          </div>
          <Field label="Seats available">
            <input
              type="number"
              min={1}
              max={20}
              value={d.seats_total}
              onChange={(e) => setD({ ...d, seats_total: Math.max(1, Number(e.target.value)) })}
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label="Dining setting">
            <div className="flex flex-wrap gap-1.5">
              {DINING_SETTINGS.map((s) => (
                <button key={s} onClick={() => setD({ ...d, dining_setting: s })}>
                  <span
                    className={
                      "chip " + (d.dining_setting === s ? "chip-amber" : "")
                    }
                  >
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
              value={d.quantity_total}
              onChange={(e) => setD({ ...d, quantity_total: Math.max(1, Number(e.target.value)) })}
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label="Pickup day">
            <input
              value={d.pickup_date}
              onChange={(e) => setD({ ...d, pickup_date: e.target.value })}
              placeholder="Sat"
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pickup from">
              <input
                type="time"
                value={d.pickup_start}
                onChange={(e) => setD({ ...d, pickup_start: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
            <Field label="Pickup until">
              <input
                type="time"
                value={d.pickup_end}
                onChange={(e) => setD({ ...d, pickup_end: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

function Step4Location({ d, setD }: { d: Draft; setD: (n: Draft) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [d.lng, d.lat],
      zoom: 13.5,
    });
    mapRef.current = map;
    const el = document.createElement("div");
    el.className = "pin pin-amber";
    el.innerHTML = `<span class="dot">📍</span><span>Drag me</span>`;
    const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" })
      .setLngLat([d.lng, d.lat])
      .addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      setD({ ...d, lng: ll.lng, lat: ll.lat });
    });
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <Section
        title="Where are you?"
        hint="Drag the pin to your spot. Guests see only the neighborhood until they book."
      />

      <div className="rounded-3xl overflow-hidden border-2 border-ink/90 h-72">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <Field label="Neighborhood (shown publicly)">
        <input
          value={d.neighborhood}
          onChange={(e) => setD({ ...d, neighborhood: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
        />
      </Field>

      <Field label="Exact address (revealed after confirmed orders)">
        <input
          value={d.exact_address}
          onChange={(e) => setD({ ...d, exact_address: e.target.value })}
          placeholder="Calle del Pez 14, 3º Izq"
          className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
        />
      </Field>
    </div>
  );
}

function Step5Preview({ d }: { d: Draft }) {
  const isTable = d.listing_type === "table";
  const deposit = Math.round(d.price_per_unit * 0.12 * 100) / 100;
  return (
    <div className="space-y-5">
      <Section title="Preview" hint="This is what guests will see." />

      <div className="rounded-3xl overflow-hidden border-2 border-ink/90 bg-white">
        <div className="relative h-48">
          <img src={d.photo} alt={d.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute left-3 top-3">
            <span className={"chip " + (isTable ? "chip-amber" : "chip-leaf")}>
              {isTable ? "🍽 Table" : "🛍 Market"}
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="font-display font-extrabold text-2xl leading-tight">{d.title || "Untitled"}</div>
            <div className="text-xs text-ink/60">{d.neighborhood}</div>
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">{d.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {d.category_tags.map((t) => <Chip key={t}>{t}</Chip>)}
            {d.dietary_tags.map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
          {d.allergen_flags.length > 0 && (
            <div className="rounded-2xl border border-amber/60 bg-amber/10 px-3 py-2 text-xs text-amber-ink">
              <span className="font-semibold">⚠ Contains:</span>{" "}
              {d.allergen_flags.join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-ink/90 bg-amber/15 p-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-ink/80">Per {isTable ? "seat" : "unit"}</span>
          <span className="font-display font-extrabold text-lg">€{d.price_per_unit}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Guest deposit (we collect)</span>
          <span>€{deposit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Balance — paid to you in person</span>
          <span>€{(d.price_per_unit - deposit).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

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
