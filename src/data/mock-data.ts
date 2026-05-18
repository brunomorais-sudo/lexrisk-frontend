import type {
  Organization, User, OrganizationMembership, ClientCompany, Process,
  ProcessDocument, ProcessEvent, EvidenceItem, AnalysisRun, ProcessAnalysis,
  AnalysisProCon, JurisprudenceReference, ChatThread, ChatMessage,
  GeneratedDocument, PromptTemplate, AuditLog, DashboardStats
} from '@/types';

// ==================== ORGANIZATIONS ====================
export const organizations: Organization[] = [
  { id: 'org-1', type: 'law_firm', name: 'Machado, Ferreira & Associados', cnpj: '12.345.678/0001-90', slug: 'machado-ferreira', status: 'active', created_at: '2024-01-15T10:00:00Z' },
  { id: 'org-2', type: 'client_company', name: 'TechBrasil Soluções S.A.', cnpj: '23.456.789/0001-01', slug: 'techbrasil', status: 'active', created_at: '2024-02-01T10:00:00Z' },
  { id: 'org-3', type: 'client_company', name: 'Indústrias Paulista Ltda.', cnpj: '34.567.890/0001-12', slug: 'ind-paulista', status: 'active', created_at: '2024-02-15T10:00:00Z' },
  { id: 'org-4', type: 'client_company', name: 'LogiSul Transportes S.A.', cnpj: '45.678.901/0001-23', slug: 'logisul', status: 'active', created_at: '2024-03-01T10:00:00Z' },
];

// ==================== USERS ====================
export const users: User[] = [
  { id: 'user-1', full_name: 'Dr. Ricardo Machado', email: 'ricardo@machadoferreira.adv.br', created_at: '2024-01-15T10:00:00Z', plan: 'enterprise', data_collection_consent: false },
  { id: 'user-2', full_name: 'Dra. Camila Ferreira', email: 'camila@machadoferreira.adv.br', created_at: '2024-01-15T10:00:00Z', plan: 'pro', data_collection_consent: false },
  { id: 'user-3', full_name: 'Dr. André Santos', email: 'andre@machadoferreira.adv.br', created_at: '2024-01-20T10:00:00Z', plan: 'starter', data_collection_consent: false },
  { id: 'user-4', full_name: 'Marina Costa', email: 'marina@techbrasil.com.br', created_at: '2024-02-01T10:00:00Z', plan: 'pro', data_collection_consent: false },
  { id: 'user-5', full_name: 'Carlos Oliveira', email: 'carlos@indpaulista.com.br', created_at: '2024-02-15T10:00:00Z', plan: 'starter', data_collection_consent: false },
  { id: 'user-6', full_name: 'Fernanda Lima', email: 'fernanda@logisul.com.br', created_at: '2024-03-01T10:00:00Z', plan: 'starter', data_collection_consent: false },
];

// ==================== MEMBERSHIPS ====================
export const memberships: OrganizationMembership[] = [
  { id: 'mem-1', user_id: 'user-1', organization_id: 'org-1', role: 'office_admin', status: 'active', created_at: '2024-01-15T10:00:00Z' },
  { id: 'mem-2', user_id: 'user-2', organization_id: 'org-1', role: 'lawyer', status: 'active', created_at: '2024-01-15T10:00:00Z' },
  { id: 'mem-3', user_id: 'user-3', organization_id: 'org-1', role: 'lawyer', status: 'active', created_at: '2024-01-20T10:00:00Z' },
  { id: 'mem-4', user_id: 'user-4', organization_id: 'org-2', role: 'client_user', status: 'active', created_at: '2024-02-01T10:00:00Z' },
  { id: 'mem-5', user_id: 'user-5', organization_id: 'org-3', role: 'client_user', status: 'active', created_at: '2024-02-15T10:00:00Z' },
  { id: 'mem-6', user_id: 'user-6', organization_id: 'org-4', role: 'client_user', status: 'active', created_at: '2024-03-01T10:00:00Z' },
];

// ==================== CLIENT COMPANIES ====================
export const clientCompanies: ClientCompany[] = [
  { id: 'cc-1', organization_id: 'org-2', responsible_law_firm_id: 'org-1', business_name: 'TechBrasil Soluções S.A.', trade_name: 'TechBrasil', cnpj: '23.456.789/0001-01', industry: 'Tecnologia', created_at: '2024-02-01T10:00:00Z' },
  { id: 'cc-2', organization_id: 'org-3', responsible_law_firm_id: 'org-1', business_name: 'Indústrias Paulista Ltda.', trade_name: 'Ind. Paulista', cnpj: '34.567.890/0001-12', industry: 'Manufatura', created_at: '2024-02-15T10:00:00Z' },
  { id: 'cc-3', organization_id: 'org-4', responsible_law_firm_id: 'org-1', business_name: 'LogiSul Transportes S.A.', trade_name: 'LogiSul', cnpj: '45.678.901/0001-23', industry: 'Logística e Transporte', created_at: '2024-03-01T10:00:00Z' },
];

