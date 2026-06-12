import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "./store/profile";
import { useSession } from "./store/session";
import { isSupabaseConfigured } from "./lib/supabase";

const PUBLIC_PATHS = ["/onboarding", "/auth/login", "/auth/register", "/auth/verify"];

export default function OnboardingGate() {
  const me = useProfile((s) => s.me);
  const user = useSession((s) => s.user);
  const loading = useSession((s) => s.loading);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (PUBLIC_PATHS.includes(loc.pathname)) return;

    // With Supabase configured, require auth before letting anyone in.
    if (isSupabaseConfigured && !user) {
      nav("/auth/login", { replace: true });
      return;
    }

    // Either way, run onboarding once.
    if (!me.onboarded) {
      nav("/onboarding", { replace: true });
    }
  }, [loading, user, me.onboarded, loc.pathname, nav]);

  return null;
}
