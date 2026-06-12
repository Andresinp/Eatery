import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { Chip } from "../components/Chip";
import { useProfile } from "../store/profile";

const DIETARY = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free"];
const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Sesame"];

const NOTIF_KEYS = [
  ["bookings", "Bookings & orders", "When you book or receive an order"],
  ["reminders", "Reminders", "Day-before and hour-before nudges"],
  ["messages", "Messages", "New chat messages"],
  ["reviews", "Review requests", "After a meal or pickup"],
  ["marketing", "Tips & news", "Occasional updates from Eatery"],
] as const;

export default function Settings() {
  const me = useProfile((s) => s.me);
  const update = useProfile((s) => s.update);
  const reset = useProfile((s) => s.reset);
  const nav = useNavigate();

  const [email, setEmail] = useState(me.email);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);

  const toggleList = (key: "dietary_prefs" | "allergen_exclusions", t: string) => {
    const cur = me[key];
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    update({ [key]: next } as Partial<typeof me>);
  };

  const setNotif = (k: keyof typeof me.notif, v: boolean) =>
    update({ notif: { ...me.notif, [k]: v } });

  return (
    <div className="min-h-full bg-cream-50 pb-10">
      <TopBar back title="Settings" />

      <div className="max-w-[640px] mx-auto px-4 pt-2 space-y-6">
        <Card title="Account">
          <Field label="Name">
            <input
              value={me.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => update({ email })}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label="Phone verification">
            {me.phone_verified ? (
              <div className="flex items-center gap-2 text-sm text-leaf-ink">
                <span className="chip chip-leaf">📞 Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {!phoneSent ? (
                  <button
                    onClick={() => setPhoneSent(true)}
                    className="px-4 py-2 rounded-xl border-2 border-ink font-semibold text-sm"
                  >
                    Send SMS code
                  </button>
                ) : (
                  <>
                    <input
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit code"
                      className="flex-1 px-3 py-2 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
                    />
                    <button
                      disabled={phoneCode.length < 6}
                      onClick={() => update({ phone_verified: true })}
                      className="px-4 py-2 rounded-xl border-2 border-ink bg-ink text-cream-50 font-semibold text-sm disabled:opacity-40"
                    >
                      Verify
                    </button>
                  </>
                )}
              </div>
            )}
          </Field>
        </Card>

        <Card title="Identity verification">
          <p className="text-sm text-ink/70">
            Upload a government ID to get a verified badge — guests trust verified hosts.
          </p>
          <button
            disabled={me.identity_verified}
            onClick={() => update({ identity_verified: true })}
            className="px-4 py-2.5 rounded-xl border-2 border-ink font-semibold text-sm disabled:opacity-50"
          >
            {me.identity_verified ? "✓ Verified" : "Upload ID (mock)"}
          </button>
        </Card>

        <Card title="Dietary preferences">
          <div className="flex flex-wrap gap-1.5">
            {DIETARY.map((t) => {
              const on = me.dietary_prefs.includes(t);
              return (
                <button key={t} onClick={() => toggleList("dietary_prefs", t)}>
                  <span className={"chip " + (on ? "chip-leaf" : "")}>{on && "✓ "}{t}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Allergens to avoid">
          <p className="text-sm text-ink/70 mb-1">
            We'll show a warning on any listing that contains these.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((t) => {
              const on = me.allergen_exclusions.includes(t);
              return (
                <button key={t} onClick={() => toggleList("allergen_exclusions", t)}>
                  <span className={"chip " + (on ? "chip-amber" : "")}>{on && "✓ "}{t}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Notifications">
          <div className="space-y-3">
            {NOTIF_KEYS.map(([key, label, hint]) => (
              <Toggle
                key={key}
                label={label}
                hint={hint}
                checked={me.notif[key as keyof typeof me.notif]}
                onChange={(v) => setNotif(key as keyof typeof me.notif, v)}
              />
            ))}
          </div>
        </Card>

        <Card title="Payment methods">
          <p className="text-sm text-ink/70">
            Stripe-saved cards will live here. None yet.
          </p>
        </Card>

        <Card title="Language">
          <select
            value={me.language}
            onChange={(e) => update({ language: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </Card>

        <Card title="Danger zone">
          <button
            onClick={() => {
              if (confirm("Reset your local profile? This clears preferences and onboarding.")) {
                reset();
                nav("/onboarding");
              }
            }}
            className="px-4 py-2.5 rounded-xl border-2 border-ink text-sm font-semibold"
          >
            Reset profile
          </button>
        </Card>

        <div className="text-center pt-2 pb-6">
          <Chip>Eatery · v0.0.1</Chip>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border-2 border-ink/90 bg-white p-5 space-y-3">
      <h2 className="font-display font-extrabold text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-ink/60">{hint}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          "relative w-11 h-6 rounded-full border-2 border-ink transition flex-none " +
          (checked ? "bg-ink" : "bg-cream-50")
        }
        aria-pressed={checked}
      >
        <span
          className={
            "absolute top-0.5 w-4 h-4 rounded-full transition-all " +
            (checked ? "left-5 bg-cream-50" : "left-0.5 bg-ink")
          }
        />
      </button>
    </label>
  );
}
