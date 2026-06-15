import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { signUpWithEmail } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabase";
import { useT } from "../../i18n";

export default function Register() {
  const nav = useNavigate();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUpWithEmail(email, password);
      setDone(true);
      setTimeout(() => nav("/auth/verify", { state: { email } }), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={t("auth.createTitle")} subtitle={t("auth.createSubtitle")}>
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber/60 bg-amber/10 text-amber-ink text-sm px-3 py-2">
          {t("auth.notConfiguredRegister")}
        </div>
      )}

      {done ? (
        <div className="rounded-xl border border-leaf/60 bg-leaf/15 text-leaf-ink p-4 text-sm">
          {t("auth.confirmEmail")}
        </div>
      ) : (
        <>
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
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">{t("common.password")}</div>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink"
            />
            <div className="text-[11px] text-ink/50 mt-1">{t("onboarding.passwordHint")}</div>
          </label>

          {error && (
            <div className="text-sm text-amber-ink bg-amber/15 border border-amber/60 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            disabled={!email || password.length < 8 || submitting || !isSupabaseConfigured}
            onClick={submit}
            className="w-full py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
          >
            {submitting ? t("auth.creating") : t("auth.createButton")}
          </button>
        </>
      )}

      <div className="text-center text-sm text-ink/60 pt-2">
        {t("auth.haveAccount")}{" "}
        <Link to="/auth/login" className="font-semibold text-ink underline-offset-4 hover:underline">
          {t("auth.signInLink")}
        </Link>
      </div>
    </AuthShell>
  );
}