// ==================== PROCESSES ====================
export const processes: Process[] = [
  {
    id: 'proc-1', client_company_id: 'cc-1', process_number: '0001234-56.2024.5.02.0001',
    area: 'trabalhista', tribunal: 'TRT-2', foro: 'São Paulo', vara: '1ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'João Silva dos Santos', defendant_name: 'TechBrasil Soluções S.A.',
    procedural_pole: 'reu', subject_main: 'Horas extras e dano moral',
    subject_tags: ['horas_extras', 'dano_moral', 'adicional_noturno'],
    claim_value: 250000, estimated_financial_exposure_min: 80000, estimated_financial_exposure_base: 150000,
    estimated_financial_exposure_max: 280000, current_status: 'Aguardando audiência de instrução',
    last_update_at: '2024-11-20T14:00:00Z', created_by: 'user-2', created_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'proc-2', client_company_id: 'cc-1', process_number: '0002345-67.2024.5.02.0015',
    area: 'trabalhista', tribunal: 'TRT-2', foro: 'São Paulo', vara: '15ª Vara do Trabalho',
    phase: 'recursal', claimant_name: 'Maria Aparecida Oliveira', defendant_name: 'TechBrasil Soluções S.A.',
    procedural_pole: 'reu', subject_main: 'Rescisão indireta e verbas rescisórias',
    subject_tags: ['rescisao_indireta', 'verbas_rescisorias', 'fgts'],
    claim_value: 180000, estimated_financial_exposure_min: 120000, estimated_financial_exposure_base: 180000,
    estimated_financial_exposure_max: 220000, current_status: 'Recurso ordinário em tramitação',
    last_update_at: '2024-11-18T10:00:00Z', created_by: 'user-2', created_at: '2024-04-15T10:00:00Z',
  },
  {
    id: 'proc-3', client_company_id: 'cc-1', process_number: '0003456-78.2024.5.02.0042',
    area: 'trabalhista', tribunal: 'TRT-2', foro: 'São Paulo', vara: '42ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'Pedro Henrique Costa', defendant_name: 'TechBrasil Soluções S.A.',
    procedural_pole: 'reu', subject_main: 'Equiparação salarial',
    subject_tags: ['equiparacao_salarial', 'diferenca_salarial'],
    claim_value: 95000, current_status: 'Perícia designada',
    last_update_at: '2024-11-15T10:00:00Z', created_by: 'user-3', created_at: '2024-07-20T10:00:00Z',
  },
  {
    id: 'proc-4', client_company_id: 'cc-1', process_number: '0004567-89.2024.5.02.0003',
    area: 'trabalhista', tribunal: 'TRT-2', foro: 'São Paulo', vara: '3ª Vara do Trabalho',
    phase: 'execucao', claimant_name: 'Ana Beatriz Ferreira', defendant_name: 'TechBrasil Soluções S.A.',
    procedural_pole: 'reu', subject_main: 'Assédio moral e dano moral',
    subject_tags: ['assedio_moral', 'dano_moral', 'indenizacao'],
    claim_value: 500000, estimated_financial_exposure_min: 200000, estimated_financial_exposure_base: 350000,
    estimated_financial_exposure_max: 500000, current_status: 'Fase de execução - cálculos em elaboração',
    last_update_at: '2024-11-22T10:00:00Z', created_by: 'user-2', created_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 'proc-5', client_company_id: 'cc-2', process_number: '0005678-90.2024.5.15.0001',
    area: 'trabalhista', tribunal: 'TRT-15', foro: 'Campinas', vara: '1ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'Roberto Carlos Mendes', defendant_name: 'Indústrias Paulista Ltda.',
    procedural_pole: 'reu', subject_main: 'Acidente de trabalho e estabilidade',
    subject_tags: ['acidente_trabalho', 'estabilidade', 'dano_moral', 'pensao_mensal'],
    claim_value: 800000, estimated_financial_exposure_min: 400000, estimated_financial_exposure_base: 600000,
    estimated_financial_exposure_max: 850000, current_status: 'Aguardando laudo pericial',
    last_update_at: '2024-11-21T10:00:00Z', created_by: 'user-3', created_at: '2024-03-05T10:00:00Z',
  },
  {
    id: 'proc-6', client_company_id: 'cc-2', process_number: '0006789-01.2024.5.15.0008',
    area: 'trabalhista', tribunal: 'TRT-15', foro: 'Campinas', vara: '8ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'Luciana Barbosa Silva', defendant_name: 'Indústrias Paulista Ltda.',
    procedural_pole: 'reu', subject_main: 'Insalubridade e periculosidade',
    subject_tags: ['insalubridade', 'periculosidade', 'adicional'],
    claim_value: 120000, estimated_financial_exposure_min: 40000, estimated_financial_exposure_base: 75000,
    estimated_financial_exposure_max: 130000, current_status: 'Instrução processual',
    last_update_at: '2024-11-19T10:00:00Z', created_by: 'user-3', created_at: '2024-05-12T10:00:00Z',
  },
  {
    id: 'proc-7', client_company_id: 'cc-2', process_number: '0007890-12.2024.5.15.0012',
    area: 'trabalhista', tribunal: 'TRT-15', foro: 'Campinas', vara: '12ª Vara do Trabalho',
    phase: 'recursal', claimant_name: 'Francisco Almeida Neto', defendant_name: 'Indústrias Paulista Ltda.',
    procedural_pole: 'reu', subject_main: 'Vínculo empregatício e verbas',
    subject_tags: ['vinculo_empregaticio', 'verbas_rescisorias', 'pejotizacao'],
    claim_value: 350000, estimated_financial_exposure_min: 200000, estimated_financial_exposure_base: 300000,
    estimated_financial_exposure_max: 380000, current_status: 'Sentença desfavorável - recurso interposto',
    last_update_at: '2024-11-17T10:00:00Z', created_by: 'user-2', created_at: '2024-02-28T10:00:00Z',
  },
  {
    id: 'proc-8', client_company_id: 'cc-2', process_number: '0008901-23.2024.5.15.0003',
    area: 'trabalhista', tribunal: 'TRT-15', foro: 'Campinas', vara: '3ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'Patrícia Souza Lima', defendant_name: 'Indústrias Paulista Ltda.',
    procedural_pole: 'reu', subject_main: 'Diferenças salariais e desvio de função',
    subject_tags: ['desvio_funcao', 'diferenca_salarial', 'equiparacao'],
    claim_value: 75000, current_status: 'Audiência inicial designada',
    last_update_at: '2024-11-10T10:00:00Z', created_by: 'user-3', created_at: '2024-08-15T10:00:00Z',
  },
  {
    id: 'proc-9', client_company_id: 'cc-3', process_number: '0009012-34.2024.5.04.0001',
    area: 'trabalhista', tribunal: 'TRT-4', foro: 'Porto Alegre', vara: '1ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'Marcos Vinícius Rocha', defendant_name: 'LogiSul Transportes S.A.',
    procedural_pole: 'reu', subject_main: 'Horas extras e intervalo intrajornada',
    subject_tags: ['horas_extras', 'intervalo_intrajornada', 'motorista'],
    claim_value: 200000, estimated_financial_exposure_min: 100000, estimated_financial_exposure_base: 160000,
    estimated_financial_exposure_max: 220000, current_status: 'Instrução processual em andamento',
    last_update_at: '2024-11-22T10:00:00Z', created_by: 'user-2', created_at: '2024-04-01T10:00:00Z',
  },
  {
    id: 'proc-10', client_company_id: 'cc-3', process_number: '0010123-45.2024.5.04.0015',
    area: 'trabalhista', tribunal: 'TRT-4', foro: 'Porto Alegre', vara: '15ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'Cláudia Regina dos Santos', defendant_name: 'LogiSul Transportes S.A.',
    procedural_pole: 'reu', subject_main: 'Acidente de trajeto e responsabilidade',
    subject_tags: ['acidente_trajeto', 'responsabilidade_civil', 'dano_moral'],
    claim_value: 450000, estimated_financial_exposure_min: 150000, estimated_financial_exposure_base: 300000,
    estimated_financial_exposure_max: 480000, current_status: 'Perícia médica designada',
    last_update_at: '2024-11-20T10:00:00Z', created_by: 'user-3', created_at: '2024-05-20T10:00:00Z',
  },
  {
    id: 'proc-11', client_company_id: 'cc-3', process_number: '0011234-56.2024.5.04.0007',
    area: 'trabalhista', tribunal: 'TRT-4', foro: 'Porto Alegre', vara: '7ª Vara do Trabalho',
    phase: 'recursal', claimant_name: 'Diego Fernandes Martins', defendant_name: 'LogiSul Transportes S.A.',
    procedural_pole: 'reu', subject_main: 'Dispensa discriminatória',
    subject_tags: ['dispensa_discriminatoria', 'reintegracao', 'dano_moral'],
    claim_value: 300000, estimated_financial_exposure_min: 180000, estimated_financial_exposure_base: 250000,
    estimated_financial_exposure_max: 320000, current_status: 'Recurso ordinário - aguardando julgamento',
    last_update_at: '2024-11-16T10:00:00Z', created_by: 'user-2', created_at: '2024-02-10T10:00:00Z',
  },
  {
    id: 'proc-12', client_company_id: 'cc-3', process_number: '0012345-67.2024.5.04.0020',
    area: 'trabalhista', tribunal: 'TRT-4', foro: 'Porto Alegre', vara: '20ª Vara do Trabalho',
    phase: 'conhecimento', claimant_name: 'Juliana Pereira Ramos', defendant_name: 'LogiSul Transportes S.A.',
    procedural_pole: 'reu', subject_main: 'Assédio sexual e dano moral',
    subject_tags: ['assedio_sexual', 'dano_moral', 'rescisao_indireta'],
    claim_value: 600000, estimated_financial_exposure_min: 250000, estimated_financial_exposure_base: 450000,
    estimated_financial_exposure_max: 650000, current_status: 'Audiência de instrução marcada',
    last_update_at: '2024-11-23T10:00:00Z', created_by: 'user-3', created_at: '2024-06-15T10:00:00Z',
  },
];

