import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PjeDocStatus = 'idle' | 'loading' | 'success' | 'api_not_available' | 'unauthorized' | 'error';

export interface PjeDocumento {
  id: string;
  titulo: string;
  tipo: string;
  data_juntada: string | null;
  tamanho_bytes: number | null;
  storage_path: string | null;
}

export function usePjeDocumentos(processId: string) {
  const [status, setStatus] = useState<PjeDocStatus>('idle');
  const [documentos, setDocumentos] = useState<PjeDocumento[]>([]);
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

  useEffect(() => {
    checkCredentials();
    carregarDocumentosSalvos();
  }, [processId]);

  const checkCredentials = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHasCredentials(false); return; }
    const { data } = await (supabase as any).from('pje_credentials').select('id').eq('user_id', user.id).maybeSingle();
    setHasCredentials(!!data);
  };

  const carregarDocumentosSalvos = async () => {
    const { data } = await (supabase as any).from('process_documents_pje').select('*').eq('process_id', processId).order('data_juntada', { ascending: false });
    if (data) setDocumentos(data as PjeDocumento[]);
  };

  const buscarDocumentos = async (processNumber: string, tribunal: string) => {
    setStatus('loading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('unauthorized'); return; }
      const { data: cred } = await (supabase as any).from('pje_credentials').select('cpf,senha_encrypted').eq('user_id', user.id).maybeSingle();
      if (!cred) { setStatus('unauthorized'); return; }

      const senha = decodeURIComponent(escape(atob(cred.senha_encrypted)));
      const authResp = await fetch('/api/pje-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: cred.cpf, senha }) });
      if (!authResp.ok) { setStatus('unauthorized'); toast.error('Sessao PDPJ expirada. Reconfigure suas credenciais.'); return; }
      const { token } = await authResp.json();

      const docResp = await fetch('/api/pje-documentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tribunal, process_number: processNumber, token }) });
      const result = await docResp.json();

      if (result.status === 'api_not_available') { setStatus('api_not_available'); return; }
      if (result.status === 'unauthorized') { setStatus('unauthorized'); return; }

      const docs: PjeDocumento[] = (result.documentos || []).map((d: any) => ({
        id: String(d.id), titulo: d.titulo, tipo: d.tipo,
        data_juntada: d.dataJuntada || null, tamanho_bytes: d.tamanhoBytes || null, storage_path: null,
      }));

      if (docs.length > 0) {
        await (supabase as any).from('process_documents_pje').upsert(
          docs.map(d => ({ ...d, process_id: processId, baixado_em: new Date().toISOString() })),
          { onConflict: 'process_id,document_id' }
        );
        await carregarDocumentosSalvos();
      }
      setStatus('success');
      toast.success(`${docs.length} peca(s) encontrada(s) no PJe`);
    } catch (err) {
      console.error('[usePjeDocumentos]', err);
      setStatus('error');
    }
  };

  return { status, documentos, hasCredentials, buscarDocumentos, carregarDocumentosSalvos };
}
