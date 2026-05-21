import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProcessDocumento {
  id: string;
  process_id: string;
  document_type: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  extracted_text: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useProcessDocumentos(processId: string) {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<ProcessDocumento[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!processId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase
        .from('process_documents' as any)
        .select('*')
        .eq('process_id', processId)
        .eq('document_type', 'upload_usuario')
        .order('created_at', { ascending: false }) as any);

      if (err) throw err;
      setDocumentos((data as ProcessDocumento[]) || []);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const uploadDocumento = async (file: File): Promise<ProcessDocumento | null> => {
    if (!processId) return null;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('process_id', processId);
      if (user?.id) formData.append('uploaded_by', user.id);

      const resp = await fetch('/api/upload-documento', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      // Recarrega lista
      await carregar();
      return null;
    } catch (e: any) {
      setError(e.message || 'Erro no upload');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deletarDocumento = async (id: string) => {
    try {
      await (supabase.from('process_documents' as any).delete().eq('id', id) as any);
      setDocumentos(prev => prev.filter(d => d.id !== id));
    } catch (e: any) {
      setError(e.message || 'Erro ao deletar');
    }
  };

  return {
    documentos,
    loading,
    uploading,
    error,
    carregar,
    uploadDocumento,
    deletarDocumento,
  };
}
