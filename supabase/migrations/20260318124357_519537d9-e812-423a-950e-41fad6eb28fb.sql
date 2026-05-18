ALTER TABLE public.import_jobs 
ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'queued',
ADD COLUMN IF NOT EXISTS total_chunks integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS chunks_processed integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS partial_results jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS text_chunks jsonb DEFAULT NULL;