// ==================== PROCESS DOCUMENTS ====================
export const processDocuments: ProcessDocument[] = [
  { id: 'doc-1', process_id: 'proc-1', title: 'Petição Inicial', document_type: 'peticao_inicial', file_path: '/docs/proc-1/peticao-inicial.pdf', mime_type: 'application/pdf', extracted_text: 'O reclamante João Silva dos Santos, brasileiro, casado, técnico em informática, vem à presença de Vossa Excelência propor a presente RECLAMAÇÃO TRABALHISTA em face de TechBrasil Soluções S.A., pelos fatos e fundamentos a seguir expostos. O reclamante laborou para a reclamada no período de 15/03/2020 a 30/11/2023, exercendo a função de Analista de Sistemas Sênior, com jornada contratual de 44 horas semanais. Durante todo o período contratual, o reclamante era habitualmente submetido a jornadas extraordinárias, laborando em média das 08h00 às 21h00, de segunda a sexta-feira, e eventualmente aos sábados das 09h00 às 14h00, sem o devido pagamento das horas extras e adicional noturno...', uploaded_by: 'user-2', created_at: '2024-06-01T10:00:00Z' },
  { id: 'doc-2', process_id: 'proc-1', title: 'Contestação', document_type: 'contestacao', file_path: '/docs/proc-1/contestacao.pdf', mime_type: 'application/pdf', extracted_text: 'A reclamada TechBrasil Soluções S.A., já qualificada nos autos, vem apresentar CONTESTAÇÃO à reclamação trabalhista movida por João Silva dos Santos. Preliminarmente, impugna-se o valor atribuído à causa por manifestamente excessivo. No mérito, o reclamante exercia cargo de confiança nos termos do art. 62, II, da CLT, estando dispensado do controle de jornada. Subsidiariamente, a empresa mantinha sistema eletrônico de ponto, cujos registros serão apresentados, demonstrando que a jornada não excedia o contratado...', uploaded_by: 'user-2', created_at: '2024-06-15T10:00:00Z' },
  { id: 'doc-3', process_id: 'proc-1', title: 'Registros de Ponto', document_type: 'prova_documental', file_path: '/docs/proc-1/registros-ponto.pdf', mime_type: 'application/pdf', extracted_text: 'Registros eletrônicos de ponto do período de 03/2020 a 11/2023. Obs: Apresentam inconsistências em diversos meses, com registros padrão de entrada às 08:00 e saída às 17:00, sem variação, sugerindo pré-assinalação britânica.', uploaded_by: 'user-2', created_at: '2024-06-15T10:00:00Z' },
  { id: 'doc-4', process_id: 'proc-1', title: 'E-mails de trabalho noturno', document_type: 'prova_documental', file_path: '/docs/proc-1/emails.pdf', mime_type: 'application/pdf', extracted_text: 'Compilação de e-mails enviados pelo reclamante em horários noturnos (após 22h00) e em finais de semana, demonstrando atividade laboral fora do horário contratual. Total de 47 e-mails identificados no período.', uploaded_by: 'user-2', created_at: '2024-06-20T10:00:00Z' },
  { id: 'doc-5', process_id: 'proc-5', title: 'Petição Inicial - Acidente de Trabalho', document_type: 'peticao_inicial', file_path: '/docs/proc-5/peticao-inicial.pdf', mime_type: 'application/pdf', extracted_text: 'Roberto Carlos Mendes, operador de máquinas, sofreu acidente de trabalho em 15/01/2024 ao operar prensa hidráulica sem dispositivo de segurança adequado, resultando em amputação parcial de dois dedos da mão direita. A empresa não forneceu EPI adequado nem realizou treinamento conforme NR-12. Requer indenização por danos morais, materiais, estéticos e pensão mensal vitalícia...', uploaded_by: 'user-3', created_at: '2024-03-05T10:00:00Z' },
  { id: 'doc-6', process_id: 'proc-5', title: 'CAT - Comunicação de Acidente', document_type: 'prova_documental', file_path: '/docs/proc-5/cat.pdf', mime_type: 'application/pdf', extracted_text: 'Comunicação de Acidente de Trabalho emitida em 16/01/2024. Descrição: Acidente típico com máquina prensa. CID: S68.1 - Amputação traumática de outros dedos. Obs: CAT emitida com 24h de atraso.', uploaded_by: 'user-3', created_at: '2024-03-06T10:00:00Z' },
  { id: 'doc-7', process_id: 'proc-9', title: 'Petição Inicial - Horas Extras Motorista', document_type: 'peticao_inicial', file_path: '/docs/proc-9/peticao-inicial.pdf', mime_type: 'application/pdf', extracted_text: 'O reclamante Marcos Vinícius Rocha, motorista de caminhão, laborou para LogiSul Transportes de 05/2021 a 12/2023. Alega jornadas exaustivas de até 16 horas diárias, sem intervalo intrajornada adequado, em violação à Lei 13.103/2015. Requer pagamento de horas extras, intervalo intrajornada suprimido e indenização por danos existenciais...', uploaded_by: 'user-2', created_at: '2024-04-01T10:00:00Z' },
  { id: 'doc-8', process_id: 'proc-9', title: 'Tacógrafos e registros de viagem', document_type: 'prova_documental', file_path: '/docs/proc-9/tacografos.pdf', mime_type: 'application/pdf', extracted_text: 'Discos de tacógrafo do período reclamado. Análise preliminar indica múltiplas viagens com tempo de direção superior ao permitido pela legislação, com intervalos de descanso inferiores ao mínimo legal.', uploaded_by: 'user-2', created_at: '2024-04-05T10:00:00Z' },
];

// ==================== PROCESS EVENTS ====================
export const processEvents: ProcessEvent[] = [
  { id: 'evt-1', process_id: 'proc-1', event_date: '2024-06-01', event_type: 'Distribuição', description: 'Processo distribuído à 1ª Vara do Trabalho de São Paulo', created_at: '2024-06-01T10:00:00Z' },
  { id: 'evt-2', process_id: 'proc-1', event_date: '2024-06-05', event_type: 'Notificação', description: 'Reclamada notificada para apresentar defesa', created_at: '2024-06-05T10:00:00Z' },
  { id: 'evt-3', process_id: 'proc-1', event_date: '2024-06-15', event_type: 'Contestação', description: 'Contestação apresentada pela reclamada', created_at: '2024-06-15T10:00:00Z' },
  { id: 'evt-4', process_id: 'proc-1', event_date: '2024-07-20', event_type: 'Audiência inicial', description: 'Audiência de conciliação realizada. Acordo não alcançado.', created_at: '2024-07-20T10:00:00Z' },
  { id: 'evt-5', process_id: 'proc-1', event_date: '2024-09-15', event_type: 'Despacho', description: 'Deferida oitiva de 3 testemunhas por parte. Audiência de instrução designada.', created_at: '2024-09-15T10:00:00Z' },
  { id: 'evt-6', process_id: 'proc-1', event_date: '2024-12-10', event_type: 'Audiência de instrução', description: 'Audiência de instrução e julgamento designada para 10/12/2024', created_at: '2024-11-20T14:00:00Z' },
  { id: 'evt-7', process_id: 'proc-5', event_date: '2024-03-05', event_type: 'Distribuição', description: 'Processo distribuído à 1ª Vara do Trabalho de Campinas', created_at: '2024-03-05T10:00:00Z' },
  { id: 'evt-8', process_id: 'proc-5', event_date: '2024-04-10', event_type: 'Contestação', description: 'Contestação apresentada pela reclamada', created_at: '2024-04-10T10:00:00Z' },
  { id: 'evt-9', process_id: 'proc-5', event_date: '2024-06-20', event_type: 'Perícia', description: 'Perícia médica designada para avaliação do dano corporal', created_at: '2024-06-20T10:00:00Z' },
  { id: 'evt-10', process_id: 'proc-9', event_date: '2024-04-01', event_type: 'Distribuição', description: 'Processo distribuído à 1ª Vara do Trabalho de Porto Alegre', created_at: '2024-04-01T10:00:00Z' },
];

