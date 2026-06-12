import { create } from "zustand";
import { supabase } from "../lib/supabase";

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

// Hydrate on boot. Safe no-op if Supabase isn't configured.
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    useSession.getState().setUser(u ? { id: u.id, email: u.email ?? null } : null);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    useSession.getState().setUser(u ? { id: u.id, email: u.email ?? null } : null);
  });
} else {
  useSession.setState({ loading: false });
}
