import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import TopBar from "../components/TopBar";
import { Chip } from "../components/Chip";
import CurrencyPicker from "../components/CurrencyPicker";
import { useHost } from "../store/hostListings";
import { useProfile } from "../store/profile";
import { useSession } from "../store/session";
import { createListing } from "../lib/db";
import { detectAllergensAI, generateDescriptionAI } from "../lib/ai";
import { MAP_STYLE_URL, reverseGeocode } from "../lib/map";
import { MAP_CENTER } from "../data/mockListings";
import { useT } from "../i18n";
import type { Listing, ListingType } from "../types";

const CUISINES = ["Moroccan", "Italian", "Japanese", "Spanish", "Lebanese", "Mexican", "Indian", "Turkish", "French", "Greek", "Chinese", "Fusion"];
const PRODUCT_TYPES = ["Baked Goods", "Bread", "Cake", "Frozen Meals", "Jam & Preserves", "Pasta", "Desserts", "Soups"];
const DIETARY = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free"];
const ALLERGEN_CATEGORIES = ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Sesame", "Mustard", "Celery", "Sulphites", "Molluscs"];
const DINING_SETTINGS = ["Indoor Table", "Garden", "Terrace", "Rooftop", "Open Kitchen"];
const DRINK_OPTIONS = ["Water", "Tea", "Coffee", "Juice", "Soda / Coca-Cola", "Beer", "Wine", "Cocktail"];

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
  currency: string;
  // Table-only
  meal_date: string;
  meal_time: string;
  meal_end: string;
  seats_total: number;
  dining_setting: string;
  dining_setting_photos: string[];
  drinks_included: boolean;
  drinks: string[];
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
  currency: "€",
  meal_date: "",
  meal_time: "20:30",
  meal_end: "23:00",
  seats_total: 6,
  dining_setting: "Indoor Table",
  dining_setting_photos: [],
  drinks_included: false,
  drinks: [],
  quantity_total: 12,
  pickup_date: "",
  pickup_start: "10:00",
  pickup_end: "13:00",
  lat: MAP_CENTER[1],
  lng: MAP_CENTER[0],
  neighborhood: "Malasaña, Madrid",
  exact_address: "",
};

// "20:30" + "23:00" -> "2h 30m". Handles events that run past midnight.
function durationLabel(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "";
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
}