// ==================== EVIDENCE ITEMS ====================
export const evidenceItems: EvidenceItem[] = [
  { id: 'evi-1', process_id: 'proc-1', title: 'E-mails noturnos', evidence_type: 'Documental', description: '47 e-mails enviados pelo reclamante após as 22h00 e em finais de semana, demonstrando trabalho em sobrejornada', favors_side: 'reclamante', source_document_id: 'doc-4', excerpt: 'Compilação de 47 e-mails em horários noturnos...', relevance_score: 9, created_at: '2024-06-20T10:00:00Z' },
  { id: 'evi-2', process_id: 'proc-1', title: 'Registros de ponto com horário britânico', evidence_type: 'Documental', description: 'Cartões de ponto com marcações invariáveis (08:00-17:00), configurando ponto britânico, o que gera presunção de veracidade da jornada alegada pelo reclamante (Súmula 338, III, TST)', favors_side: 'reclamante', source_document_id: 'doc-3', excerpt: 'Registros padrão de entrada 08:00 e saída 17:00 sem variação...', relevance_score: 10, created_at: '2024-06-15T10:00:00Z' },
  { id: 'evi-3', process_id: 'proc-1', title: 'Alegação de cargo de confiança', evidence_type: 'Argumentação jurídica', description: 'Reclamada alega que o reclamante exercia cargo de confiança (art. 62, II, CLT), dispensado de controle de jornada', favors_side: 'reclamada', source_document_id: 'doc-2', excerpt: 'Exercia cargo de confiança nos termos do art. 62, II, da CLT...', relevance_score: 6, created_at: '2024-06-15T10:00:00Z' },
  { id: 'evi-4', process_id: 'proc-1', title: 'Função real vs. cargo formal', evidence_type: 'Análise', description: 'Título de "Analista Sênior" não necessariamente configura cargo de gestão. Necessário verificar se havia poder de mando, subordinados e fidúcia especial.', favors_side: 'reclamante', excerpt: 'Analista de Sistemas Sênior - função técnica sem gestão direta', relevance_score: 7, created_at: '2024-06-20T10:00:00Z' },
  { id: 'evi-5', process_id: 'proc-5', title: 'Ausência de EPI adequado', evidence_type: 'Documental', description: 'CAT e relato indicam ausência de dispositivo de segurança na prensa hidráulica conforme NR-12', favors_side: 'reclamante', source_document_id: 'doc-6', excerpt: 'Prensa sem dispositivo de segurança adequado...', relevance_score: 10, created_at: '2024-03-06T10:00:00Z' },
  { id: 'evi-6', process_id: 'proc-5', title: 'CAT emitida com atraso', evidence_type: 'Documental', description: 'A CAT foi emitida com 24h de atraso, o que pode indicar tentativa de minimizar o acidente', favors_side: 'reclamante', source_document_id: 'doc-6', excerpt: 'CAT emitida em 16/01, acidente em 15/01...', relevance_score: 5, created_at: '2024-03-06T10:00:00Z' },
  { id: 'evi-7', process_id: 'proc-9', title: 'Tacógrafos com jornadas excessivas', evidence_type: 'Documental', description: 'Discos de tacógrafo indicam múltiplas viagens com tempo de direção superior ao permitido pela Lei 13.103/2015', favors_side: 'reclamante', source_document_id: 'doc-8', excerpt: 'Tempo de direção superior ao permitido pela legislação...', relevance_score: 9, created_at: '2024-04-05T10:00:00Z' },
  { id: 'evi-8', process_id: 'proc-9', title: 'Intervalos de descanso insuficientes', evidence_type: 'Documental', description: 'Registros de viagem demonstram intervalos de descanso abaixo do mínimo legal para motoristas profissionais', favors_side: 'reclamante', source_document_id: 'doc-8', excerpt: 'Intervalos de descanso inferiores ao mínimo legal...', relevance_score: 8, created_at: '2024-04-05T10:00:00Z' },
];

// ==================== ANALYSIS RUNS ====================
export const analysisRuns: AnalysisRun[] = [
  { id: 'run-1', process_id: 'proc-1', status: 'completed', ai_provider: 'mock', ai_model: 'demo-v1', started_at: '2024-11-20T14:00:00Z', finished_at: '2024-11-20T14:02:00Z', triggered_by: 'user-2', version_number: 1 },
  { id: 'run-2', process_id: 'proc-5', status: 'completed', ai_provider: 'mock', ai_model: 'demo-v1', started_at: '2024-11-21T10:00:00Z', finished_at: '2024-11-21T10:03:00Z', triggered_by: 'user-3', version_number: 1 },
  { id: 'run-3', process_id: 'proc-9', status: 'completed', ai_provider: 'mock', ai_model: 'demo-v1', started_at: '2024-11-22T10:00:00Z', finished_at: '2024-11-22T10:02:00Z', triggered_by: 'user-2', version_number: 1 },
];

// ==================== PROCESS ANALYSES ====================
export const processAnalyses: ProcessAnalysis[] = [
  {
    id: 'analysis-1', process_id: 'proc-1', analysis_run_id: 'run-1',
    executive_summary: 'Reclamação trabalhista movida por ex-analista de sistemas pleiteando horas extras, adicional noturno e dano moral. A defesa baseada em cargo de confiança (art. 62, II, CLT) apresenta fragilidade considerável diante do cargo técnico do reclamante e da existência de controle de ponto. Os registros de ponto com horário britânico geram presunção favorável ao reclamante (Súmula 338, III, TST), e os e-mails noturnos corroboram a tese de sobrejornada. O risco de condenação em horas extras é elevado. O pedido de dano moral, embora fundamentado, depende de instrução probatória mais detalhada.',
    case_classification: 'Reclamação Trabalhista - Horas Extras e Dano Moral',
    case_value_identified: 250000,
    financial_impact_summary: 'A exposição financeira estimada varia entre R$ 80.000 e R$ 280.000, com valor base de R$ 150.000. O principal componente são as horas extras (estimadas em R$ 120.000), seguido de reflexos (R$ 30.000) e possível indenização por dano moral (R$ 20.000 a R$ 80.000).',
    risk_level: 'alto',
    risk_score_numeric: 78,
    confidence_level: 'alta',
    justification_text: 'O risco é classificado como ALTO com base na combinação de: (1) registros de ponto britânicos que invertem o ônus da prova; (2) vasta prova documental de trabalho em sobrejornada (47 e-mails noturnos); (3) fragilidade da tese de cargo de confiança para função técnica sem gestão; (4) jurisprudência predominantemente favorável ao reclamante em casos similares no TRT-2. A confiança da análise é ALTA pois os documentos disponíveis são suficientes para sustentar a avaliação.',
    next_steps: ['Preparar testemunhas que possam depor sobre a real jornada e autonomia do reclamante', 'Reunir provas de que o reclamante tinha poder de gestão (se houver)', 'Avaliar proposta de acordo considerando exposição financeira', 'Preparar quesitos para eventual perícia sobre equiparação salarial com gerentes'],
    missing_information: ['Depoimento de testemunhas sobre a real jornada praticada', 'Organograma da empresa demonstrando posição hierárquica', 'Procurações ou poderes outorgados ao reclamante'],
    created_at: '2024-11-20T14:02:00Z',
  },
  {
    id: 'analysis-2', process_id: 'proc-5', analysis_run_id: 'run-2',
    executive_summary: 'Ação trabalhista decorrente de acidente de trabalho grave (amputação parcial de dois dedos) em prensa hidráulica sem dispositivo de segurança adequado. A responsabilidade da empresa é objetiva nos termos do art. 927, parágrafo único, do CC, considerando a atividade de risco. A ausência de medidas de segurança conforme NR-12 agrava significativamente a posição da reclamada. O caso apresenta risco muito elevado de condenação em todas as verbas pleiteadas.',
    case_classification: 'Reclamação Trabalhista - Acidente de Trabalho',
    case_value_identified: 800000,
    financial_impact_summary: 'Exposição financeira entre R$ 400.000 e R$ 850.000, com valor base de R$ 600.000. Componentes: dano moral (R$ 150.000-300.000), dano estético (R$ 50.000-100.000), pensão mensal vitalícia capitalizada (R$ 200.000-400.000), danos materiais (R$ 30.000-50.000).',
    risk_level: 'alto',
    risk_score_numeric: 92,
    confidence_level: 'alta',
    justification_text: 'Risco ALTO (92/100) fundamentado em: (1) responsabilidade objetiva por atividade de risco; (2) violação comprovada de NR-12; (3) dano corporal grave e permanente (amputação); (4) CAT emitida com atraso; (5) jurisprudência pacífica em condenações elevadas para acidentes com amputação. A única questão em aberto é o quantum indenizatório, que dependerá do laudo pericial.',
    next_steps: ['Acompanhar perícia médica atentamente', 'Avaliar possibilidade de acordo para mitigar exposição máxima', 'Documentar todas as medidas de segurança posteriores ao acidente', 'Contratar assistente técnico para a perícia'],
    missing_information: ['Laudo pericial médico sobre a extensão do dano e incapacidade', 'Laudos de inspeção da máquina anteriores ao acidente', 'Certificados de treinamento do empregado (se existirem)'],
    created_at: '2024-11-21T10:03:00Z',
  },
  {
    id: 'analysis-3', process_id: 'proc-9', analysis_run_id: 'run-3',
    executive_summary: 'Reclamação trabalhista de motorista profissional pleiteando horas extras e intervalo intrajornada suprimido. Os registros de tacógrafo indicam jornadas superiores ao permitido pela Lei 13.103/2015. A defesa apresenta desafios consideráveis diante da prova documental robusta apresentada pelo reclamante. O risco é classificado como médio-alto, podendo ser mitigado se a empresa demonstrar que o motorista tinha liberdade na gestão do tempo de viagem.',
    case_classification: 'Reclamação Trabalhista - Motorista Profissional',
    case_value_identified: 200000,
    financial_impact_summary: 'Exposição financeira estimada entre R$ 100.000 e R$ 220.000, com base de R$ 160.000. Principais componentes: horas extras além da 8ª diária (R$ 80.000), intervalo intrajornada suprimido (R$ 40.000), reflexos (R$ 30.000), danos existenciais (R$ 10.000-70.000).',
    risk_level: 'medio',
    risk_score_numeric: 65,
    confidence_level: 'media',
    justification_text: 'Risco MÉDIO (65/100). Fatores desfavoráveis: tacógrafos indicam jornada excessiva e intervalos insuficientes. Fatores favoráveis: a Lei 13.103/2015 traz particularidades para motoristas profissionais (tempo de espera, fracionamento de intervalo) que podem reduzir parte das horas extras. A confiança é MÉDIA pois faltam dados sobre a sistemática de viagens e escalas do motorista.',
    next_steps: ['Levantar escalas e rotas do motorista no período', 'Verificar se havia acordo coletivo sobre jornada de motoristas', 'Analisar se o tempo de espera foi computado corretamente', 'Preparar defesa com base nas exceções da Lei 13.103/2015'],
    missing_information: ['Escalas e rotas detalhadas', 'Convenção coletiva aplicável', 'Relatórios de viagem assinados pelo motorista', 'Política interna de gestão de jornada de motoristas'],
    created_at: '2024-11-22T10:02:00Z',
  },
];

