import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useProfile } from "../store/profile";
import { useT } from "../i18n";
import { signUpWithEmail } from "../lib/auth";
import { updateProfile } from "../lib/db";
import { isSupabaseConfigured } from "../lib/supabase";

const DIETARY = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free"];
const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Sesame"];

type Stage = "slides" | "setup" | "account";

export default function Onboarding() {
  const nav = useNavigate();
  const update = useProfile((s) => s.update);
  const me = useProfile((s) => s.me);
  const t = useT();

  const SLIDES = [
    { emoji: "🍽", title: t("welcome.slide1Title"), body: t("welcome.slide1Body"), art: "bg-amber" },
    { emoji: "🛍", title: t("welcome.slide2Title"), body: t("welcome.slide2Body"), art: "bg-leaf" },
    { emoji: "👨‍🍳", title: t("welcome.slide3Title"), body: t("welcome.slide3Body"), art: "bg-cream-100" },
  ];

  const [stage, setStage] = useState<Stage>("slides");
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [diet, setDiet] = useState<string[]>(me.dietary_prefs);
  const [allergens, setAllergens] = useState<string[]>(me.allergen_exclusions);
  const [email, setEmail] = useState(me.email);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (set: (v: string[]) => void, list: string[], t: string) =>
    set(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);

  // No Supabase: finish locally (mock mode) once profile details are entered.
  const finishLocal = () => {
    update({
      name: name.trim() || "You",
      bio: bio.trim(),
      dietary_prefs: diet,
      allergen_exclusions: allergens,
      onboarded: true,
    });
    nav("/", { replace: true });
  };

  const continueFromSetup = () => {
    if (isSupabaseConfigured) {
      setStage("account");
    } else {
      finishLocal();
    }
  };

  // New user: create the account, persist the profile, then enter the app.
  const createAccount = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const data = await signUpWithEmail(email.trim(), password);
      const userId = data.user?.id;
      const profilePatch = {
        name: name.trim() || "You",
        bio: bio.trim(),
        email: email.trim(),
        dietary_prefs: diet,
        allergen_exclusions: allergens,
        onboarded: true,
        ...(userId ? { id: userId } : {}),
      };
      update(profilePatch);
      // Best-effort: write the profile to the database. Skipped silently if the
      // session isn't active yet (e.g. email confirmation pending).
      if (userId) {
        try {
          await updateProfile(userId, {
            full_name: name.trim() || null,
            bio: bio.trim() || null,
            email: email.trim(),
            dietary_prefs: diet,
            allergen_exclusions: allergens,
            language: me.language,
            onboarded: true,
          });
        } catch {
          /* RLS / pending confirmation — profile will sync on first login */
        }
      }
      nav("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Welcome slides ----
  if (stage === "slides") {
    const s = SLIDES[slide];
    const isLast = slide === SLIDES.length - 1;
    return (
      <div className="min-h-full flex flex-col bg-cream-50">
        <header className="px-4 pt-5 flex items-center justify-between">
          <Logo />
          <button
            onClick={() => nav("/auth/login")}
            className="px-4 py-2 rounded-full border-2 border-ink text-sm font-semibold hover:bg-ink/5"
          >
            {t("welcome.login")}
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

        <footer className="p-5 max-w-md mx-auto w-full space-y-4">
          <div className="flex items-center justify-between gap-4">
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
            {!isLast ? (
              <button
                onClick={() => setSlide(slide + 1)}
                className="px-6 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
              >
                {t("common.next")}
              </button>
            ) : (
              <button
                onClick={() => setStage("setup")}
                className="px-6 py-3 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold"
              >
                {t("welcome.getStarted")}
              </button>
            )}
          </div>
          {/* Always offer a bottom login path — some users look here after
              reading the onboarding, in addition to the top-right button. */}
          <button
            onClick={() => nav("/auth/login")}
            className="w-full text-sm font-semibold text-ink/60 hover:text-ink"
          >
            {t("auth.haveAccount")} {t("welcome.login")}
          </button>
        </footer>
      </div>
    );
  }

  // ---- Profile setup ----
  if (stage === "setup") {
    return (
      <div className="min-h-full bg-cream-50 pb-24">
        <header className="px-4 pt-5 pb-3">
          <Logo />
        </header>

        <div className="max-w-[560px] mx-auto px-4 space-y-6">
          <div>
            <h1 className="font-display font-extrabold text-3xl leading-tight">{t("onboarding.setupTitle")}</h1>
            <p className="text-ink/60 text-sm mt-1">{t("onboarding.setupSubtitle")}</p>
          </div>

          <div className="space-y-3">
            <Field label={t("onboarding.nameLabel")}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("onboarding.namePlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
              />
            </Field>
            <Field label={t("onboarding.bioLabel")} hint={t("onboarding.optional")}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder={t("onboarding.bioPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink resize-none"
              />
            </Field>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl mb-2">{t("onboarding.dietaryTitle")}</h2>
            <p className="text-xs text-ink/60 mb-3">{t("onboarding.dietarySubtitle")}</p>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY.map((tag) => {
                const on = diet.includes(tag);
                return (
                  <button key={tag} onClick={() => toggle(setDiet, diet, tag)}>
                    <span className={"chip " + (on ? "chip-leaf" : "")}>{on && "✓ "}{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-xl mb-2">{t("onboarding.allergensTitle")}</h2>
            <p className="text-xs text-ink/60 mb-3">{t("onboarding.allergensSubtitle")}</p>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGENS.map((tag) => {
                const on = allergens.includes(tag);
                return (
                  <button key={tag} onClick={() => toggle(setAllergens, allergens, tag)}>
                    <span className={"chip " + (on ? "chip-amber" : "")}>{on && "✓ "}{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="fixed left-0 right-0 bottom-0 p-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pt-8">
          <div className="max-w-[560px] mx-auto">
            <button
              onClick={continueFromSetup}
              className="w-full py-3.5 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold"
            >
              {isSupabaseConfigured ? t("common.continue") : t("onboarding.openMap")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Account creation (email + password) ----
  return (
    <div className="min-h-full bg-cream-50 pb-24">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={() => setStage("setup")}
          aria-label={t("common.back")}
          className="w-10 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center shadow-float"
        >
          ‹
        </button>
        <Logo />
      </header>

      <div className="max-w-[480px] mx-auto px-4 space-y-5">
        <div>
          <h1 className="font-display font-extrabold text-3xl leading-tight">{t("onboarding.accountTitle")}</h1>
          <p className="text-ink/60 text-sm mt-1">{t("onboarding.accountSubtitle")}</p>
        </div>

        <Field label={t("common.email")}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("onboarding.emailPlaceholder")}
            className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
          />
        </Field>
        <Field label={t("common.password")}>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
          />
          <div className="text-[11px] text-ink/50 mt-1">{t("onboarding.passwordHint")}</div>
        </Field>

        {error && (
          <div className="text-sm text-amber-ink bg-amber/15 border border-amber/60 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <button
          disabled={!email || password.length < 8 || submitting}
          onClick={createAccount}
          className="w-full py-3.5 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
        >
          {submitting ? t("onboarding.creating") : t("onboarding.createAccount")}
        </button>

        <button
          onClick={() => nav("/auth/login")}
          className="w-full text-sm font-semibold text-ink/60 hover:text-ink"
        >
          {t("auth.haveAccount")} {t("welcome.login")}
        </button>
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