export default function HostNew() {
  const nav = useNavigate();
  const add = useHost((s) => s.add);
  const profile = useProfile((s) => s.me);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(empty);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  // Stable idempotency key for this form session — prevents duplicate DB rows
  // if the user taps Publish multiple times before the request completes.
  const uid = useId();
  const idempotencyKey = useRef(`${uid}-${Date.now()}`).current;

  const totalSteps = 6;
  const canNext =
    step === 0 ? true :
    step === 1 ? d.title.trim().length > 1 && d.description.trim().length > 5 :
    step === 2 ? true :
    step === 3 ? d.price_per_unit > 0 && (d.listing_type !== "table" || d.dining_setting_photos.length > 0) :
    step === 4 ? true :
    true;

  const formatDate = (isoDate: string, fallback = "Soon") => {
    if (!isoDate) return fallback;
    try {
      const dt = new Date(isoDate + "T00:00:00");
      return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    } catch {
      return isoDate;
    }
  };

  const toDiningSetting = (s: string): "indoor_table" | "garden" | "terrace" | "rooftop" | "open_kitchen" => {
    const map: Record<string, "indoor_table" | "garden" | "terrace" | "rooftop" | "open_kitchen"> = {
      "Indoor Table": "indoor_table",
      Garden: "garden",
      Terrace: "terrace",
      Rooftop: "rooftop",
      "Open Kitchen": "open_kitchen",
    };
    return map[s] ?? "indoor_table";
  };

  const publish = async () => {
    if (publishing) return; // guard against rapid taps
    setPublishing(true);
    setPublishError(null);

    const isTable = d.listing_type === "table";
    let id = `mine_${Math.random().toString(36).slice(2, 9)}`;

    const sessionUser = useSession.getState().user;
    if (sessionUser) {
      try {
        id = await createListing({
          host_id: sessionUser.id,
          listing_type: d.listing_type,
          title: d.title.trim(),
          description: d.description.trim(),
          photo: d.photo,
          cuisine_tags: isTable ? d.category_tags : [],
          product_type_tags: isTable ? [] : d.category_tags,
          dietary_tags: d.dietary_tags,
          allergen_flags: d.allergen_flags,
          price_per_unit: d.price_per_unit,
          location_lat: d.lat,
          location_lng: d.lng,
          location_display: d.neighborhood || "Madrid",
          exact_address: d.exact_address || undefined,
          idempotency_key: idempotencyKey,
          ...(isTable
            ? {
                meal_time: d.meal_date ? `${d.meal_date}T${d.meal_time}:00` : undefined,
                meal_end_time: d.meal_date && d.meal_end ? `${d.meal_date}T${d.meal_end}:00` : undefined,
                seats_total: d.seats_total,
                dining_setting: toDiningSetting(d.dining_setting),
                drinks_included: d.drinks_included,
                drinks: d.drinks_included ? d.drinks : [],
              }
            : {
                quantity_total: d.quantity_total,
                pickup_window_start: d.pickup_date ? `${d.pickup_date}T${d.pickup_start}:00` : undefined,
                pickup_window_end: d.pickup_date ? `${d.pickup_date}T${d.pickup_end}:00` : undefined,
              }),
        });
      } catch (err) {
        console.error("Failed to save listing to database:", err);
        setPublishing(false);
        setPublishError("Something went wrong. Please try again.");
        return;
      }
    }

    const base = {
      id,
      host_id: sessionUser?.id ?? profile.id,
      host_name: profile.name || "Host",
      host_avatar: profile.avatar,
      host_rating: 0,
      host_verified: profile.identity_verified,
      title: d.title.trim(),
      description: d.description.trim(),
      photo: d.photo,
      dietary_tags: d.dietary_tags,
      allergen_flags: d.allergen_flags,
      price_per_unit: d.price_per_unit,
      currency: d.currency,
      location_lat: d.lat,
      location_lng: d.lng,
      location_display: d.neighborhood || "Madrid",
    };
    const listing: Listing = isTable
      ? {
          ...base,
          listing_type: "table",
          cuisine_tags: d.category_tags,
          meal_time: `${formatDate(d.meal_date)}, ${d.meal_time}–${d.meal_end}`,
          meal_end_time: d.meal_end,
          seats_total: d.seats_total,
          seats_available: d.seats_total,
          dining_setting: d.dining_setting,
          dining_setting_photos: d.dining_setting_photos,
          drinks_included: d.drinks_included,
          drinks: d.drinks_included ? d.drinks : [],
        }
      : {
          ...base,
          listing_type: "market",
          cuisine_tags: [],
          product_type_tags: d.category_tags,
          quantity_total: d.quantity_total,
          quantity_available: d.quantity_total,
          pickup_window_start: `${formatDate(d.pickup_date, "Sat")} ${d.pickup_start}`,
          pickup_window_end: `${formatDate(d.pickup_date, "Sat")} ${d.pickup_end}`,
        };
    add(listing);
    nav(`/host/listing/${id}`);
  };

  return (
    <div className="min-h-full bg-cream-50 pb-32">
      <TopBar back title={d.listing_type === "table" ? "Post a Table" : "Post a listing"} />

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
        {publishError && (
          <div className="max-w-[640px] mx-auto mb-2 px-4 py-2 rounded-xl bg-red-100 border border-red-300 text-red-700 text-sm font-medium">
            {publishError}
          </div>
        )}
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
              disabled={publishing}
              className="flex-1 py-3.5 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish"}
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

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function CoverPhotoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(false);
    onChange(await readImageFile(file));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => {
            setError(false);
            onChange(e.target.value);
          }}
          placeholder={value.startsWith("data:") ? "Uploaded image" : "https://example.com/photo.jpg"}
          className="w-full px-3 py-2.5 pr-10 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setError(false);
              onChange("");
            }}
            aria-label="Clear image"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ink/10 hover:bg-ink/20 flex items-center justify-center text-ink/70 text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={
          "rounded-xl border-2 border-dashed p-3 text-center transition " +
          (dragOver ? "border-ink bg-amber/10" : "border-ink/20")
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink bg-cream-50 text-sm font-semibold hover:bg-amber/20"
        >
          ⬆ Upload Image
        </button>
        <div className="mt-1 text-[11px] text-ink/50">
          From your phone or computer — or drag &amp; drop here
        </div>
      </div>

      {value && !error && (
        <img
          src={value}
          alt="Preview"
          onError={() => setError(true)}
          className="w-full h-40 object-cover rounded-xl border border-ink/15"
        />
      )}
      {value && error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn’t load image. Please check the URL.
        </div>
      )}
    </div>
  );
}