// ==================== PROS AND CONS ====================
export const analysisPros: AnalysisProCon[] = [
  // PROC-1 PROS (defense perspective)
  { id: 'pro-1', process_analysis_id: 'analysis-1', type: 'pro', title: 'Alegação de cargo de confiança', category: 'juridico', description: 'A reclamada sustenta que o reclamante exercia cargo de confiança (art. 62, II, CLT), o que, se comprovado, afastaria o controle de jornada.', legal_basis: 'Art. 62, inciso II, da CLT - Empregados que exercem cargo de gestão', evidence_basis: 'Contestação apresentada com alegação formal', weight: 4, created_at: '2024-11-20T14:02:00Z' },
  { id: 'pro-2', process_analysis_id: 'analysis-1', type: 'pro', title: 'Existência de sistema de ponto eletrônico', category: 'probatorio', description: 'A empresa mantinha sistema de controle de ponto, demonstrando diligência no registro de jornada.', legal_basis: 'Art. 74, §2º da CLT', evidence_basis: 'Registros de ponto eletrônico juntados aos autos', weight: 3, created_at: '2024-11-20T14:02:00Z' },
  { id: 'pro-3', process_analysis_id: 'analysis-1', type: 'pro', title: 'Valor excessivo do dano moral', category: 'estrategico', description: 'O pedido de R$ 100.000 por dano moral é desproporcional para o caso concreto, havendo espaço para redução significativa.', legal_basis: 'Art. 223-G da CLT - Parâmetros para fixação do dano', evidence_basis: 'Jurisprudência do TRT-2 fixa valores entre R$ 10.000 e R$ 30.000 para casos similares', weight: 5, created_at: '2024-11-20T14:02:00Z' },
  // PROC-1 CONS
  { id: 'con-1', process_analysis_id: 'analysis-1', type: 'con', title: 'Ponto britânico inverte ônus da prova', category: 'probatorio', description: 'Os registros de ponto apresentam horários invariáveis (08:00-17:00), configurando ponto britânico. Conforme Súmula 338, III, do TST, isso gera presunção de veracidade da jornada alegada pelo reclamante.', legal_basis: 'Súmula 338, item III, do TST', evidence_basis: 'Registros de ponto juntados pela reclamada com marcações uniformes', source_excerpt: 'Registros padrão de entrada 08:00 e saída 17:00 sem variação', weight: 10, created_at: '2024-11-20T14:02:00Z' },
  { id: 'con-2', process_analysis_id: 'analysis-1', type: 'con', title: 'E-mails comprovam trabalho noturno', category: 'probatorio', description: '47 e-mails enviados pelo reclamante após as 22h00 e em finais de semana corroboram fortemente a tese de sobrejornada habitual.', legal_basis: 'Art. 73 da CLT - Trabalho noturno', evidence_basis: '47 e-mails com timestamps após 22h00', source_excerpt: 'Compilação de 47 e-mails em horários noturnos e finais de semana', weight: 9, created_at: '2024-11-20T14:02:00Z' },
  { id: 'con-3', process_analysis_id: 'analysis-1', type: 'con', title: 'Cargo técnico não configura gestão', category: 'juridico', description: 'O título de "Analista de Sistemas Sênior" indica função eminentemente técnica. Sem evidência de poderes de mando, subordinados diretos ou fidúcia especial, a tese de cargo de confiança é frágil.', legal_basis: 'Art. 62, II, CLT - Requisitos do cargo de confiança', evidence_basis: 'Descrição do cargo na petição inicial e contestação', weight: 8, created_at: '2024-11-20T14:02:00Z' },
  { id: 'con-4', process_analysis_id: 'analysis-1', type: 'con', title: 'Jurisprudência desfavorável no TRT-2', category: 'juridico', description: 'A jurisprudência predominante do TRT-2 é desfavorável à tese de cargo de confiança para analistas de TI sem função gerencial comprovada.', legal_basis: 'Precedentes do TRT-2 em casos similares', evidence_basis: 'Pesquisa jurisprudencial', weight: 7, created_at: '2024-11-20T14:02:00Z' },
  // PROC-5 PROS
  { id: 'pro-4', process_analysis_id: 'analysis-2', type: 'pro', title: 'Possibilidade de culpa concorrente', category: 'juridico', description: 'Se demonstrado que o reclamante recebeu treinamento e descumpriu procedimento de segurança, pode haver reconhecimento de culpa concorrente para reduzir indenização.', legal_basis: 'Art. 945 do Código Civil', evidence_basis: 'A ser verificado nos autos e documentos da empresa', weight: 3, created_at: '2024-11-21T10:03:00Z' },
  { id: 'pro-5', process_analysis_id: 'analysis-2', type: 'pro', title: 'Possibilidade de acordo', category: 'estrategico', description: 'Acordo judicial pode fixar valor substancialmente inferior à exposição máxima e evitar precedente desfavorável.', legal_basis: 'Arts. 764 e 831 da CLT', evidence_basis: 'Prática usual em casos de acidente com lesão grave', weight: 4, created_at: '2024-11-21T10:03:00Z' },
  // PROC-5 CONS
  { id: 'con-5', process_analysis_id: 'analysis-2', type: 'con', title: 'Responsabilidade objetiva', category: 'juridico', description: 'A atividade de operação de prensa hidráulica é considerada de risco, atraindo responsabilidade objetiva do empregador.', legal_basis: 'Art. 927, parágrafo único, do Código Civil', evidence_basis: 'Natureza da atividade e tipo de máquina', weight: 10, created_at: '2024-11-21T10:03:00Z' },
  { id: 'con-6', process_analysis_id: 'analysis-2', type: 'con', title: 'Violação de NR-12 comprovada', category: 'probatorio', description: 'A ausência de dispositivo de segurança na prensa viola a NR-12 e configura negligência grave.', legal_basis: 'NR-12 - Segurança no Trabalho em Máquinas e Equipamentos', evidence_basis: 'CAT e relato do acidente indicam ausência de proteção', weight: 10, created_at: '2024-11-21T10:03:00Z' },
  { id: 'con-7', process_analysis_id: 'analysis-2', type: 'con', title: 'Dano grave e permanente', category: 'probatorio', description: 'A amputação parcial de dois dedos é um dano irreversível que justifica indenizações elevadas por danos morais, estéticos e materiais.', legal_basis: 'Arts. 186, 927, 949 e 950 do Código Civil', evidence_basis: 'CAT descrevendo CID S68.1 - Amputação traumática', weight: 10, created_at: '2024-11-21T10:03:00Z' },
  // PROC-9 PROS
  { id: 'pro-6', process_analysis_id: 'analysis-3', type: 'pro', title: 'Lei do Motorista permite exceções', category: 'juridico', description: 'A Lei 13.103/2015 prevê particularidades para motoristas profissionais, como fracionamento do intervalo e exclusão do tempo de espera da jornada.', legal_basis: 'Lei 13.103/2015, arts. 235-C e 235-D da CLT', evidence_basis: 'Legislação aplicável ao caso', weight: 7, created_at: '2024-11-22T10:02:00Z' },
  { id: 'pro-7', process_analysis_id: 'analysis-3', type: 'pro', title: 'Possível acordo coletivo favorável', category: 'processual', description: 'Convenções coletivas do setor de transporte podem conter cláusulas sobre jornada que favoreçam a empresa.', legal_basis: 'Art. 611-A da CLT - Prevalência do negociado', evidence_basis: 'A ser verificado - CCT do sindicato dos motoristas', weight: 5, created_at: '2024-11-22T10:02:00Z' },
  // PROC-9 CONS
  { id: 'con-8', process_analysis_id: 'analysis-3', type: 'con', title: 'Tacógrafos comprovam jornada excessiva', category: 'probatorio', description: 'Os discos de tacógrafo são prova técnica robusta que demonstram jornadas superiores ao permitido.', legal_basis: 'Art. 74, §3º da CLT e Resolução CONTRAN', evidence_basis: 'Análise dos discos de tacógrafo juntados', weight: 9, created_at: '2024-11-22T10:02:00Z' },
  { id: 'con-9', process_analysis_id: 'analysis-3', type: 'con', title: 'Intervalos insuficientes documentados', category: 'probatorio', description: 'Os registros de viagem demonstram descanso inferior ao mínimo legal, configurando violação grave às normas de segurança do motorista.', legal_basis: 'Art. 235-C, §3º da CLT', evidence_basis: 'Discos de tacógrafo e relatórios de viagem', weight: 8, created_at: '2024-11-22T10:02:00Z' },
];

