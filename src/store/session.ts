import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { fetchProfile } from "../lib/db";
import { useProfile } from "./profile";

interface SessionUser {
  id: string;
  email: string | null;
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  setUser: (u: SessionUser | null) => void;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  loading: !!supabase,
  setUser: (u) => set({ user: u, loading: false }),
  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null });
  },
}));

// Pull the signed-in user's profile from the database into the local store so
// returning users (e.g. on a new device) load their real details and skip
// onboarding instead of seeing mock/default data.
export async function loadProfileFromDb(userId: string, email: string | null) {
  const row = await fetchProfile(userId);
  if (!row) {
    // No DB profile yet — at least seed the auth id/email locally.
    useProfile.getState().update({ id: userId, email: email ?? "" });
    return;
  }
  useProfile.getState().update({
    id: row.id,
    name: row.full_name ?? "",
    bio: row.bio ?? "",
    avatar: row.avatar_url || useProfile.getState().me.avatar,
    email: row.email ?? email ?? "",
    phone_verified: row.phone_verified,
    identity_verified: row.identity_verified,
    dietary_prefs: row.dietary_prefs ?? [],
    allergen_exclusions: row.allergen_exclusions ?? [],
    language: row.language || useProfile.getState().me.language,
    // Onboarding is a one-way milestone — never downgrade a locally-completed
    // flag (avoids a race where a just-created account bounces back to setup).
    onboarded: row.onboarded || useProfile.getState().me.onboarded,
  });
}

// Hydrate on boot. Safe no-op if Supabase isn't configured.
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    useSession.getState().setUser(u ? { id: u.id, email: u.email ?? null } : null);
    if (u) void loadProfileFromDb(u.id, u.email ?? null);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    useSession.getState().setUser(u ? { id: u.id, email: u.email ?? null } : null);
    if (u) void loadProfileFromDb(u.id, u.email ?? null);
  });
} else {
  useSession.setState({ loading: false });
}
