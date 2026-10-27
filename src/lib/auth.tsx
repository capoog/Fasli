import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, configured } from './supabase';
import type { Profile } from './types';

export const PROFILE_COLS = 'id, full_name, role, school_id, locale';

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True once a profile fetch finished (even if it failed), so screens can offer a retry. */
  profileTried: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileTried, setProfileTried] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setProfileTried(false); return; }
    const { data } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', s.user.id).maybeSingle();
    setProfile((data as Profile) ?? null);
    setProfileTried(true);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // Defer the query so it never runs inside the auth callback (avoids a client deadlock).
      setTimeout(() => { loadProfile(s); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<Ctx>(() => ({
    session, profile, loading, profileTried,
    refresh: () => loadProfile(session),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
  }), [session, profile, loading, profileTried, loadProfile]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

/** The signed-in profile; screens inside the app group can rely on it. */
export function useMe(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('No profile');
  return profile;
}