// ==================== JURISPRUDENCE (20 per analyzed process) ====================
function generateJurisprudence(analysisId: string, subject: string, court: string): JurisprudenceReference[] {
  const chambers = ['1ª Turma', '2ª Turma', '3ª Turma', '4ª Turma', '5ª Turma', '6ª Turma', '7ª Turma', '8ª Turma'];
  const judges = ['Des. Ana Maria Silva', 'Des. Roberto Carvalho', 'Des. Mariana Santos', 'Des. Paulo Oliveira', 'Des. Cristina Mendes', 'Des. Fernando Almeida', 'Des. Juliana Costa', 'Des. Marcos Pereira'];
  const tendencies: ('favoravel' | 'desfavoravel' | 'neutro')[] = ['favoravel', 'desfavoravel', 'neutro'];

  const items: JurisprudenceReference[] = [];
  for (let i = 0; i < 20; i++) {
    const year = 2023 + (i < 10 ? 1 : 0);
    const month = String((i % 12) + 1).padStart(2, '0');
    const tendency = i < 7 ? 'desfavoravel' : i < 14 ? 'favoravel' : 'neutro';

    items.push({
      id: `juris-${analysisId}-${i + 1}`,
      process_analysis_id: analysisId,
      court: court,
      chamber: chambers[i % chambers.length],
      judge_rapporteur: judges[i % judges.length],
      judgment_date: `${year}-${month}-15`,
      publication_date: `${year}-${month}-20`,
      case_number: `${String(i * 1000 + 5000).padStart(7, '0')}-${String(20 + i).padStart(2, '0')}.${year}.5.${court === 'TRT-2' ? '02' : court === 'TRT-15' ? '15' : '04'}.${String(i + 1).padStart(4, '0')}`,
      subject: subject,
      summary: getJurisprudenceSummary(subject, i, tendency),
      similarity_reason: getSimilarityReason(subject, i),
      tendency_for_case: tendency,
      source_url: undefined,
      source_provider: 'demo',
      recency_score: Math.max(0.5, 1 - (i * 0.03)),
      similarity_score: Math.max(0.6, 0.95 - (i * 0.015)),
      created_at: '2024-11-20T14:02:00Z',
    });
  }
  return items;
}

function getJurisprudenceSummary(subject: string, index: number, tendency: string): string {
  const summaries: Record<string, string[]> = {
    'Horas extras e dano moral': [
      'Configurado ponto britânico, presume-se verdadeira a jornada alegada pelo reclamante. Condenação em horas extras mantida.',
      'Cargo de confiança reconhecido para analista sênior com autonomia e subordinados diretos. Recurso provido.',
      'E-mails enviados fora do expediente constituem prova robusta de sobrejornada. Súmula 338, III, TST aplicada.',
      'Reclamada não comprovou exercício de cargo de gestão. Mero título não configura exceção do art. 62, II, CLT.',
      'Dano moral fixado em R$ 25.000 por jornada extenuante e violação ao direito ao lazer.',
      'Horas extras reconhecidas parcialmente. Acordo coletivo limitava o pedido a 2 anos anteriores.',
    ],
    'Acidente de trabalho e estabilidade': [
      'Responsabilidade objetiva reconhecida em atividade de risco com máquina sem proteção. NR-12 violada.',
      'Indenização por dano moral fixada em R$ 200.000 por amputação de dedos em acidente de trabalho.',
      'Pensão mensal vitalícia deferida com base na redução da capacidade laborativa de 30%.',
      'Culpa concorrente reconhecida em 20%, reduzindo proporcionalmente as indenizações.',
      'Dano estético fixado independentemente do dano moral, conforme Súmula 387 do STJ.',
      'Estabilidade acidentária reconhecida com reintegração e pagamento do período de afastamento.',
    ],
    'Horas extras e intervalo intrajornada': [
      'Tempo de espera de motorista não integra a jornada conforme Lei 13.103/2015.',
      'Tacógrafo constitui prova técnica robusta de jornada de motorista profissional.',
      'Fracionamento do intervalo intrajornada previsto em CCT é válido para motoristas.',
      'Intervalo intrajornada suprimido gera pagamento integral como hora extra, conforme Súmula 437, I, TST.',
      'Dano existencial reconhecido por jornadas excessivas habituais que impediam convívio social.',
      'Acordo coletivo sobre jornada de motorista previsto no art. 611-A da CLT prevalece sobre a lei.',
    ],
  };
  const list = summaries[subject] || summaries['Horas extras e dano moral'];
  return list[index % list.length];
}

function getSimilarityReason(subject: string, index: number): string {
  const reasons = [
    'Mesmo tipo de pedido principal e mesma região judiciária',
    'Situação fática similar quanto à função exercida e tipo de empresa',
    'Mesma tese jurídica central discutida nos autos',
    'Porte empresarial e setor de atuação semelhantes',
    'Decisão recente com aplicação dos mesmos dispositivos legais',
    'Contexto probatório análogo ao caso em análise',
  ];
  return reasons[index % reasons.length];
}

