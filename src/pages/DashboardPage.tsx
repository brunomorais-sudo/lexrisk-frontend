import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/cards/StatCard';
import { RiskBadge, PhaseBadge } from '@/components/badges/RiskBadge';
import { Building2, FolderOpen, AlertTriangle, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface DashStats {
  totalClients: number;
  totalProcesses: number;
  totalExposure: number;
  noAnalysis: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  recentProcesses: any[];
}

export default function DashboardPage() {
  const { role } = useAuth();
  const isClient = role === 'client_user';
  const [stats, setStats] = useState<DashStats>({
    totalClients: 0, totalProcesses: 0, totalExposure: 0,
    noAnalysis: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, recentProcesses: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { count: clientCount } = await supabase
          .from('client_companies').select('id', { count: 'exact', head: true });

        const { data: procs } = await supabase
          .from('processes')
          .select('id, process_number, claimant_name, claim_value, phase, client_company_id, created_at')
          .order('created_at', { ascending: false });

        const procList = procs || [];
        const totalExposure = procList.reduce((s, p) => s + (p.claim_value || 0), 0);
        const procIds = procList.map(p => p.id);

        const { data: analyses } = procIds.length > 0
          ? await supabase.from('process_analyses').select('process_id, risk_level').in('process_id', procIds)
          : { data: [] };

        const analysisMap: Record<string, string> = {};
        (analyses || []).forEach((a: any) => { analysisMap[a.process_id] = a.risk_level; });

        const highRisk = procList.filter(p => analysisMap[p.id] === 'alto').length;
        const mediumRisk = procList.filter(p => analysisMap[p.id] === 'medio').length;
        const lowRisk = procList.filter(p => analysisMap[p.id] === 'baixo').length;
        const noAnalysis = procList.filter(p => !analysisMap[p.id]).length;

        const companyIds = [...new Set(procList.map(p => p.client_company_id).filter(Boolean))] as string[];
        const { data: companies } = companyIds.length > 0
          ? await supabase.from('client_companies').select('id, trade_name').in('id', companyIds)
          : { data: [] };
        const companyMap: Record<string, string> = {};
        (companies || []).forEach((c: any) => { companyMap[c.id] = c.trade_name; });

        const recentProcesses = procList.slice(0, 10).map(p => ({
          ...p,
          client_company: p.client_company_id ? { trade_name: companyMap[p.client_company_id] || '-' } : null,
          latest_analysis: analysisMap[p.id] ? { risk_level: analysisMap[p.id] } : null,
        }));

        setStats({
          totalClients: clientCount || 0,
          totalProcesses: procList.length,
          totalExposure,
          noAnalysis,
          highRisk,
          mediumRisk,
          lowRisk,
          recentProcesses,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-header">
          {isClient ? 'Painel da Empresa' : 'Painel do Escritório'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isClient ? 'Visão geral dos seus processos trabalhistas' : 'Visão consolidada de todos os clientes e processos'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!isClient && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <StatCard title="Clientes Empresariais" value={loading ? '...' : stats.totalClients} icon={<Building2 className="h-5 w-5" />} />
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard title="Total de Processos" value={loading ? '...' : stats.totalProcesses} icon={<FolderOpen className="h-5 w-5" />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard title="Exposição Financeira" value={loading ? '...' : formatCurrency(stats.totalExposure)} subtitle="Total acumulado" icon={<DollarSign className="h-5 w-5" />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard title="Sem Análise" value={loading ? '...' : stats.noAnalysis} subtitle="Aguardando análise de IA" icon={<Clock className="h-5 w-5" />} />
        </motion.div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card border-l-4 border-l-risk-high">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Alto Risco</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{loading ? '...' : stats.highRisk}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-risk-high" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card border-l-4 border-l-risk-medium">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Médio Risco</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{loading ? '...' : stats.mediumRisk}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-risk-medium" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card border-l-4 border-l-risk-low">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Baixo Risco</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{loading ? '...' : stats.lowRisk}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-risk-low-bg text-risk-low text-sm font-bold">✓</div>
          </div>
        </motion.div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Processos Recentes</h2>
          <Link to="/processos" className="text-sm font-medium text-primary hover:underline">Ver todos →</Link>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Processo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Reclamante</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Fase</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Risco</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
              ) : stats.recentProcesses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum processo encontrado</td></tr>
              ) : stats.recentProcesses.map(proc => (
                <tr key={proc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/processos/${proc.id}`} className="text-sm font-medium text-primary hover:underline">{proc.process_number}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{proc.client_company?.trade_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{proc.claimant_name}</td>
                  <td className="px-4 py-3"><PhaseBadge phase={proc.phase} /></td>
                  <td className="px-4 py-3">
                    {proc.latest_analysis ? <RiskBadge level={proc.latest_analysis.risk_level} /> : <span className="text-xs text-muted-foreground">Sem análise</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(proc.claim_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
