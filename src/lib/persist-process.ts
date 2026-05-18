import { supabase } from '@/integrations/supabase/client';

/**
 * Persists an imported process and its analysis to the database.
 * Returns the new process ID.
 */
export async function persistImportedProcess(
  resultData: any,
  userId?: string,
  importJobId?: string,
): Promise<string> {
  const pd = resultData.process_data;
  const ra = pd.risk_analysis || {};
  const fi = pd.financial_impact || {};

  // Dedup: check if process_number already exists
  const processNumber = pd.process_number || 'Não identificado';
  if (processNumber !== 'Não identificado') {
    const { data: existing } = await supabase
      .from('processes')
      .select('id')
      .eq('process_number', processNumber)
      .limit(1)
      .maybeSingle();
    if (existing) return existing.id;
  }

  // 1. Insert process
  const { data: proc, error: procError } = await supabase
    .from('processes')
    .insert({
      import_job_id: importJobId || null,
      process_number: pd.process_number || 'Não identificado',
      area: 'trabalhista',
      tribunal: pd.tribunal || '',
      foro: pd.foro || '',
      vara: pd.vara || '',
      phase: pd.phase || 'conhecimento',
      claimant_name: pd.claimant_name || 'Não identificado',
      defendant_name: pd.defendant_name || 'Não identificado',
      procedural_pole: pd.procedural_pole || 'reu',
      subject_main: pd.subject_main || 'Importado',
      subject_tags: pd.subject_tags || [],
      claim_value: pd.claim_value || 0,
      estimated_financial_exposure_min: fi.exposure_min || 0,
      estimated_financial_exposure_base: fi.exposure_base || 0,
      estimated_financial_exposure_max: fi.exposure_max || 0,
      distribution_date: pd.distribution_date || null,
      current_status: pd.current_status || 'Processo importado',
      created_by: userId || null,
    } as any)
    .select('id')
    .single();

  if (procError) throw new Error(`Erro ao salvar processo: ${procError.message}`);
  const processId = proc.id;

  // 2. Insert analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('process_analyses')
    .insert({
      process_id: processId,
      executive_summary: pd.executive_summary || '',
      case_classification: pd.subject_main || '',
      case_value_identified: pd.claim_value || 0,
      financial_impact_summary: fi.summary || '',
      risk_level: ra.risk_level || 'medio',
      risk_score_numeric: ra.risk_score || 50,
      confidence_level: ra.confidence_level || 'media',
      justification_text: ra.justification || '',
      next_steps: pd.next_steps || [],
      missing_information: [],
    } as any)
    .select('id')
    .single();

  if (analysisError) throw new Error(`Erro ao salvar análise: ${analysisError.message}`);
  const analysisId = analysis.id;

  // 3. Insert arguments (pros + cons)
  const args: any[] = [];
  (pd.pros || []).forEach((p: any) => {
    args.push({
      process_analysis_id: analysisId,
      type: 'pro',
      title: p.title || '',
      category: p.category || 'juridico',
      description: p.description || '',
      legal_basis: p.legal_basis || '',
      evidence_basis: p.evidence_basis || '',
      weight: p.weight || 5,
    });
  });
  (pd.cons || []).forEach((c: any) => {
    args.push({
      process_analysis_id: analysisId,
      type: 'con',
      title: c.title || '',
      category: c.category || 'juridico',
      description: c.description || '',
      legal_basis: c.legal_basis || '',
      evidence_basis: c.evidence_basis || '',
      weight: c.weight || 5,
    });
  });

  if (args.length > 0) {
    const { error: argsError } = await supabase
      .from('process_arguments')
      .insert(args as any);
    if (argsError) console.error('Erro ao salvar argumentos:', argsError);
  }

  return processId;
}

/**
 * Fetches all imported processes from DB with their analyses and arguments,
 * mapped to the Process type shape used by the UI.
 */
export async function fetchImportedProcesses() {
  const { data: dbProcesses, error } = await supabase
    .from('processes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !dbProcesses) return [];

  const processIds = dbProcesses.map((p: any) => p.id);
  if (processIds.length === 0) return [];

  // Fetch analyses
  const { data: analyses } = await supabase
    .from('process_analyses')
    .select('*')
    .in('process_id', processIds);

  const analysisIds = (analyses || []).map((a: any) => a.id);

  // Fetch arguments
  let args: any[] = [];
  if (analysisIds.length > 0) {
    const { data: argsData } = await supabase
      .from('process_arguments')
      .select('*')
      .in('process_analysis_id', analysisIds);
    args = argsData || [];
  }

  return dbProcesses.map((p: any) => {
    const analysis = (analyses || []).find((a: any) => a.process_id === p.id);
    const pros = analysis ? args.filter((a: any) => a.process_analysis_id === analysis.id && a.type === 'pro') : [];
    const cons = analysis ? args.filter((a: any) => a.process_analysis_id === analysis.id && a.type === 'con') : [];

    return {
      id: p.id,
      client_company_id: p.client_company_id || '',
      distribution_date: p.distribution_date || null,
      process_number: p.process_number,
      area: p.area as 'trabalhista',
      tribunal: p.tribunal,
      foro: p.foro,
      vara: p.vara,
      phase: p.phase,
      claimant_name: p.claimant_name,
      defendant_name: p.defendant_name,
      procedural_pole: p.procedural_pole,
      subject_main: p.subject_main,
      subject_tags: p.subject_tags || [],
      claim_value: Number(p.claim_value) || 0,
      estimated_financial_exposure_min: Number(p.estimated_financial_exposure_min) || 0,
      estimated_financial_exposure_base: Number(p.estimated_financial_exposure_base) || 0,
      estimated_financial_exposure_max: Number(p.estimated_financial_exposure_max) || 0,
      current_status: p.current_status,
      last_update_at: p.last_update_at,
      created_by: p.created_by || '',
      created_at: p.created_at,
      latest_analysis: analysis ? {
        id: analysis.id,
        process_id: analysis.process_id,
        analysis_run_id: '',
        executive_summary: analysis.executive_summary,
        case_classification: analysis.case_classification,
        case_value_identified: Number(analysis.case_value_identified) || 0,
        financial_impact_summary: analysis.financial_impact_summary,
        risk_level: analysis.risk_level,
        risk_score_numeric: analysis.risk_score_numeric,
        confidence_level: analysis.confidence_level,
        justification_text: analysis.justification_text,
        next_steps: analysis.next_steps || [],
        missing_information: analysis.missing_information || [],
        created_at: analysis.created_at,
        pros: pros.map((a: any) => ({
          id: a.id,
          process_analysis_id: a.process_analysis_id,
          type: 'pro' as const,
          title: a.title,
          category: a.category,
          description: a.description,
          legal_basis: a.legal_basis,
          evidence_basis: a.evidence_basis,
          weight: a.weight,
          created_at: a.created_at,
        })),
        cons: cons.map((a: any) => ({
          id: a.id,
          process_analysis_id: a.process_analysis_id,
          type: 'con' as const,
          title: a.title,
          category: a.category,
          description: a.description,
          legal_basis: a.legal_basis,
          evidence_basis: a.evidence_basis,
          weight: a.weight,
          created_at: a.created_at,
        })),
      } : undefined,
    };
  });
}

/**
 * Fetches a single imported process by ID from the DB.
 */
export async function fetchProcessById(processId: string) {
  const all = await fetchImportedProcesses();
  return all.find(p => p.id === processId) || null;
}
