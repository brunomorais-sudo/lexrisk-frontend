import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractPdfText, type ExtractionProgress } from '@/lib/pdf-extract';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type ImportPhase = 'idle' | 'uploading' | 'extracting' | 'analyzing_chunks' | 'consolidating' | 'completed' | 'failed';

export interface ImportState {
  phase: ImportPhase;
  progress: number;
  chunksProcessed: number;
  totalChunks: number;
  extractionProgress: ExtractionProgress | null;
  error: string | null;
  fileName: string;
  resultData: any | null;
  dialogOpen: boolean;
}

const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/processar-importacao`;
const POLL_INTERVAL = 2000;

async function callEdgeFunction(body: Record<string, unknown>) {
  const resp = await fetch(PROCESS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errData.error || `Erro ${resp.status}`);
  }

  return resp.json();
}

export function useImportJob() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const [state, setState] = useState<ImportState>({
    phase: 'idle',
    progress: 0,
    chunksProcessed: 0,
    totalChunks: 0,
    extractionProgress: null,
    error: null,
    fileName: '',
    resultData: null,
    dialogOpen: false,
  });

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    jobIdRef.current = null;
    setState({
      phase: 'idle', progress: 0, chunksProcessed: 0, totalChunks: 0,
      extractionProgress: null, error: null, fileName: '', resultData: null, dialogOpen: false,
    });
  }, [stopPolling]);

  const processNextBatch = useCallback(async (jobId: string) => {
    try {
      const result = await callEdgeFunction({ action: 'process-batch', importJobId: jobId });

      setState(prev => ({
        ...prev,
        chunksProcessed: result.chunks_processed || prev.chunksProcessed,
        totalChunks: result.total_chunks || prev.totalChunks,
        progress: prev.totalChunks > 0
          ? 30 + Math.round((result.chunks_processed / result.total_chunks) * 50)
          : prev.progress,
      }));

      if (result.phase === 'consolidating') {
        setState(prev => ({ ...prev, phase: 'consolidating', progress: 80 }));
        // Trigger consolidation
        const consolidateResult = await callEdgeFunction({ action: 'consolidate', importJobId: jobId });

        if (consolidateResult.phase === 'completed') {
          stopPolling();
          setState(prev => ({
            ...prev,
            phase: 'completed',
            progress: 100,
            resultData: {
              process_data: consolidateResult.process_data,
              files_count: consolidateResult.files_count || 1,
              files: consolidateResult.files || [],
            },
          }));
          toast.success('Processo importado e analisado pela IA com sucesso!');
        }
      } else if (result.phase === 'analyzing_chunks') {
        // Continue processing - next batch will be triggered by polling
      }
    } catch (err: any) {
      console.error('Batch processing error:', err);
      // Don't fail the whole job on a single batch error - retry on next poll
      setState(prev => ({
        ...prev,
        error: `Erro no lote: ${err.message}. Retentando...`,
      }));
    }
  }, [stopPolling]);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();

    // Immediately process first batch
    processNextBatch(jobId);

    pollingRef.current = setInterval(async () => {
      // Check job status from DB
      const { data: job } = await supabase
        .from('import_jobs')
        .select('phase, chunks_processed, total_chunks, status, error_message, result_json')
        .eq('id', jobId)
        .single();

      if (!job) return;

      if (job.phase === 'completed' || job.status === 'completed') {
        stopPolling();
        const resultJson = job.result_json as any;
        setState(prev => ({
          ...prev,
          phase: 'completed',
          progress: 100,
          chunksProcessed: job.total_chunks || prev.totalChunks,
          resultData: resultJson ? {
            process_data: resultJson.process_data,
            files_count: resultJson.files_count || 1,
            files: [],
          } : prev.resultData,
        }));
        return;
      }

      if (job.phase === 'failed' || job.status === 'failed') {
        stopPolling();
        setState(prev => ({
          ...prev,
          phase: 'failed',
          error: job.error_message || 'Erro na importação',
        }));
        return;
      }

      // If still analyzing chunks, trigger next batch
      if (job.phase === 'analyzing_chunks' && (job.chunks_processed || 0) < (job.total_chunks || 0)) {
        setState(prev => ({
          ...prev,
          chunksProcessed: job.chunks_processed || 0,
          totalChunks: job.total_chunks || 0,
          progress: 30 + Math.round(((job.chunks_processed || 0) / (job.total_chunks || 1)) * 50),
        }));
        processNextBatch(jobId);
      }
    }, POLL_INTERVAL);
  }, [stopPolling, processNextBatch]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isZip = lowerName.endsWith('.zip');
    const isPdf = lowerName.endsWith('.pdf');
    const MAX_FILE_BYTES = 100 * 1024 * 1024;

    if (!isZip && !isPdf) {
      toast.error('Por favor, selecione um arquivo .zip ou .pdf');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      toast.error('Arquivo muito grande. Máximo: 100MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setState(prev => ({
      ...prev,
      fileName: file.name,
      dialogOpen: true,
      phase: 'uploading',
      progress: 5,
      error: null,
      resultData: null,
    }));

    try {
      // 1. Upload file
      const filePath = `imports/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('process-imports')
        .upload(filePath, file);

      if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

      setState(prev => ({ ...prev, progress: 10 }));

      // 2. Create job record
      const { data: jobData, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          file_name: file.name,
          file_path: filePath,
          status: 'pending',
          created_by: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)
            ? user.id : null,
        })
        .select()
        .single();

      if (jobError) throw new Error(`Erro ao criar job: ${jobError.message}`);

      jobIdRef.current = jobData.id;
      setState(prev => ({ ...prev, progress: 15 }));

      if (isPdf) {
        // 3. Extract text in browser
        setState(prev => ({ ...prev, phase: 'extracting' }));

        const { chunks } = await extractPdfText(file, (p) => {
          setState(prev => ({
            ...prev,
            extractionProgress: p,
            progress: 15 + Math.round((p.currentPage / Math.max(p.totalPages, 1)) * 15),
          }));
        });

        setState(prev => ({ ...prev, extractionProgress: null, progress: 30, phase: 'analyzing_chunks' }));

        // 4. Send chunks to edge function (start action - returns immediately)
        await callEdgeFunction({
          action: 'start',
          importJobId: jobData.id,
          fileType: 'pdf',
          textChunks: chunks,
        });

        setState(prev => ({
          ...prev,
          totalChunks: chunks.length,
        }));

        // 5. Start polling + batch processing
        startPolling(jobData.id);
      } else {
        // ZIP: use legacy single-call flow
        setState(prev => ({ ...prev, phase: 'analyzing_chunks', progress: 30 }));

        const result = await callEdgeFunction({
          importJobId: jobData.id,
          fileType: 'zip',
          filePath,
        });

        setState(prev => ({
          ...prev,
          phase: 'completed',
          progress: 100,
          resultData: result,
        }));
        toast.success('Processo importado e analisado pela IA com sucesso!');
      }
    } catch (err: any) {
      console.error('Import error:', err);

      if (jobIdRef.current) {
        await supabase
          .from('import_jobs')
          .update({
            status: 'failed',
            phase: 'failed',
            error_message: err.message || 'Erro ao importar',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobIdRef.current);
      }

      setState(prev => ({
        ...prev,
        phase: 'failed',
        error: err.message || 'Erro ao importar arquivo',
      }));
      toast.error(err.message || 'Erro ao importar');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user, startPolling]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    state,
    fileInputRef,
    handleImportClick,
    handleFileSelected,
    reset,
  };
}
