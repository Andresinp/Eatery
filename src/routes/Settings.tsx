import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { Chip } from "../components/Chip";
import LanguagePicker from "../components/LanguagePicker";
import { useProfile } from "../store/profile";
import { useSession } from "../store/session";
import { isSupabaseConfigured } from "../lib/supabase";
import { useT, useLanguage } from "../i18n";

const DIETARY = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-Free", "Nut-Free", "Dairy-Free"];
const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Sesame"];

const NOTIF_KEYS = ["bookings", "reminders", "messages", "reviews", "marketing"] as const;

export default function Settings() {
  const me = useProfile((s) => s.me);
  const update = useProfile((s) => s.update);
  const reset = useProfile((s) => s.reset);
  const nav = useNavigate();
  const t = useT();

  const { flag, label } = useLanguage();
  const [showLangPicker, setShowLangPicker] = useState(false);
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
      <TopBar back title={t("settings.title")} />

      <div className="max-w-[640px] mx-auto px-4 pt-2 space-y-6">
        <Card title={t("settings.account")}>
          <Field label={t("settings.name")}>
            <input
              value={me.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label={t("settings.email")}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => update({ email })}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
            />
          </Field>
          <Field label={t("settings.phoneVerification")}>
            {me.phone_verified ? (
              <div className="flex items-center gap-2 text-sm text-leaf-ink">
                <span className="chip chip-leaf">📞 {t("settings.verified")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {!phoneSent ? (
                  <button
                    onClick={() => setPhoneSent(true)}
                    className="px-4 py-2 rounded-xl border-2 border-ink font-semibold text-sm"
                  >
                    {t("settings.sendSmsCode")}
                  </button>
                ) : (
                  <>
                    <input
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder={t("settings.sixDigitCode")}
                      className="flex-1 px-3 py-2 rounded-xl border border-ink/20 bg-white focus:outline-none focus:border-ink"
                    />
                    <button
                      disabled={phoneCode.length < 6}
                      onClick={() => update({ phone_verified: true })}
                      className="px-4 py-2 rounded-xl border-2 border-ink bg-ink text-cream-50 font-semibold text-sm disabled:opacity-40"
                    >
                      {t("settings.verify")}
                    </button>
                  </>
                )}
              </div>
            )}
          </Field>
        </Card>

        <Card title={t("settings.identity")}>
          <p className="text-sm text-ink/70">{t("settings.identityHint")}</p>
          <button
            disabled={me.identity_verified}
            onClick={() => update({ identity_verified: true })}
            className="px-4 py-2.5 rounded-xl border-2 border-ink font-semibold text-sm disabled:opacity-50"
          >
            {me.identity_verified ? `✓ ${t("settings.verified")}` : t("settings.uploadId")}
          </button>
        </Card>

        <Card title={t("settings.dietary")}>
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

        <Card title={t("settings.allergens")}>
          <p className="text-sm text-ink/70 mb-1">{t("settings.allergensHint")}</p>
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

        <Card title={t("settings.notifications")}>
          <div className="space-y-3">
            {NOTIF_KEYS.map((key) => (
              <Toggle
                key={key}
                label={t(`notif.${key}` as const)}
                hint={t(`notif.${key}Hint` as const)}
                checked={me.notif[key]}
                onChange={(v) => setNotif(key, v)}
              />
            ))}
          </div>
        </Card>

        <Card title={t("settings.payment")}>
          <p className="text-sm text-ink/70">{t("settings.paymentHint")}</p>
        </Card>

        <Card title={t("settings.language")}>
          <button
            onClick={() => setShowLangPicker(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 border-ink/20 bg-white hover:border-ink transition-colors text-left"
          >
            <span className="text-2xl leading-none">{flag}</span>
            <span className="flex-1 font-semibold">{label}</span>
            <span className="text-ink/40 text-sm">▾</span>
          </button>
        </Card>
        {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}

        <Card title={t("settings.dangerZone")}>
          <div className="flex flex-wrap gap-2">
            {isSupabaseConfigured && (
              <SignOutButton />
            )}
            <button
              onClick={() => {
                if (confirm(t("settings.resetConfirm"))) {
                  reset();
                  nav("/onboarding");
                }
              }}
              className="px-4 py-2.5 rounded-xl border-2 border-ink text-sm font-semibold"
            >
              {t("settings.resetProfile")}
            </button>
          </div>
        </Card>

        <div className="text-center pt-2 pb-6">
          <Chip>Eatery · v0.0.1</Chip>
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  const signOut = useSession((s) => s.signOut);
  const nav = useNavigate();
  const t = useT();
  return (
    <button
      onClick={async () => {
        await signOut();
        nav("/auth/login");
      }}
      className="px-4 py-2.5 rounded-xl border-2 border-ink bg-ink text-cream-50 text-sm font-semibold"
    >
      {t("settings.signOut")}
    </button>
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
