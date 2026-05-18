import { createContext, useContext } from 'react';
import type { AuthState } from '@/types';

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => void;
  /** Atualiza o consentimento de coleta. Persiste em profiles quando há sessão Supabase. */
  setConsent: (value: boolean) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
