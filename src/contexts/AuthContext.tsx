import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { AuthState } from '@/types';
import { users, memberships, clientCompanies } from '@/data/mock-data';
import { configurarMemoria } from '@/lib/memoria';

import { AuthContext } from './auth-context-value';

export { useAuth } from './auth-context-value';

// Demo accounts for testing
const DEMO_ACCOUNTS: Record<string, string> = {
  'ricardo@machadoferreira.adv.br': 'user-1',
  'camila@machadoferreira.adv.br': 'user-2',
  'andre@machadoferreira.adv.br': 'user-3',
  'marina@techbrasil.com.br': 'user-4',
  'carlos@indpaulista.com.br': 'user-5',
  'fernanda@logisul.com.br': 'user-6',
};

const AUTH_STORAGE_KEY = 'lexrisk:auth:user_id';

const EMPTY_STATE: AuthState = {
  user: null,
  role: null,
  organizationId: null,
  lawFirmId: null,
  isLoading: false,
};

function resolveAuthFor(userId: string): AuthState | null {
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  const membership = memberships.find(m => m.user_id === userId && m.status === 'active');
  if (!membership) return null;

  let lawFirmId: string | null = null;
  if (membership.role === 'client_user') {
    const company = clientCompanies.find(c => c.organization_id === membership.organization_id);
    lawFirmId = company?.responsible_law_firm_id || null;
  } else {
    lawFirmId = membership.organization_id;
  }

  return {
    user,
    role: membership.role,
    organizationId: membership.organization_id,
    lawFirmId,
    isLoading: false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const storedUserId = typeof localStorage !== 'undefined'
        ? localStorage.getItem(AUTH_STORAGE_KEY)
        : null;
      if (storedUserId) {
        const auth = resolveAuthFor(storedUserId);
        if (auth) return auth;
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch { /* ignore */ }
    return EMPTY_STATE;
  });

  const resolveAuth = useCallback((userId: string) => resolveAuthFor(userId), []);


  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true }));
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    const userId = DEMO_ACCOUNTS[email.trim().toLowerCase()];
    if (!userId) {
      setState(s => ({ ...s, isLoading: false }));
      return false;
    }

    const auth = resolveAuth(userId);
    if (!auth) {
      setState(s => ({ ...s, isLoading: false }));
      return false;
    }

    setState(auth);
    try { localStorage.setItem(AUTH_STORAGE_KEY, userId); } catch { /* ignore */ }
    return true;
  }, [resolveAuth]);

  const logout = useCallback(() => {
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
    setState({ user: null, role: null, organizationId: null, lawFirmId: null, isLoading: false });
  }, []);

  const switchUser = useCallback((userId: string) => {
    const auth = resolveAuth(userId);
    if (auth) {
      setState(auth);
      try { localStorage.setItem(AUTH_STORAGE_KEY, userId); } catch { /* ignore */ }
    }
  }, [resolveAuth]);


  const setConsent = useCallback(async (value: boolean) => {
    // Mock: atualiza apenas o estado local. memoria.ts respeita imediatamente.
    // Revogação NÃO apaga memória já coletada — apenas para nova coleta.
    setState((s) =>
      s.user ? { ...s, user: { ...s.user, data_collection_consent: value } } : s,
    );
  }, []);

  // Mantém o localStorage em sincronia com o state — qualquer caminho que
  // atualize `user` é refletido aqui, evitando divergências.
  useEffect(() => {
    try {
      if (state.user) {
        localStorage.setItem(AUTH_STORAGE_KEY, state.user.id);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, [state.user]);

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

