import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RiskBadge, PhaseBadge } from '@/components/badges/RiskBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FolderOpen, Brain, Loader2, ArrowLeft, CheckCircle2, FileBarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface Process {
  id: string;
  process_number: string;
  claimant_name: string;
  defendant_name: string;
  subject_main: string;
  phase: string;
  tribunal: string;
  vara: string;
  claim_value: number;
  distribution_date: string | null;
  client_company_id: string | null;
  client_company_name?: string;
  risk_level?: string;
  risk_score?: number;
}

interface ClientCompany {
  id: string;
  trade_name: string;
  cnpj: string;
}

export default function ProcessesPage() {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const empresaId = searchParams.get('empresa');

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });

  const isClient = role === 'client_user';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let currentCompany: ClientCompany | null = null;

      if (empresaId) {
        const { data: cc } = await supabase
          .from('client_companies')
          .select('id, trade_name, cnpj')
          .eq('id', empresaId)
          .single();
        currentCompany = cc || null;
        setCompany(currentCompany);
      } else {
        setCompany(null);
      }

      let query = supabase
        .from('processes')
        .select(`
          id,
          process_number,
          claimant_name,
          defendant_name,
          subject_main,
          phase,
          tribunal,
          vara,
          claim_value,
          distribution_date,
          client_company_id
        `)
        .order('created_at', { ascending: false });

      if (empresaId) {
        query = query.eq('client_company_id', empresaId);
      }

      const { data: procs, error } = await query;
      if (error) throw error;

      const procList = procs || [];

      const procIds = procList.map(p => p.id);
      const { data: analyses } = procIds.length > 0
        ? await supabase
            .from('process_analyses')
            .select('process_id, risk_level, risk_score_numeric')
            .in('process_id', procIds)
            .order('created_at', { ascending: false })
        : { data: [] };

      const analysisMap: Record<string, { risk_level: string; risk_score_numeric: number }> = {};
      for (const a of (analyses || [])) {
        if (!analysisMap[a.process_id]) {
          analysisMap[a.process_id] = a;
        }
      }

      let companyMap: Record<string, string> = {};
      if (!empresaId) {
        const companyIds = [...new Set(procList.map(p => p.client_company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from('client_companies')
            .select('id, trade_name')
            .in('id', companyIds as string[]);
          for (const c of (companies || [])) {
            companyMap[c.id] = c.trade_name;
          }
        }
      }

      const enriched: Process[] = procList.map(p => ({
        ...p,
        client_company_name: empresaId ? currentCompany?.trade_name : companyMap[p.client_company_id || ''],
        risk_level: analysisMap[p.id]?.risk_level,
        risk_score: analysisMap[p.id]?.risk_score_numeric,
      }));

      setProcesses(enriched);
    } catch (err: any) {
      console.error('Fetch processes error:', err);
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  let filtered = processes;

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.process_number?.toLowerCase().includes(s) ||
      p.claimant_name?.toLowerCase().includes(s) ||
      p.subject_main?.toLowerCase().includes(s) ||
      p.client_company_name?.toLowerCase().includes(s)
    );
  }
  if (riskFilter !== 'all') {
    filtered = filtered.filter(p =>
      riskFilter === 'sem_analise' ? !p.risk_level : p.risk_level === riskFilter
    );
  }
  if (phaseFilter !== 'all') {
    filtered = filtered.filter(p => p.phase === phaseFilter);
  }

  const handleAnalyzeAll = async () => {
    const toAnalyze = processes.filter(p => !p.risk_level);
    if (toAnalyze.length === 0) {
      toast.info('Todos os processos já possuem análise de risco.');
      return;
    }

    setAnalyzing(true);
    setAnalyzeProgress({ done: 0, total: toAnalyze.length });

    let done = 0;
    let errors = 0;

    for (const proc of toAnalyze) {
      try {
        const resp = await supabase.functions.invoke('analisar-risco', {
          body: {
            processo_id: proc.id,
            valor_causa: proc.claim_value || 0,
            data_ajuizamento: proc.distribution_date || new Date().toISOString().split('T')[0],
            pedidos: proc.subject_main ? [proc.subject_main] : ['Verbas trabalhistas'],
            reclamante: proc.claimant_name,
            reclamada: proc.defendant_name,
          },
        });

        if (resp.error) throw new Error(resp.error.message);

        const result = resp.data;
        await supabase.from('process_analyses').insert({
          process_id: proc.id,
          executive_summary: result.resumo_executivo || result.executive_summary || 'Analise concluida.',
          case_classification: proc.subject_main || 'Trabalhista',
          case_value_identified: proc.claim_value || 0,
          financial_impact_summary: 'Exposicao estimada: ' + formatCurrency(result.valor_atualizado || result.valorAtualizado || proc.claim_value || 0),
          risk_level: result.nivel_risco || result.nivelRisco || 'medio',
          risk_score_numeric: result.score_risco ?? result.scoreRisco ?? 50,
          confidence_level: 'media',
          justification_text: result.resumo_executivo || result.executive_summary || '',
          next_steps: ['Revisar documentacao do processo'],
          missing_information: [],
        });
      } catch (err: any) {
        console.error('Error analyzing process ' + proc.process_number + ':', err);
        errors++;
      }

      done++;
      setAnalyzeProgress({ done, total: toAnalyze.length });
    }

    setAnalyzing(false);
    if (errors === 0) {
      toast.success(toAnalyze.length + ' processos analisados com sucesso!');
    } else {
      toast.warning((done - errors) + ' analisados, ' + errors + ' com erro.');
    }
    fetchData();
  };

  const unanalyzedCount = processes.filter(p => !p.risk_level).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {empresaId && company && (
            <div className="flex items-center gap-2 mb-1">
              <Link to="/clientes" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Clientes
              </Link>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs font-medium text-foreground">{company.trade_name}</span>
            </div>
          )}
          <h1 className="page-header">
            {empresaId && company ? company.trade_name : 'Processos'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Carregando...' : filtered.length + ' processo(s) encontrado(s)'}
            {!loading && unanalyzedCount > 0 && empresaId && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">• {unanalyzedCount} sem analise</span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {empresaId && !isClient && unanalyzedCount > 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleAnalyzeAll}
              disabled={analyzing || loading}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {analyzeProgress.done}/{analyzeProgress.total} analisando...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analisar todos com IA ({unanalyzedCount})
                </>
              )}
            </Button>
          )}
          {empresaId && company && (
            <Link to={'/relatorio?empresa=' + empresaId + '&nome=' + encodeURIComponent(company.trade_name)}>
              <Button variant="outline" className="gap-2">
                <FileBarChart2 className="h-4 w-4" /> Relatorio Geral
              </Button>
            </Link>
          )}
          {empresaId && !isClient && unanalyzedCount === 0 && !loading && processes.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 px-3">
              <CheckCircle2 className="h-4 w-4" />
              Todos analisados
            </div>
          )}
          {!isClient && !empresaId && (
            <Link to="/processos/novo">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Processo</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero, reclamante, empresa ou tema..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os riscos</SelectItem>
            <SelectItem value="alto">Alto Risco</SelectItem>
            <SelectItem value="medio">Medio Risco</SelectItem>
            <SelectItem value="baixo">Baixo Risco</SelectItem>
            <SelectItem value="sem_analise">Sem analise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Fase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            <SelectItem value="conhecimento">Conhecimento</SelectItem>
            <SelectItem value="recursal">Recursal</SelectItem>
            <SelectItem value="execucao">Execucao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((proc, i) => (
              <motion.div key={proc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}>
                <Link to={'/processos/' + proc.id} className="block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground truncate">{proc.process_number}</p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground truncate">{proc.claimant_name}</h3>
                      <p className="text-xs text-muted-foreground">vs. {proc.defendant_name}</p>
                    </div>
                    {proc.risk_level
                      ? <RiskBadge level={proc.risk_level} />
                      : <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">Sem analise</span>
                    }
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{proc.subject_main}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      <PhaseBadge phase={proc.phase} />
                      {proc.tribunal && <span className="text-xs text-muted-foreground">{proc.tribunal}{proc.vara ? ' - ' + proc.vara : ''}</span>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground truncate">{proc.client_company_name || '-'}</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(proc.claim_value || 0)}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">Nenhum processo encontrado</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