function DiningPhotos({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const MAX = 3;
  const fileRef = useRef<HTMLInputElement | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX - value.length;
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    if (!picked.length) return;
    const urls = await Promise.all(picked.map(readImageFile));
    onChange([...value, ...urls]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((src, i) => (
        <div key={i} className="relative w-24 h-24">
          <img src={src} alt={`Setting ${i + 1}`} className="w-full h-full object-cover rounded-xl border border-ink/15" />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label="Remove photo"
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-ink text-cream-50 flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>
      ))}
      {value.length < MAX && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-ink/30 hover:border-ink text-ink/60 flex flex-col items-center justify-center text-sm"
          >
            <span className="text-xl leading-none">＋</span>
            <span className="text-[11px] mt-0.5">Add photo</span>
          </button>
        </>
      )}
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

        <Field label="Cover photo" hint="Paste an image URL or upload one">
          <CoverPhotoInput value={d.photo} onChange={(photo) => setD({ ...d, photo })} />
        </Field>

        <Field label="Dietary tags" hint="Most important for booking decisions">
          <ChipToggle
            tags={DIETARY}
            value={d.dietary_tags}
            onChange={(next) => setD({ ...d, dietary_tags: next })}
          />
        </Field>

        <Field label={isTable ? "Cuisine" : "Product type"}>
          {isTable ? (
            <CuisineSection
              value={d.category_tags}
              onChange={(next) => setD({ ...d, category_tags: next })}
            />
          ) : (
            <ChipToggle
              tags={PRODUCT_TYPES}
              value={d.category_tags}
              onChange={(next) => setD({ ...d, category_tags: next })}
              variant="leaf"
            />
          )}
        </Field>

        {isTable && <DrinksSection d={d} setD={setD} />}
      </div>
    </div>
  );
}

