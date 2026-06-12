import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { signInWithEmail, signInWithMagicLink, signInWithOAuth } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabase";

export default function Login() {
  const nav = useNavigate();
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
        await signInWithEmail(email, password);
        nav("/", { replace: true });
      } else {
        await signInWithMagicLink(email);
        setSent(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to keep cooking & eating.">
      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-amber/60 bg-amber/10 text-amber-ink text-sm px-3 py-2">
          Supabase isn't configured. The app is running on local mock data — auth is disabled until you set
          <code className="mx-1">VITE_SUPABASE_URL</code> and
          <code className="ml-1">VITE_SUPABASE_ANON_KEY</code>.
        </div>
      )}

      {sent ? (
        <div className="rounded-xl border border-leaf/60 bg-leaf/15 text-leaf-ink p-4 text-sm">
          We sent a magic link to <span className="font-semibold">{email}</span>. Open it on this device to sign in.
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <OAuth provider="google" label="Continue with Google" />
            <OAuth provider="apple" label="Apple" />
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink/15" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white px-2 text-ink/40">or with email</span>
            </div>
          </div>

          <label className="block">
            <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">Email</div>
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
              <div className="text-xs uppercase tracking-wider text-ink/60 font-semibold mb-1">Password</div>
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
            {submitting ? "Hold on…" : mode === "password" ? "Sign in" : "Send magic link"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "password" ? "magic" : "password")}
            className="w-full text-sm text-ink/60 hover:text-ink"
          >
            {mode === "password" ? "Email me a magic link instead" : "Use password instead"}
          </button>
        </>
      )}

      <div className="text-center text-sm text-ink/60 pt-2">
        New to Eatery?{" "}
        <Link to="/auth/register" className="font-semibold text-ink underline-offset-4 hover:underline">
          Create an account
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
