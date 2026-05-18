-- Create storage bucket for process document imports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('process-imports', 'process-imports', false, 104857600, ARRAY['application/zip', 'application/x-zip-compressed', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']);

-- Allow authenticated users to upload to process-imports bucket
CREATE POLICY "Authenticated users can upload to process-imports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'process-imports');

-- Allow authenticated users to read their uploads
CREATE POLICY "Authenticated users can read process-imports"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'process-imports');

-- Create table to track import jobs
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_json JSONB,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import jobs"
ON public.import_jobs FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can insert import jobs"
ON public.import_jobs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own import jobs"
ON public.import_jobs FOR UPDATE TO authenticated
USING (created_by = auth.uid());
