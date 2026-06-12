import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useProfile } from "../store/profile";

const DIETARY = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free"];
const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Sesame"];

const SLIDES = [
  {
    emoji: "🍽",
    title: "Eat at someone's home.",
    body: "Open seats at home-cooked tables across the city — meet the host, share the meal.",
    art: "bg-amber",
  },
  {
    emoji: "🛍",
    title: "Buy homemade food.",
    body: "Cakes, sourdough, frozen lasagna, jam — picked up straight from a real kitchen.",
    art: "bg-leaf",
  },
  {
    emoji: "👨‍🍳",
    title: "Or share your cooking.",
    body: "Open a table or sell a batch. Eatery takes a small deposit, you keep the rest.",
    art: "bg-cream-100",
  },
];

export default function Onboarding() {
  const nav = useNavigate();
  const update = useProfile((s) => s.update);
  const me = useProfile((s) => s.me);

  const [stage, setStage] = useState<"slides" | "setup">("slides");
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [diet, setDiet] = useState<string[]>(me.dietary_prefs);
  const [allergens, setAllergens] = useState<string[]>(me.allergen_exclusions);

  const toggle = (set: (v: string[]) => void, list: string[], t: string) =>
    set(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);

  const finish = () => {
    update({
      name: name.trim() || "You",
      bio: bio.trim(),
      dietary_prefs: diet,
      allergen_exclusions: allergens,
      onboarded: true,
    });
    nav("/");
  };

  if (stage === "slides") {
    const s = SLIDES[slide];
    return (
      <div className="min-h-full flex flex-col bg-cream-50">
        <header className="px-4 pt-5 flex items-center justify-between">
          <Logo />
          <button
            onClick={() => setStage("setup")}
            className="text-sm font-semibold text-ink/60 hover:text-ink"
          >
            Skip
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <div className={"w-48 h-48 rounded-[40%] grid place-items-center text-7xl mb-8 border-2 border-ink shadow-float " + s.art}>
            {s.emoji}
          </div>
          <h1 className="font-display font-extrabold text-4xl text-center leading-[1.05] max-w-md">
            {s.title}
          </h1>
          <p className="mt-4 text-center text-ink/70 max-w-md">{s.body}</p>
        </main>

        <footer className="p-5 flex items-center justify-between gap-4 max-w-md mx-auto w-full">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (i === slide ? "w-6 bg-ink" : "w-1.5 bg-ink/20")
                }
              />
            ))}
          </div>
          {slide < SLIDES.length - 1 ? (
            <button
              onClick={() => setSlide(slide + 1)}
              className="px-6 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => setStage("setup")}
              className="px-6 py-3 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold"
            >
              Get started
            </button>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-cream-50 pb-24">
      <header className="px-4 pt-5 pb-3">
        <Logo />
      </header>

      <div className="max-w-[560px] mx-auto px-4 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl leading-tight">Set up your profile</h1>
          <p className="text-ink/60 text-sm mt-1">Two minutes — you can edit any of this later.</p>
        </div>

        <div className="space-y-3">
          <Field label="Your name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Andrés"
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label="Short bio" hint="Optional">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="I love finding hole-in-the-wall kitchens."
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink resize-none"
            />
          </Field>
        </div>

        <div>
          <h2 className="font-display font-bold text-xl mb-2">Dietary preferences</h2>
          <p className="text-xs text-ink/60 mb-3">We'll surface listings that match.</p>
          <div className="flex flex-wrap gap-1.5">
            {DIETARY.map((t) => {
              const on = diet.includes(t);
              return (
                <button key={t} onClick={() => toggle(setDiet, diet, t)}>
                  <span className={"chip " + (on ? "chip-leaf" : "")}>{on && "✓ "}{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-display font-bold text-xl mb-2">Allergens to avoid</h2>
          <p className="text-xs text-ink/60 mb-3">We'll warn you on any listing that contains these.</p>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((t) => {
              const on = allergens.includes(t);
              return (
                <button key={t} onClick={() => toggle(setAllergens, allergens, t)}>
                  <span className={"chip " + (on ? "chip-amber" : "")}>{on && "✓ "}{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 p-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pt-8">
        <div className="max-w-[560px] mx-auto">
          <button
            onClick={finish}
            className="w-full py-3.5 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
          >
            Open the map
          </button>
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
