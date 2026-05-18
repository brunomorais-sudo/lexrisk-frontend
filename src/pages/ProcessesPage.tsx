import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { processes, clientCompanies, processAnalyses } from '@/data/mock-data';
import { RiskBadge, PhaseBadge } from '@/components/badges/RiskBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Upload, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImportJob } from '@/hooks/useImportJob';
import ImportDialog from '@/components/import/ImportDialog';
import { persistImportedProcess, fetchImportedProcesses } from '@/lib/persist-process';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export default function ProcessesPage() {
  const { role, organizationId } = useAuth();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [dbProcesses, setDbProcesses] = useState<any[]>([]);
  const importJob = useImportJob();
  const hasPersisted = useRef(false);

  const isClient = role === 'client_user';

  // Load imported processes from DB on mount
  useEffect(() => {
    fetchImportedProcesses().then(setDbProcesses).catch(console.error);
  }, []);

  // When import completes, persist to DB and reload (once only)
  useEffect(() => {
    if (importJob.state.phase === 'completed' && importJob.state.resultData?.process_data && !hasPersisted.current) {
      hasPersisted.current = true;
      persistImportedProcess(importJob.state.resultData)
        .then(() => fetchImportedProcesses())
        .then(setDbProcesses)
        .catch(err => console.error('Persist error:', err));
    }
    if (importJob.state.phase === 'idle') {
      hasPersisted.current = false;
    }
  }, [importJob.state.phase, importJob.state.resultData]);

  let filteredProcesses = [...processes, ...dbProcesses].map(p => ({
    ...p,
    client_company: clientCompanies.find(c => c.id === p.client_company_id),
    latest_analysis: p.latest_analysis || processAnalyses.find(a => a.process_id === p.id),
  }));

  if (isClient && organizationId) {
    const company = clientCompanies.find(c => c.organization_id === organizationId);
    if (company) filteredProcesses = filteredProcesses.filter(p => p.client_company_id === company.id);
  }

  if (search) {
    const s = search.toLowerCase();
    filteredProcesses = filteredProcesses.filter(p =>
      p.process_number.includes(s) || p.claimant_name.toLowerCase().includes(s) ||
      p.subject_main.toLowerCase().includes(s) || p.client_company?.trade_name.toLowerCase().includes(s)
    );
  }
  if (riskFilter !== 'all') {
    filteredProcesses = filteredProcesses.filter(p =>
      riskFilter === 'sem_analise' ? !p.latest_analysis : p.latest_analysis?.risk_level === riskFilter
    );
  }
  if (phaseFilter !== 'all') {
    filteredProcesses = filteredProcesses.filter(p => p.phase === phaseFilter);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Processos</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filteredProcesses.length} processo(s) encontrado(s)</p>
        </div>
        {!isClient && (
          <div className="flex gap-2">
            <input
              type="file"
              ref={importJob.fileInputRef}
              className="hidden"
              accept=".zip,.pdf"
              onChange={importJob.handleFileSelected}
            />
            <Button variant="outline" className="gap-2" onClick={importJob.handleImportClick}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Link to="/processos/novo"><Button className="gap-2"><Plus className="h-4 w-4" /> Novo Processo</Button></Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por número, reclamante, empresa ou tema..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os riscos</SelectItem>
            <SelectItem value="alto">Alto Risco</SelectItem>
            <SelectItem value="medio">Médio Risco</SelectItem>
            <SelectItem value="baixo">Baixo Risco</SelectItem>
            <SelectItem value="sem_analise">Sem análise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Fase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            <SelectItem value="conhecimento">Conhecimento</SelectItem>
            <SelectItem value="recursal">Recursal</SelectItem>
            <SelectItem value="execucao">Execução</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Process Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredProcesses.map((proc, i) => (
          <motion.div key={proc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link to={`/processos/${proc.id}`} className="block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground truncate">{proc.process_number}</p>
                  <h3 className="mt-1 text-sm font-semibold text-foreground truncate">{proc.claimant_name}</h3>
                  <p className="text-xs text-muted-foreground">vs. {proc.defendant_name}</p>
                </div>
                {proc.latest_analysis && <RiskBadge level={proc.latest_analysis.risk_level} />}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{proc.subject_main}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <PhaseBadge phase={proc.phase} />
                  <span className="text-xs text-muted-foreground">{proc.tribunal} • {proc.vara}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">{proc.client_company?.trade_name}</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(proc.claim_value)}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredProcesses.length === 0 && (
        <div className="py-16 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Nenhum processo encontrado</p>
        </div>
      )}

      <ImportDialog
        state={importJob.state}
        onClose={importJob.reset}
        onRetry={importJob.handleImportClick}
      />
    </div>
  );
}
