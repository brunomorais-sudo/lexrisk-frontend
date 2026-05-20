-- Novos campos para enriquecimento PJe (1º e 2º grau)
ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS pje_graus_encontrados TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tribunal_orgao_g2 TEXT;

-- Index para buscar por document_type
CREATE INDEX IF NOT EXISTS idx_process_documents_type
  ON public.process_documents(document_type);

-- Index para busca por processo + tipo
CREATE INDEX IF NOT EXISTS idx_process_documents_process_type
  ON public.process_documents(process_id, document_type);
