import { useState, useEffect, useMemo } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Loader2 } from 'lucide-react';
import { fetchSelicDailyFactors, calculateProjections, type MonthlySelicProjection } from '@/lib/selic';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function formatPercent(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v - 1);
}

interface FinancialImpactTabProps {
  process: {
    claim_value: number;
    estimated_financial_exposure_min?: number | null;
    estimated_financial_exposure_base?: number | null;
    estimated_financial_exposure_max?: number | null;
    distribution_date?: string | null;
    created_at: string;
  };
  analysis?: {
    financial_impact_summary?: string;
  } | null;
}

export function FinancialImpactTab({ process, analysis }: FinancialImpactTabProps) {
  const [projections, setProjections] = useState<MonthlySelicProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExposure = !!process.estimated_financial_exposure_base;
  const expMin = process.estimated_financial_exposure_min || 0;
  const expBase = process.estimated_financial_exposure_base || 0;
  const expMax = process.estimated_financial_exposure_max || 0;

  useEffect(() => {
    if (!hasExposure) return;

    const startDate = new Date(process.distribution_date || process.created_at);
    const endDate = new Date();

    // Only fetch if there's at least 1 month difference
    if (endDate.getTime() - startDate.getTime() < 25 * 24 * 60 * 60 * 1000) return;

    setLoading(true);
    setError(null);

    fetchSelicDailyFactors(startDate, endDate)
      .then(factors => {
        const projs = calculateProjections(factors, startDate, expMin, expBase, expMax);
        setProjections(projs);
      })
      .catch(err => {
        console.error('Selic fetch error:', err);
        setError('Não foi possível carregar dados da Selic do Banco Central.');
      })
      .finally(() => setLoading(false));
  }, [hasExposure, process.distribution_date, process.created_at, expMin, expBase, expMax]);

  const latestProjection = projections.length > 0 ? projections[projections.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Valor da causa */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Impacto Financeiro</h3>
        <div className="text-3xl font-bold text-foreground mb-1">{formatCurrency(process.claim_value)}</div>
        <p className="text-sm text-muted-foreground mb-6">Valor da causa</p>

        {hasExposure ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl bg-risk-low-bg p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Exposição Mínima</p>
                <p className="text-xl font-bold text-risk-low">{formatCurrency(expMin)}</p>
              </div>
              <div className="rounded-xl bg-risk-medium-bg p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Exposição Base</p>
                <p className="text-xl font-bold text-risk-medium">{formatCurrency(expBase)}</p>
              </div>
              <div className="rounded-xl bg-risk-high-bg p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Exposição Máxima</p>
                <p className="text-xl font-bold text-risk-high">{formatCurrency(expMax)}</p>
              </div>
            </div>
            {analysis?.financial_impact_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.financial_impact_summary}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Exposição financeira ainda não estimada. Execute a análise de IA.</p>
        )}
      </div>

      {/* Selic Projection */}
      {hasExposure && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Projeção de Atualização pela Selic</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Simulação da correção monetária pela taxa Selic acumulada desde a distribuição do processo ({new Date(process.distribution_date || process.created_at).toLocaleDateString('pt-BR')})
          </p>

          {loading && (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Buscando dados do Banco Central...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
          )}

          {!loading && !error && latestProjection && (
            <>
              {/* Current corrected values */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl border border-risk-low/30 bg-risk-low-bg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Mínima Atualizada</p>
                  <p className="text-lg font-bold text-risk-low">{formatCurrency(latestProjection.exposureMinAccumulated)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Fator: {formatPercent(latestProjection.accumulatedFactor)}</p>
                </div>
                <div className="rounded-xl border border-risk-medium/30 bg-risk-medium-bg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Base Atualizada</p>
                  <p className="text-lg font-bold text-risk-medium">{formatCurrency(latestProjection.exposureBaseAccumulated)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Fator: {formatPercent(latestProjection.accumulatedFactor)}</p>
                </div>
                <div className="rounded-xl border border-risk-high/30 bg-risk-high-bg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Máxima Atualizada</p>
                  <p className="text-lg font-bold text-risk-high">{formatCurrency(latestProjection.exposureMaxAccumulated)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Fator: {formatPercent(latestProjection.accumulatedFactor)}</p>
                </div>
              </div>

              {/* Monthly table */}
              <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Mês</TableHead>
                      <TableHead className="text-xs text-right">Fator Acumulado</TableHead>
                      <TableHead className="text-xs text-right">Mínima</TableHead>
                      <TableHead className="text-xs text-right">Base</TableHead>
                      <TableHead className="text-xs text-right">Máxima</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projections.map((p, i) => (
                      <TableRow key={p.month} className={i === projections.length - 1 ? 'bg-primary/5 font-semibold' : ''}>
                        <TableCell className="text-xs">{p.monthLabel}</TableCell>
                        <TableCell className="text-xs text-right">{formatPercent(p.accumulatedFactor)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(p.exposureMinAccumulated)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(p.exposureBaseAccumulated)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(p.exposureMaxAccumulated)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Fonte: Banco Central do Brasil (Série 11 - Fator diário da taxa Selic)
              </p>
            </>
          )}

          {!loading && !error && projections.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Período insuficiente para projeção (menos de 1 mês desde a distribuição).</p>
          )}
        </div>
      )}
    </div>
  );
}
