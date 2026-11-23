import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, type MyProfile } from './api';
import { setLanguage } from './language';
import { logError } from './log';
import { supabase } from './supabase';

// Browsing the map needs no account (guideline 5.1.1: don't force sign-in for features that are
// not account-based). Booking, hosting, chat and the profile do; those screens call useSignedIn().
type SessionState =
  | { phase: 'loading' }
  | { phase: 'signedOut' }
  | { phase: 'signedIn'; session: Session; profile: MyProfile | null; profileError: boolean };

type SessionContextValue = {
  state: SessionState;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // The last profile fetched, tagged with whose it is, so an account switch never shows the
  // previous person's data.
  const [loaded, setLoaded] = useState<{ userId: string; profile: MyProfile | null; hasError: boolean } | null>(null);

  useEffect(() => {
    let isActive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isActive) setSession(data.session);
      })
      .catch((error: unknown) => {
        logError('getSession', error);
        if (isActive) setSession(null);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  const load = useCallback(
    (id: string): Promise<void> =>
      api.myProfile().then(
        (profile) => {
          setLoaded({ userId: id, profile, hasError: false });
          if (profile?.language) setLanguage(profile.language);
        },
        (error: unknown) => {
          logError('myProfile', error);
          setLoaded((prev) => ({ userId: id, profile: prev?.userId === id ? prev.profile : null, hasError: true }));
        },
      ),
    [],
  );

  useEffect(() => {
    if (!userId) return;
    let isActive = true;
    api.myProfile().then(
      (profile) => {
        if (!isActive) return;
        setLoaded({ userId, profile, hasError: false });
        if (profile?.language) setLanguage(profile.language);
      },
      (error: unknown) => {
        logError('myProfile', error);
        if (isActive) setLoaded({ userId, profile: null, hasError: true });
      },
    );
    return () => {
      isActive = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setLoaded(null);
  }, []);

  const state: SessionState = useMemo(() => {
    if (session === undefined) return { phase: 'loading' };
    if (session === null) return { phase: 'signedOut' };
    if (loaded?.userId !== session.user.id) return { phase: 'loading' };
    return { phase: 'signedIn', session, profile: loaded.profile, profileError: loaded.hasError };
  }, [session, loaded]);

  const value = useMemo(() => ({ state, refreshProfile, signOut }), [state, refreshProfile, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}

// The signed-in user's id, or null while browsing signed out.
export function useUserId(): string | null {
  const { state } = useSession();
  return state.phase === 'signedIn' ? state.session.user.id : null;
}

export function useMyProfile(): MyProfile | null {
  const { state } = useSession();
  return state.phase === 'signedIn' ? state.profile : null;
}