export const jurisprudenceReferences: JurisprudenceReference[] = [
  ...generateJurisprudence('analysis-1', 'Horas extras e dano moral', 'TRT-2'),
  ...generateJurisprudence('analysis-2', 'Acidente de trabalho e estabilidade', 'TRT-15'),
  ...generateJurisprudence('analysis-3', 'Horas extras e intervalo intrajornada', 'TRT-4'),
];

// ==================== CHAT THREADS ====================
export const chatThreads: ChatThread[] = [
  { id: 'thread-1', process_id: 'proc-1', created_by: 'user-2', title: 'Estratégia de defesa - horas extras', created_at: '2024-11-20T15:00:00Z' },
  { id: 'thread-2', process_id: 'proc-5', created_by: 'user-3', title: 'Avaliação de risco - acidente', created_at: '2024-11-21T11:00:00Z' },
];

export const chatMessages: ChatMessage[] = [
  { id: 'msg-1', thread_id: 'thread-1', role: 'user', content: 'Quais são os melhores argumentos de defesa para este caso de horas extras?', created_at: '2024-11-20T15:00:00Z' },
  { id: 'msg-2', thread_id: 'thread-1', role: 'assistant', content: 'Com base na análise do processo 0001234-56.2024.5.02.0001, os principais argumentos de defesa são:\n\n1. **Cargo de confiança (art. 62, II, CLT)**: Embora a tese seja desafiada pelo cargo técnico, é importante demonstrar que o reclamante tinha autonomia significativa, acesso a informações estratégicas e poder decisório.\n\n2. **Limitação do pedido**: Verificar se há acordo coletivo que limite horas extras ou estabeleça banco de horas.\n\n3. **Redução do dano moral**: O pedido de R$ 100.000 é desproporcional — jurisprudência do TRT-2 fixa valores entre R$ 10.000 e R$ 30.000 para casos similares.\n\n⚠️ **Ponto de atenção**: Os registros de ponto britânicos são o maior obstáculo da defesa. Recomendo focar em testemunhas que comprovem a autonomia do reclamante e buscar evidências de que ele tinha subordinados ou poder de mando.', created_at: '2024-11-20T15:01:00Z' },
  { id: 'msg-3', thread_id: 'thread-1', role: 'user', content: 'Como explicar esse risco para o cliente de forma simples?', created_at: '2024-11-20T15:05:00Z' },
  { id: 'msg-4', thread_id: 'thread-1', role: 'assistant', content: 'Sugiro a seguinte abordagem para comunicar ao cliente:\n\n---\n\n**Prezado(a),**\n\nSobre o processo movido por João Silva dos Santos:\n\n**Situação**: Um ex-funcionário da área de TI alega que trabalhava além do horário sem receber horas extras.\n\n**Principal desafio**: Os registros de ponto da empresa mostram horários sempre iguais (08h-17h), o que a Justiça do Trabalho interpreta como controle de ponto falho. Além disso, o funcionário apresentou 47 e-mails de trabalho enviados à noite e nos finais de semana.\n\n**Risco financeiro**: Estimamos uma exposição entre R$ 80.000 e R$ 280.000, dependendo da decisão judicial.\n\n**Recomendação**: Sugerimos avaliar a possibilidade de um acordo, que poderia reduzir significativamente este valor.\n\n---\n\nDeseja que eu prepare um e-mail formal com essa comunicação?', created_at: '2024-11-20T15:06:00Z' },
];

// ==================== GENERATED DOCUMENTS ====================
export const generatedDocuments: GeneratedDocument[] = [
  {
    id: 'gendoc-1', process_id: 'proc-1', type: 'resumo_executivo', title: 'Resumo Executivo - Proc. 0001234-56',
    content: '# RESUMO EXECUTIVO\n\n**Processo**: 0001234-56.2024.5.02.0001\n**Reclamante**: João Silva dos Santos\n**Reclamada**: TechBrasil Soluções S.A.\n**Vara**: 1ª Vara do Trabalho de São Paulo\n\n## Situação Atual\nO processo encontra-se em fase de conhecimento, com audiência de instrução designada para 10/12/2024.\n\n## Pedidos Principais\n- Horas extras (período integral do contrato)\n- Adicional noturno\n- Dano moral (R$ 100.000)\n\n## Avaliação de Risco\n**Classificação**: ALTO RISCO (78/100)\n\nO risco é elevado em razão dos registros de ponto britânicos e das provas de trabalho noturno.\n\n## Exposição Financeira\n- Mínima: R$ 80.000\n- Base: R$ 150.000\n- Máxima: R$ 280.000\n\n## Recomendação\nAvaliar proposta de acordo na faixa de R$ 100.000 a R$ 130.000.',
    generated_by: 'user-2', analysis_run_id: 'run-1', created_at: '2024-11-20T16:00:00Z',
  },
];

// ==================== PROMPT TEMPLATES ====================
export const promptTemplates: PromptTemplate[] = [
  { id: 'pt-1', key: 'analise_trabalhista_geral', label: 'Análise Trabalhista Geral', description: 'Template principal para análise completa de processo trabalhista', content: 'Você é um especialista em direito do trabalho empresarial brasileiro. Analise o seguinte processo trabalhista e forneça uma análise completa incluindo: resumo executivo, classificação do caso, identificação de pedidos, situação processual e lacunas de informação.\n\nDados do processo:\n{process_data}\n\nDocumentos disponíveis:\n{documents}\n\nResponda em JSON estruturado.', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-2', key: 'extracao_provas', label: 'Extração de Provas', description: 'Template para mapeamento e classificação de provas', content: 'Analise os documentos do processo trabalhista abaixo e identifique todas as provas relevantes. Para cada prova, indique: título, tipo, descrição, qual lado favorece (reclamante/reclamada/neutro), trecho relevante e grau de relevância (1-10).\n\nDocumentos:\n{documents}\n\nResponda em JSON estruturado.', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-3', key: 'pros_contras_trabalhista', label: 'Prós e Contras', description: 'Template para análise de prós e contras do caso', content: 'Com base na análise do processo trabalhista, construa uma lista estruturada de PRÓS (pontos favoráveis à defesa da empresa) e CONTRAS (pontos desfavoráveis). Para cada item inclua: título, categoria (juridico/probatorio/processual/estrategico), descrição objetiva, fundamento jurídico, fundamento probatório e peso (1-10).\n\nDados do processo:\n{process_data}\n\nProvas mapeadas:\n{evidence}\n\nResponda em JSON estruturado.', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-4', key: 'score_risco_trabalhista', label: 'Score de Risco', description: 'Template para cálculo e justificativa do score de risco', content: 'Com base nos prós e contras analisados, calcule o score de risco de perda do processo trabalhista. Classifique como alto/médio/baixo, atribua score numérico (0-100), indique nível de confiança, explique o racional, liste fatores favoráveis e desfavoráveis, e identifique incertezas.\n\nPrós:\n{pros}\n\nContras:\n{cons}\n\nJurisprudência:\n{jurisprudence}\n\nResponda em JSON estruturado.', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-5', key: 'impacto_financeiro_trabalhista', label: 'Impacto Financeiro', description: 'Template para estimativa de impacto financeiro', content: 'Estime o impacto financeiro do processo trabalhista. Identifique valor da causa, estime exposição mínima/base/máxima com justificativa para cada cenário. Considere os pedidos, provas e jurisprudência.\n\nDados do processo:\n{process_data}\n\nAnálise:\n{analysis}\n\nResponda em JSON estruturado.', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-6', key: 'chat_especialista_trabalhista', label: 'Chat Especialista', description: 'System prompt para chat contextual trabalhista', content: 'Você é um advogado especialista em direito do trabalho empresarial brasileiro. Responda perguntas sobre o processo com base nos dados fornecidos. Cite fontes internas quando possível. Nunca invente fatos ou jurisprudência. Se faltar informação, diga explicitamente. Responda em português do Brasil.\n\nContexto do processo:\n{process_context}\n\nAnálise atual:\n{analysis}\n\nProvas:\n{evidence}', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-7', key: 'minuta_peticao_trabalhista', label: 'Minuta de Petição', description: 'Template para geração de minuta de petição', content: 'Gere uma minuta de petição para o processo trabalhista abaixo. Use linguagem jurídica formal, cite fundamentação legal, baseie-se nos fatos e provas do processo. Marque com [PREENCHER] qualquer informação que falte. Marque com [VERIFICAR] pontos que precisam de confirmação.\n\nDados do processo:\n{process_data}\n\nAnálise:\n{analysis}', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-8', key: 'minuta_recurso_trabalhista', label: 'Minuta de Recurso', description: 'Template para geração de minuta de recurso', content: 'Gere uma minuta de recurso ordinário para o processo trabalhista. Identifique os pontos da sentença que merecem reforma, fundamente juridicamente cada pedido recursal.\n\nDados do processo:\n{process_data}\n\nSentença:\n{sentence}\n\nAnálise:\n{analysis}', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-9', key: 'email_cliente_trabalhista', label: 'E-mail ao Cliente', description: 'Template para comunicação ao cliente empresarial', content: 'Redija um e-mail profissional ao cliente empresarial sobre o status do processo trabalhista. Use linguagem clara e acessível, evitando jargão jurídico desnecessário. Inclua: resumo da situação, risco, exposição financeira e recomendação.\n\nDados do processo:\n{process_data}\n\nAnálise:\n{analysis}', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'pt-10', key: 'resumo_executivo_trabalhista', label: 'Resumo Executivo', description: 'Template para geração de resumo executivo', content: 'Gere um resumo executivo conciso do processo trabalhista para apresentação ao cliente ou à diretoria. Inclua: dados do processo, pedidos, risco, exposição financeira, recomendações e próximos passos.\n\nDados do processo:\n{process_data}\n\nAnálise completa:\n{analysis}', version: 1, active: true, created_at: '2024-01-15T10:00:00Z' },
];

