-- Table: processes (persisted imported processes)
CREATE TABLE public.processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id uuid REFERENCES public.client_companies(id) ON DELETE SET NULL,
  import_job_id uuid REFERENCES public.import_jobs(id) ON DELETE SET NULL,
  process_number text NOT NULL DEFAULT 'Não identificado',
  area text NOT NULL DEFAULT 'trabalhista',
  tribunal text NOT NULL DEFAULT '',
  foro text NOT NULL DEFAULT '',
  vara text NOT NULL DEFAULT '',
  phase text NOT NULL DEFAULT 'conhecimento',
  claimant_name text NOT NULL DEFAULT 'Não identificado',
  defendant_name text NOT NULL DEFAULT 'Não identificado',
  procedural_pole text NOT NULL DEFAULT 'reu',
  subject_main text NOT NULL DEFAULT '',
  subject_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  claim_value numeric NOT NULL DEFAULT 0,
  estimated_financial_exposure_min numeric DEFAULT 0,
  estimated_financial_exposure_base numeric DEFAULT 0,
  estimated_financial_exposure_max numeric DEFAULT 0,
  current_status text NOT NULL DEFAULT '',
  last_update_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read processes" ON public.processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert processes" ON public.processes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon can read processes" ON public.processes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert processes" ON public.processes FOR INSERT TO anon WITH CHECK (true);

-- Table: process_analyses
CREATE TABLE public.process_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  executive_summary text NOT NULL DEFAULT '',
  case_classification text NOT NULL DEFAULT '',
  case_value_identified numeric NOT NULL DEFAULT 0,
  financial_impact_summary text NOT NULL DEFAULT '',
  risk_level text NOT NULL DEFAULT 'medio',
  risk_score_numeric integer DEFAULT 50,
  confidence_level text NOT NULL DEFAULT 'media',
  justification_text text NOT NULL DEFAULT '',
  next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_information jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.process_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read analyses" ON public.process_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert analyses" ON public.process_analyses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon can read analyses" ON public.process_analyses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert analyses" ON public.process_analyses FOR INSERT TO anon WITH CHECK (true);

-- Table: process_arguments (pros and cons)
CREATE TABLE public.process_arguments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_analysis_id uuid NOT NULL REFERENCES public.process_analyses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pro', 'con')),
  title text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'juridico',
  description text NOT NULL DEFAULT '',
  legal_basis text NOT NULL DEFAULT '',
  evidence_basis text NOT NULL DEFAULT '',
  weight integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.process_arguments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read arguments" ON public.process_arguments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert arguments" ON public.process_arguments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon can read arguments" ON public.process_arguments FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert arguments" ON public.process_arguments FOR INSERT TO anon WITH CHECK (true);