function CuisineSection({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [showInput, setShowInput] = useState(false);
  const [custom, setCustom] = useState("");

  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);

  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setCustom("");
    setShowInput(false);
  };

  const customTags = value.filter((t) => !CUISINES.includes(t));
  const allTags = [...CUISINES, ...customTags];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((t) => {
          const on = value.includes(t);
          return (
            <button key={t} type="button" onClick={() => toggle(t)}>
              <span className={"chip " + (on ? "chip-amber" : "")}>
                {on && <span>✓</span>}
                {t}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={() => setShowInput((s) => !s)}>
          <span className={"chip " + (showInput ? "chip-amber" : "")}>
            Other
          </span>
        </button>
      </div>
      {showInput && (
        <div className="flex items-center gap-2">
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. Balkan, Levantine Fusion, Home-style…"
            className="flex-1 px-3 py-2 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink text-sm"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="px-3 py-2 rounded-xl border-2 border-ink bg-cream-50 text-sm font-semibold disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function DrinksSection({ d, setD }: { d: Draft; setD: (n: Draft) => void }) {
  const [custom, setCustom] = useState("");
  const addCustom = () => {
    const v = custom.trim();
    if (!v || d.drinks.includes(v)) return setCustom("");
    setD({ ...d, drinks: [...d.drinks, v] });
    setCustom("");
  };

  return (
    <Field label="Drinks">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setD({ ...d, drinks_included: true })}>
          <span className={"chip " + (d.drinks_included ? "chip-amber" : "")}>
            {d.drinks_included && "✓ "}Drinks included
          </span>
        </button>
        <button
          type="button"
          onClick={() => setD({ ...d, drinks_included: false, drinks: [] })}
        >
          <span className={"chip " + (!d.drinks_included ? "chip-amber" : "")}>
            {!d.drinks_included && "✓ "}No drinks included
          </span>
        </button>
      </div>

      {d.drinks_included && (
        <div className="mt-3 space-y-3 rounded-2xl border border-ink/15 bg-white p-3">
          <ChipToggle
            tags={Array.from(new Set([...DRINK_OPTIONS, ...d.drinks]))}
            value={d.drinks}
            onChange={(next) => setD({ ...d, drinks: next })}
          />
          <div className="flex items-center gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Add a custom drink (e.g. Ayran)"
              className="flex-1 px-3 py-2 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink text-sm"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!custom.trim()}
              className="px-3 py-2 rounded-xl border-2 border-ink bg-cream-50 text-sm font-semibold disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </Field>
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
  const t = useT();
  return (
    <div className="space-y-5">
      <Section
        title="Logistics"
        hint={isTable ? "When, how many, and where you'll seat them." : "How many you're making, and when guests can come pick up."}
      />

      <Field label={isTable ? t("hostNew.pricePerSeat") : t("hostNew.pricePerUnit")}>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={d.price_per_unit}
            onChange={(e) => setD({ ...d, price_per_unit: Math.max(0, Number(e.target.value)) })}
            className="flex-1 min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
          />
          <CurrencyPicker
            value={d.currency}
            onChange={(currency) => setD({ ...d, currency })}
          />
        </div>
      </Field>

      {isTable ? (
        <>
          <Field label={t("hostNew.date")}>
            <input
              type="date"
              value={d.meal_date}
              onChange={(e) => setD({ ...d, meal_date: e.target.value })}
              className="w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("hostNew.startTime")}>
              <input
                type="time"
                value={d.meal_time}
                onChange={(e) => setD({ ...d, meal_time: e.target.value })}
                className="w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
            <Field label={t("hostNew.endTime")}>
              <input
                type="time"
                value={d.meal_end}
                onChange={(e) => setD({ ...d, meal_end: e.target.value })}
                className="w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
          </div>
          {durationLabel(d.meal_time, d.meal_end) && (
            <p className="text-sm text-ink/60 -mt-2">
              {t("hostNew.duration")}: <span className="font-semibold text-ink/80">{durationLabel(d.meal_time, d.meal_end)}</span>
            </p>
          )}
          <Field label={t("hostNew.seatsAvailable")}>
            <input
              type="number"
              min={1}
              max={20}
              value={d.seats_total}
              onChange={(e) => setD({ ...d, seats_total: Math.max(1, Number(e.target.value)) })}
              className="w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
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
          <Field
            label="Dining setting photo"
            hint="Required — guests need to see where they'll eat (table, terrace, garden…). Up to 3."
            required
          >
            <DiningPhotos
              value={d.dining_setting_photos}
              onChange={(next) => setD({ ...d, dining_setting_photos: next })}
            />
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
              type="date"
              value={d.pickup_date}
              onChange={(e) => setD({ ...d, pickup_date: e.target.value })}
              className="w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pickup from">
              <input
                type="time"
                value={d.pickup_start}
                onChange={(e) => setD({ ...d, pickup_start: e.target.value })}
                className="w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
            <Field label="Pickup until">
              <input
                type="time"
                value={d.pickup_end}
                onChange={(e) => setD({ ...d, pickup_end: e.target.value })}
                className="w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
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
  const dRef = useRef(d);
  dRef.current = d;

  // True while the map is panning/zooming under the fixed centre pin.
  const [moving, setMoving] = useState(false);
  // True while a reverse-geocode lookup for the current point is in flight.
  const [geoLoading, setGeoLoading] = useState(false);
  const geoAbort = useRef<AbortController | null>(null);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced reverse geocode: cancels any in-flight lookup, waits for the
  // pin to settle, then fills the neighborhood from the dropped point.
  const runGeocode = (lat: number, lng: number) => {
    if (geoTimer.current) clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      geoAbort.current?.abort();
      const ctrl = new AbortController();
      geoAbort.current = ctrl;
      setGeoLoading(true);
      const res = await reverseGeocode(lat, lng, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setGeoLoading(false);
      if (res?.neighborhood) {
        setD({ ...dRef.current, neighborhood: res.neighborhood });
      }
    }, 450);
  };

  // Lock the selected location to wherever the map centre now sits.
  const commitCenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setD({ ...dRef.current, lat: c.lat, lng: c.lng });
    runGeocode(c.lat, c.lng);
  };

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { longitude: lng, latitude: lat } = pos.coords;
      mapRef.current!.flyTo({ center: [lng, lat], zoom: 15 });
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [d.lng, d.lat],
      zoom: 14,
    });
    mapRef.current = map;
    // The pin stays centred; users move the MAP underneath it. We mirror that
    // motion with the lift/shadow animation and commit on settle.
    map.on("movestart", () => setMoving(true));
    map.on("moveend", () => {
      setMoving(false);
      commitCenter();
    });
    map.on("load", () => commitCenter());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude: lng, latitude: lat } = pos.coords;
          map.flyTo({ center: [lng, lat], zoom: 15 });
        },
        () => {},
      );
    }
    return () => {
      geoAbort.current?.abort();
      if (geoTimer.current) clearTimeout(geoTimer.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <Section
        title="Where are you?"
        hint="Drag the map so the pin sits on your spot. Guests see only the neighborhood until they book."
      />

      <div className="rounded-3xl overflow-hidden border-2 border-ink/90 h-72 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* Dim the surroundings while moving to focus on the selected point */}
        <div className={"map-dim" + (moving ? " is-moving" : "")} />

        {/* WhatsApp-style fixed centre pin: floats above, anchors to a precise
            ground point + shadow that marks the exact coordinate. */}
        <div className={"center-pin" + (moving ? " is-moving" : "")}>
          <div className="center-pin-marker">
            <svg width="34" height="46" viewBox="0 0 34 46" aria-hidden="true">
              <path
                d="M17 1C8.7 1 2 7.7 2 16c0 10.5 13.4 26.4 14 27.1.5.6 1.5.6 2 0C18.6 42.4 32 26.5 32 16 32 7.7 25.3 1 17 1z"
                fill="#F5A524"
                stroke="#161413"
                strokeWidth="2"
              />
              <circle cx="17" cy="16" r="6" fill="#fff" stroke="#161413" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="center-pin-shadow" />
          <div className="center-pin-dot" />
        </div>

        <div className="map-zoom">
          <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
            +
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
            −
          </button>
        </div>

        <button
          type="button"
          onClick={locateMe}
          className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-full bg-white border-2 border-ink text-sm font-semibold shadow-float"
        >
          📍 My location
        </button>
      </div>

      <Field label="Neighborhood (shown publicly)">
        <div className="relative">
          <input
            value={d.neighborhood}
            onChange={(e) => setD({ ...d, neighborhood: e.target.value })}
            className="w-full px-3 py-2.5 pr-24 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-ink/50">
            {moving ? "Moving…" : geoLoading ? "Locating…" : ""}
          </span>
        </div>
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
            {d.dietary_tags.map((t) => <Chip key={t}>{t}</Chip>)}
            {d.category_tags.map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
          {isTable && d.drinks_included && (
            <div className="text-sm text-ink/80">
              <span className="font-semibold">🥤 Drinks included</span>
              {d.drinks.length > 0 && <>: {d.drinks.join(", ")}</>}
            </div>
          )}
          {isTable && d.dining_setting_photos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.dining_setting_photos.map((src, i) => (
                <img key={i} src={src} alt={`Setting ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-ink/15" />
              ))}
            </div>
          )}
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
          <span className="font-display font-extrabold text-lg">{d.currency}{d.price_per_unit}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Guest deposit (we collect)</span>
          <span>{d.currency}{deposit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Balance — paid to you in person</span>
          <span>{d.currency}{(d.price_per_unit - deposit).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[11px] text-ink/50">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