// ==================== AUDIT LOGS ====================
export const auditLogs: AuditLog[] = [
  { id: 'log-1', actor_user_id: 'user-2', organization_id: 'org-1', entity_type: 'process', entity_id: 'proc-1', action: 'create', metadata: { process_number: '0001234-56.2024.5.02.0001' }, created_at: '2024-06-01T10:00:00Z' },
  { id: 'log-2', actor_user_id: 'user-2', organization_id: 'org-1', entity_type: 'document', entity_id: 'doc-1', action: 'upload', metadata: { title: 'Petição Inicial', process_id: 'proc-1' }, created_at: '2024-06-01T10:05:00Z' },
  { id: 'log-3', actor_user_id: 'user-2', organization_id: 'org-1', entity_type: 'analysis', entity_id: 'analysis-1', action: 'run', metadata: { provider: 'mock', model: 'demo-v1', version: 1 }, created_at: '2024-11-20T14:00:00Z' },
  { id: 'log-4', actor_user_id: 'user-3', organization_id: 'org-1', entity_type: 'process', entity_id: 'proc-5', action: 'create', metadata: { process_number: '0005678-90.2024.5.15.0001' }, created_at: '2024-03-05T10:00:00Z' },
  { id: 'log-5', actor_user_id: 'user-3', organization_id: 'org-1', entity_type: 'analysis', entity_id: 'analysis-2', action: 'run', metadata: { provider: 'mock', model: 'demo-v1', version: 1 }, created_at: '2024-11-21T10:00:00Z' },
];

// ==================== HELPER FUNCTIONS ====================
export function getProcessesForCompany(companyId: string): Process[] {
  return processes.filter(p => p.client_company_id === companyId);
}

export function getProcessById(processId: string): Process | undefined {
  const proc = processes.find(p => p.id === processId);
  if (proc) {
    proc.client_company = clientCompanies.find(c => c.id === proc.client_company_id);
    proc.latest_analysis = processAnalyses.find(a => a.process_id === proc.id);
  }
  return proc;
}

export function getAnalysisForProcess(processId: string): ProcessAnalysis | undefined {
  const analysis = processAnalyses.find(a => a.process_id === processId);
  if (analysis) {
    analysis.pros = analysisPros.filter(p => p.process_analysis_id === analysis.id && p.type === 'pro');
    analysis.cons = analysisPros.filter(p => p.process_analysis_id === analysis.id && p.type === 'con');
    // Fix: also include from analysisPros which has both pros and cons
    const allProsCons = analysisPros;
    analysis.pros = allProsCons.filter(p => p.process_analysis_id === analysis.id && p.type === 'pro');
    analysis.cons = allProsCons.filter(p => p.process_analysis_id === analysis.id && p.type === 'con');
    analysis.jurisprudence = jurisprudenceReferences.filter(j => j.process_analysis_id === analysis.id);
  }
  return analysis;
}

export function getDocumentsForProcess(processId: string): ProcessDocument[] {
  return processDocuments.filter(d => d.process_id === processId);
}

export function getEventsForProcess(processId: string): ProcessEvent[] {
  return processEvents.filter(e => e.process_id === processId).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
}

export function getEvidenceForProcess(processId: string): EvidenceItem[] {
  return evidenceItems.filter(e => e.process_id === processId);
}

export function getChatThreadsForProcess(processId: string): ChatThread[] {
  const threads = chatThreads.filter(t => t.process_id === processId);
  return threads.map(t => ({ ...t, messages: chatMessages.filter(m => m.thread_id === t.id) }));
}

export function getGeneratedDocsForProcess(processId: string): GeneratedDocument[] {
  return generatedDocuments.filter(d => d.process_id === processId);
}

export function getAuditLogsForProcess(processId: string): AuditLog[] {
  return auditLogs.filter(l => l.entity_id === processId || l.metadata?.process_id === processId);
}

export function getDashboardStats(): DashboardStats {
  const analyzedProcesses = processes.map(p => ({
    ...p,
    latest_analysis: processAnalyses.find(a => a.process_id === p.id),
  }));

  return {
    totalClients: clientCompanies.length,
    totalProcesses: processes.length,
    highRisk: analyzedProcesses.filter(p => p.latest_analysis?.risk_level === 'alto').length,
    mediumRisk: analyzedProcesses.filter(p => p.latest_analysis?.risk_level === 'medio').length,
    lowRisk: analyzedProcesses.filter(p => p.latest_analysis?.risk_level === 'baixo').length,
    noAnalysis: analyzedProcesses.filter(p => !p.latest_analysis).length,
    totalExposure: analyzedProcesses.reduce((sum, p) => sum + (p.latest_analysis?.case_value_identified || p.claim_value || 0), 0),
    recentProcesses: processes.slice(0, 5).map(p => ({
      ...p,
      client_company: clientCompanies.find(c => c.id === p.client_company_id),
      latest_analysis: processAnalyses.find(a => a.process_id === p.id),
    })),
  };
}

export function getClientDashboardStats(companyId: string): DashboardStats {
  const companyProcesses = processes.filter(p => p.client_company_id === companyId);
  const analyzedProcesses = companyProcesses.map(p => ({
    ...p,
    latest_analysis: processAnalyses.find(a => a.process_id === p.id),
    client_company: clientCompanies.find(c => c.id === p.client_company_id),
  }));

  return {
    totalClients: 1,
    totalProcesses: companyProcesses.length,
    highRisk: analyzedProcesses.filter(p => p.latest_analysis?.risk_level === 'alto').length,
    mediumRisk: analyzedProcesses.filter(p => p.latest_analysis?.risk_level === 'medio').length,
    lowRisk: analyzedProcesses.filter(p => p.latest_analysis?.risk_level === 'baixo').length,
    noAnalysis: analyzedProcesses.filter(p => !p.latest_analysis).length,
    totalExposure: analyzedProcesses.reduce((sum, p) => sum + (p.latest_analysis?.case_value_identified || p.claim_value || 0), 0),
    recentProcesses: analyzedProcesses.slice(0, 5),
  };
}
