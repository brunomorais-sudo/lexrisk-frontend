
-- Storage policies for process-imports bucket
CREATE POLICY "Allow authenticated uploads to process-imports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'process-imports');

CREATE POLICY "Allow anon uploads to process-imports"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'process-imports');

CREATE POLICY "Allow read from process-imports"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'process-imports');

-- Also relax import_jobs RLS to allow anon inserts (since auth is mock-based)
CREATE POLICY "Allow anon insert import jobs"
ON public.import_jobs FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon select import jobs"
ON public.import_jobs FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon update import jobs"
ON public.import_jobs FOR UPDATE
TO anon
USING (true);

-- Client companies table
CREATE TABLE public.client_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text,
  responsible_law_firm_id text DEFAULT 'org-1',
  business_name text NOT NULL,
  trade_name text NOT NULL,
  cnpj text NOT NULL,
  industry text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read client companies"
ON public.client_companies FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert client companies"
ON public.client_companies FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update client companies"
ON public.client_companies FOR UPDATE TO anon, authenticated USING (true);
