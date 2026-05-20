import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PjeCredencial {
  id: string;
  cpf: string;
  nome: string | null;
  oab: string | null;
  created_at: string;
  updated_at: string;
}

export function usePjeCredentials() {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const buscarCredenciais = async (): Promise<PjeCredencial | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await (supabase as any).from('pje_credentials').select('id,cpf,nome,oab,created_at,updated_at').eq('user_id', user.id).maybeSingle();
    if (error) { console.error('[usePjeCredentials] buscar:', error); return null; }
    return data as PjeCredencial | null;
  };

  const salvarCredenciais = async (cpf: string, senha: string, nome?: string, oab?: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Usuario nao autenticado'); return false; }
      const cpfDigits = cpf.replace(/\D/g, '');
      const senhaEncoded = btoa(unescape(encodeURIComponent(senha)));
      const { error } = await (supabase as any).from('pje_credentials').upsert({ user_id: user.id, cpf: cpfDigits, senha_encrypted: senhaEncoded, nome: nome || null, oab: oab || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) { console.error('[usePjeCredentials] salvar:', error); toast.error('Erro ao salvar credenciais: ' + error.message); return false; }
      return true;
    } finally { setIsSaving(false); }
  };

  const testarLogin = async (cpf: string, senha: string): Promise<{ ok: boolean; error?: string }> => {
    setIsTesting(true);
    try {
      const resp = await fetch('/api/pje-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), senha }) });
      const data = await resp.json();
      if (!resp.ok) return { ok: false, error: data.error || 'Erro de autenticacao' };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Falha de conexao com o servidor' };
    } finally { setIsTesting(false); }
  };

  const buscarTokenAtivo = async (): Promise<string | null> => {
    const cred = await buscarCredenciais();
    if (!cred) return null;
    try {
      const senha = decodeURIComponent(escape(atob(cred.cpf)));
      const resp = await fetch('/api/pje-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: cred.cpf, senha }) });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.token || null;
    } catch { return null; }
  };

  return { buscarCredenciais, salvarCredenciais, testarLogin, buscarTokenAtivo, isSaving, isTesting };
}
