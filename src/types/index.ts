// ==================== CORE TYPES ====================

export type UserRole = 'office_admin' | 'lawyer' | 'client_user';
export type RiskLevel = 'alto' | 'medio' | 'baixo';
export type ConfidenceLevel = 'alta' | 'media' | 'baixa';
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ProcessPhase = 'conhecimento' | 'recursal' | 'execucao' | 'arquivado';
export type ProConCategory = 'juridico' | 'probatorio' | 'processual' | 'estrategico';
export type DocumentType = 'peticao_inicial' | 'contestacao' | 'sentenca' | 'recurso' | 'ata_audiencia' | 'prova_documental' | 'laudo_pericial' | 'acordo' | 'outros';
export type GeneratedDocType = 'peticao' | 'recurso' | 'email_cliente' | 'resumo_executivo';
export type EvidenceSide = 'reclamante' | 'reclamada' | 'neutro';
export type ChatRole = 'user' | 'assistant' | 'system';

export interface Organization {
  id: string;
  type: 'law_firm' | 'client_company';
  name: string;
  cnpj: string;
  slug: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export type UserPlan = 'starter' | 'pro' | 'enterprise';

export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  /** Opt-in estrito: coleta silenciosa só ocorre se === true. */
  data_collection_consent?: boolean;
  /** Plano de assinatura. Ausente = starter. */
  plan?: UserPlan;
}

export interface OrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ClientCompany {
  id: string;
  organization_id: string;
  responsible_law_firm_id: string;
  business_name: string;
  trade_name: string;
  cnpj: string;
  industry: string;
  created_at: string;
}

export interface Process {
  id: string;
  client_company_id: string;
  process_number: string;
  area: 'trabalhista';
  tribunal: string;
  foro: string;
  vara: string;
  phase: ProcessPhase;
  claimant_name: string;
  defendant_name: string;
  procedural_pole: 'autor' | 'reu';
  subject_main: string;
  subject_tags: string[];
  claim_value: number;
  estimated_financial_exposure_min?: number;
  estimated_financial_exposure_base?: number;
  estimated_financial_exposure_max?: number;
  current_status: string;
  last_update_at: string;
  created_by: string;
  created_at: string;
  // Joined
  client_company?: ClientCompany;
  latest_analysis?: ProcessAnalysis;
}

export interface ProcessDocument {
  id: string;
  process_id: string;
  title: string;
  document_type: DocumentType;
  file_path: string;
  mime_type: string;
  extracted_text?: string;
  uploaded_by: string;
  created_at: string;
}

export interface ProcessEvent {
  id: string;
  process_id: string;
  event_date: string;
  event_type: string;
  description: string;
  source_document_id?: string;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  process_id: string;
  title: string;
  evidence_type: string;
  description: string;
  favors_side: EvidenceSide;
  source_document_id?: string;
  excerpt: string;
  relevance_score: number;
  created_at: string;
}

export interface AnalysisRun {
  id: string;
  process_id: string;
  status: AnalysisStatus;
  ai_provider: string;
  ai_model: string;
  started_at: string;
  finished_at?: string;
  triggered_by: string;
  version_number: number;
  error_message?: string;
}

export interface ProcessAnalysis {
  id: string;
  process_id: string;
  analysis_run_id: string;
  executive_summary: string;
  case_classification: string;
  case_value_identified: number;
  financial_impact_summary: string;
  risk_level: RiskLevel;
  risk_score_numeric?: number;
  confidence_level: ConfidenceLevel;
  justification_text: string;
  next_steps: string[];
  missing_information: string[];
  created_at: string;
  // Joined
  pros?: AnalysisProCon[];
  cons?: AnalysisProCon[];
  jurisprudence?: JurisprudenceReference[];
}

export interface AnalysisProCon {
  id: string;
  process_analysis_id: string;
  type: 'pro' | 'con';
  title: string;
  category: ProConCategory;
  description: string;
  legal_basis: string;
  evidence_basis: string;
  source_document_id?: string;
  source_excerpt?: string;
  weight: number;
  created_at: string;
}

export interface JurisprudenceReference {
  id: string;
  process_analysis_id: string;
  court: string;
  chamber: string;
  judge_rapporteur: string;
  judgment_date: string;
  publication_date: string;
  case_number: string;
  subject: string;
  summary: string;
  similarity_reason: string;
  tendency_for_case: 'favoravel' | 'desfavoravel' | 'neutro';
  source_url?: string;
  source_provider: string;
  recency_score: number;
  similarity_score: number;
  created_at: string;
}

export interface ChatThread {
  id: string;
  process_id: string;
  created_by: string;
  title: string;
  created_at: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: ChatRole;
  content: string;
  citations_json?: any;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  process_id: string;
  type: GeneratedDocType;
  title: string;
  content: string;
  generated_by: string;
  analysis_run_id?: string;
  created_at: string;
}

export interface PromptTemplate {
  id: string;
  key: string;
  label: string;
  description: string;
  content: string;
  version: number;
  active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: any;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  body: string;
  read_at?: string;
  created_at: string;
}

// UI-specific types
export interface DashboardStats {
  totalClients: number;
  totalProcesses: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  noAnalysis: number;
  totalExposure: number;
  recentProcesses: Process[];
}

export interface AuthState {
  user: User | null;
  role: UserRole | null;
  organizationId: string | null;
  lawFirmId: string | null;
  isLoading: boolean;
}
