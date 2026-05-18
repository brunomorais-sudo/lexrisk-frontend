import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/cards/StatCard';
import { RiskBadge, PhaseBadge } from '@/components/badges/RiskBadge';
import {
  processes, processAnalyses, clientCompanies,
} from '@/data/mock-data';
import { FolderOpen, DollarSign, Gauge, AlertTriangle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(value);
}

const PHASE_LABELS: Record<string, string> = {
  conhecimento: 'Conhecimento',
  recursal: 'Recursal',
  execucao: 'Execução',
  arquivado: 'Arquivado',
};

// HSL strings — design tokens (definidos em index.css)
const PHASE_COLORS = ['hsl(var(--primary))', 'hsl(var(--risk-medium))', 'hsl(var(--risk-high))', 'hsl(var(--muted-foreground))'];

export default function ClientDashboardPage() {
  const { organizationId, user } = useAuth();

  const company = clientCompanies.find(c => c.organization_id === organizationId);

  const data = useMemo(() => {
    if (!company) return null;

    const myProcesses = processes
      .filter(p => p.client_company_id === company.id)
      .map(p => ({
        ...p,
        latest_analysis: processAnalyses.find(a => a.process_id === p.id),
      }));

    const totalExposure = myProcesses.reduce(
      (sum, p) =>
        sum + (p.latest_analysis?.case_value_identified || p.claim_value || 0),
      0,
    );

    const analyzed = myProcesses.filter(p => p.latest_analysis);
    const avgScore = analyzed.length
      ? Math.round(
          analyzed.reduce((s, p) => s + (p.latest_analysis?.risk_score_numeric || 0), 0) /
            analyzed.length,
        )
      : 0;

    const phaseGroups = myProcesses.reduce<Record<string, number>>((acc, p) => {
      acc[p.phase] = (acc[p.phase] || 0) + 1;
      return acc;
    }, {});
    const phaseData = Object.entries(phaseGroups).map(([phase, count]) => ({
      name: PHASE_LABELS[phase] || phase,
      value: count,
    }));

    const riskData = [
      { name: 'Alto', value: analyzed.filter(p => p.latest_analysis?.risk_level === 'alto').length, fill: 'hsl(var(--risk-high))' },
      { name: 'Médio', value: analyzed.filter(p => p.latest_analysis?.risk_level === 'medio').length, fill: 'hsl(var(--risk-medium))' },
      { name: 'Baixo', value: analyzed.filter(p => p.latest_analysis?.risk_level === 'baixo').length, fill: 'hsl(var(--risk-low))' },
    ];

    return {
      myProcesses,
      totalExposure,
      avgScore,
      phaseData,
      riskData,
      highRisk: riskData[0].value,
    };
  }, [company]);

  if (!company || !data) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Empresa não localizada.
      </div>
    );
  }

  const scoreColor =
    data.avgScore >= 70 ? 'text-risk-high'
    : data.avgScore >= 40 ? 'text-risk-medium'
    : 'text-risk-low';

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-header">Bem-vindo, {user?.full_name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão executiva dos processos de <strong>{company.trade_name}</strong>
          </p>
        </div>
        <Link to="/contato">
          <Button variant="outline" className="gap-2">
            <Phone className="h-4 w-4" /> Falar com o escritório
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <StatCard
            title="Total de Processos"
            value={data.myProcesses.length}
            icon={<FolderOpen className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard
            title="Valor em Risco"
            value={formatCurrency(data.totalExposure)}
            subtitle="Exposição total estimada"
            icon={<DollarSign className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score Médio de Risco</p>
                <p className={`mt-1 text-3xl font-bold ${scoreColor}`}>
                  {data.avgScore}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </p>
              </div>
              <Gauge className={`h-8 w-8 ${scoreColor}`} />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="stat-card border-l-4 border-l-risk-high">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Casos Críticos</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{data.highRisk}</p>
                <p className="text-xs text-muted-foreground">Alto risco</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-risk-high" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border bg-card p-5"
        >
          <h3 className="section-title mb-4">Processos por Fase</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.phaseData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data.phaseData.map((_, idx) => (
                  <Cell key={idx} fill={PHASE_COLORS[idx % PHASE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border bg-card p-5"
        >
          <h3 className="section-title mb-4">Distribuição por Risco</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  color: 'hsl(var(--foreground))',
                }}
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Lista resumida */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Seus Processos</h2>
          <Link to="/processos" className="text-sm font-medium text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Processo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Reclamante</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Fase</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Risco</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.myProcesses.slice(0, 6).map(proc => (
                <tr key={proc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/processos/${proc.id}`} className="text-sm font-medium text-primary hover:underline font-mono">
                      {proc.process_number}
                    </Link>
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
