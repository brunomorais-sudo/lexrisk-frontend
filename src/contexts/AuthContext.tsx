import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { AuthState } from '@/types';
import { configurarMemoria } from '@/lib/memoria';
import { supabase } from '@/integrations/supabase/client';

import { AuthContext } from './auth-context-value';

export { useAuth } from './auth-context-value';

const EMPTY_STATE: AuthState = {
  user: null,
  role: null,
  organizationId: null,
  lawFirmId: null,
  isLoading: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY_STATE);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setState({
          user: {
            id: u.id,
            email: u.email ?? '',
            full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? '',
            avatar_url: u.user_metadata?.avatar_url,
            created_at: u.created_at ?? new Date().toISOString(),
            data_collection_consent: true,
          },
          role: 'law_firm_admin',
          organizationId: u.id,
          lawFirmId: u.id,
          isLoading: false,
        });
      } else {
        setState({ ...EMPTY_STATE, isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setState({
          user: {
            id: u.id,
            email: u.email ?? '',
            full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? '',
            avatar_url: u.user_metadata?.avatar_url,
            created_at: u.created_at ?? new Date().toISOString(),
            data_collection_consent: true,
          },
          role: 'law_firm_admin',
          organizationId: u.id,
          lawFirmId: u.id,
          isLoading: false,
        });
      } else {
        setState({ user: null, role: null, organizationId: null, lawFirmId: null, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        setState(s => ({ ...s, isLoading: false }));
        return false;
      }
      return true;
    } catch {
      setState(s => ({ ...s, isLoading: false }));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, role: null, organizationId: null, lawFirmId: null, isLoading: false });
  }, []);

  const switchUser = useCallback((_userId: string) => {}, []);

  const setConsent = useCallback(async (value: boolean) => {
    setState((s) =>
      s.user ? { ...s, user: { ...s.user, data_collection_consent: value } } : s,
    );
  }, []);

  useEffect(() => {
    configurarMemoria(state.user, state.lawFirmId);
  }, [state.user, state.lawFirmId]);

  const value = useMemo(
    () => ({ ...state, login, logout, switchUser, setConsent }),
    [state, login, logout, switchUser, setConsent],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
