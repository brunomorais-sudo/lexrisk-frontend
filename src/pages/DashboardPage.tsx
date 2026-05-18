import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/cards/StatCard';
import { RiskBadge, PhaseBadge } from '@/components/badges/RiskBadge';
import { getDashboardStats, getClientDashboardStats, clientCompanies, memberships } from '@/data/mock-data';
import { Building2, FolderOpen, AlertTriangle, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export default function DashboardPage() {
  const { role, organizationId } = useAuth();

  const isClient = role === 'client_user';
  let stats;

  if (isClient && organizationId) {
    const company = clientCompanies.find(c => c.organization_id === organizationId);
    stats = company ? getClientDashboardStats(company.id) : getDashboardStats();
  } else {
    stats = getDashboardStats();
  }

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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!isClient && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <StatCard title="Clientes Empresariais" value={stats.totalClients} icon={<Building2 className="h-5 w-5" />} />
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard title="Total de Processos" value={stats.totalProcesses} icon={<FolderOpen className="h-5 w-5" />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            title="Exposição Financeira"
            value={formatCurrency(stats.totalExposure)}
            subtitle="Total acumulado"
            icon={<DollarSign className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard
            title="Sem Análise"
            value={stats.noAnalysis}
            subtitle="Aguardando análise de IA"
            icon={<Clock className="h-5 w-5" />}
          />
        </motion.div>
      </div>

      {/* Risk Distribution */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="stat-card border-l-4 border-l-risk-high">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Alto Risco</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{stats.highRisk}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-risk-high" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="stat-card border-l-4 border-l-risk-medium">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Médio Risco</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{stats.mediumRisk}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-risk-medium" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="stat-card border-l-4 border-l-risk-low">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Baixo Risco</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{stats.lowRisk}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-risk-low-bg text-risk-low text-sm font-bold">✓</div>
          </div>
        </motion.div>
      </div>

      {/* Recent Processes */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Processos Recentes</h2>
          <Link to="/processos" className="text-sm font-medium text-primary hover:underline">
            Ver todos →
          </Link>
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
              {stats.recentProcesses.map(proc => (
                <tr key={proc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/processos/${proc.id}`} className="text-sm font-medium text-primary hover:underline">
                      {proc.process_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {proc.client_company?.trade_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{proc.claimant_name}</td>
                  <td className="px-4 py-3"><PhaseBadge phase={proc.phase} /></td>
                  <td className="px-4 py-3">
                    {proc.latest_analysis ? (
                      <RiskBadge level={proc.latest_analysis.risk_level} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem análise</span>
                    )}
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
