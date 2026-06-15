import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { signInWithEmail, signInWithMagicLink, signInWithOAuth } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabase";
import { loadProfileFromDb } from "../../store/session";
import { useT } from "../../i18n";

export default function Login() {
  const nav = useNavigate();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "password") {
        const data = await signInWithEmail(email, password);
        // Load the real profile before routing so the onboarding gate doesn't
        // bounce a returning user back to onboarding.
        if (data.user) await loadProfileFromDb(data.user.id, data.user.email ?? email);
        nav("/", { replace: true });
      } else {
        await signInWithMagicLink(email);
        setSent(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={t("auth.welcomeBack")} subtitle={t("auth.loginSubtitle")}>
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber/60 bg-amber/10 text-amber-ink text-sm px-3 py-2">
          {t("auth.notConfigured")}
        </div>
      )}

      {sent ? (
        <div className="rounded-xl border border-leaf/60 bg-leaf/15 text-leaf-ink p-4 text-sm">
          {t("auth.magicSentPre")} <span className="font-semibold">{email}</span>. {t("auth.magicSentPost")}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <OAuth provider="google" label={t("auth.continueGoogle")} />
            <OAuth provider="apple" label={t("auth.apple")} />
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink/15" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white px-2 text-ink/40">{t("auth.orWithEmail")}</span>
            </div>
          </div>

          <label className="block">
            <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">{t("common.email")}</div>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink"
            />
          </label>

          {mode === "password" && (
            <label className="block">
              <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">{t("common.password")}</div>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink"
              />
            </label>
          )}

          {error && (
            <div className="text-sm text-amber-ink bg-amber/15 border border-amber/60 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            disabled={!email || (mode === "password" && !password) || submitting || !isSupabaseConfigured}
            onClick={submit}
            className="w-full py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
          >
            {submitting ? t("auth.holdOn") : mode === "password" ? t("auth.signIn") : t("auth.sendMagicLink")}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "password" ? "magic" : "password")}
            className="w-full text-sm text-ink/60 hover:text-ink"
          >
            {mode === "password" ? t("auth.magicLinkInstead") : t("auth.passwordInstead")}
          </button>
        </>
      )}

      <div className="text-center text-sm text-ink/60 pt-2">
        {t("auth.newToEatery")}{" "}
        <Link to="/auth/register" className="font-semibold text-ink underline-offset-4 hover:underline">
          {t("auth.createAccountLink")}
        </Link>
      </div>
    </AuthShell>
  );
}

function OAuth({ provider, label }: { provider: "google" | "apple"; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        if (!isSupabaseConfigured) return;
        setBusy(true);
        try { await signInWithOAuth(provider); } finally { setBusy(false); }
      }}
      disabled={busy || !isSupabaseConfigured}
      className="flex-1 py-2.5 rounded-xl border-2 border-ink font-semibold text-sm disabled:opacity-40 hover:bg-ink/5"
    >
      {label}
    </button>
  );
}
