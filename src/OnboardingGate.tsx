import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "./store/profile";

const PUBLIC_PATHS = ["/onboarding"];

export default function OnboardingGate() {
  const me = useProfile((s) => s.me);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!me.onboarded && !PUBLIC_PATHS.includes(loc.pathname)) {
      nav("/onboarding", { replace: true });
    }
  }, [me.onboarded, loc.pathname, nav]);

  return null;
}
