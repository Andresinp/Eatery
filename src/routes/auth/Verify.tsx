import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { sendPhoneOtp, verifyPhoneOtp } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabase";
import { useT } from "../../i18n";

export default function Verify() {
  const nav = useNavigate();
  const loc = useLocation();
  const t = useT();
  const seededEmail = (loc.state as { email?: string } | null)?.email ?? "";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await sendPhoneOtp(phone);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.couldntSendCode"));
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await verifyPhoneOtp(phone, code);
      nav("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.invalidCode"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.verifyTitle")}
      subtitle={seededEmail ? `${seededEmail} · ${t("auth.verifySubtitle")}` : t("auth.verifySubtitle")}
    >
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber/60 bg-amber/10 text-amber-ink text-sm px-3 py-2">
          {t("auth.verifyNotConfigured")}
        </div>
      )}

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">{t("auth.phone")}</div>
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+34 600 00 00 00"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink"
        />
      </label>

      {sent && (
        <label className="block">
          <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">{t("auth.code")}</div>
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={t("auth.sixDigitCode")}
            className="w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink tracking-widest text-center font-mono text-lg"
          />
        </label>
      )}

      {error && (
        <div className="text-sm text-amber-ink bg-amber/15 border border-amber/60 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {sent ? (
        <button
          onClick={verify}
          disabled={code.length < 6 || submitting}
          className="w-full py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
        >
          {submitting ? t("auth.verifying") : t("auth.verifyCode")}
        </button>
      ) : (
        <button
          onClick={send}
          disabled={phone.length < 6 || submitting || !isSupabaseConfigured}
          className="w-full py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
        >
          {submitting ? t("auth.sending") : t("auth.sendCode")}
        </button>
      )}

      <div className="text-center">
        <Link to="/" className="text-sm text-ink/60 hover:text-ink underline-offset-4 hover:underline">
          {t("auth.skipForNow")}
        </Link>
      </div>
    </AuthShell>
  );
}
