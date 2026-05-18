import { useState, useEffect } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Loader2, TrendingUp, ArrowUpRight, CalendarClock } from 'lucide-react';
import { fetchSelicDailyFactors, calculateSimpleVsCompound, projectFutureComparison, type MonthlySelicProjection, type SelicDailyFactor } from '@/lib/selic';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function formatCurrencyFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function formatPercent(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v - 1);
}

interface FinancialPlanningTabProps {
  process: {
    estimated_financial_exposure_min?: number | null;
    estimated_financial_exposure_base?: number | null;
    estimated_financial_exposure_max?: number | null;
    distribution_date?: string | null;
    created_at: string;
  };
}

type ExposureType = 'min' | 'base' | 'max';

export function FinancialPlanningTab({ process }: FinancialPlanningTabProps) {
  const [projections, setProjections] = useState<MonthlySelicProjection[]>([]);
  const [futureProjections, setFutureProjections] = useState<MonthlySelicProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeExposure, setActiveExposure] = useState<ExposureType>('base');
  const [activeSection, setActiveSection] = useState<'historical' | 'projection'>('historical');

  const hasExposure = !!process.estimated_financial_exposure_base;
  const expMin = process.estimated_financial_exposure_min || 0;
  const expBase = process.estimated_financial_exposure_base || 0;
  const expMax = process.estimated_financial_exposure_max || 0;

  useEffect(() => {
    if (!hasExposure) return;

    const startDate = new Date(process.distribution_date || process.created_at);
    const endDate = new Date();

    if (endDate.getTime() - startDate.getTime() < 25 * 24 * 60 * 60 * 1000) return;

    setLoading(true);
    setError(null);

    fetchSelicDailyFactors(startDate, endDate)
      .then(factors => {
        const projs = calculateSimpleVsCompound(factors, expMin, expBase, expMax);
        setProjections(projs);
        const future = projectFutureComparison(projs, factors, 48, expMin, expBase, expMax);
        setFutureProjections(future);
      })
      .catch(err => {
        console.error('Selic fetch error:', err);
        setError('Não foi possível carregar dados da Selic do Banco Central.');
      })
      .finally(() => setLoading(false));
  }, [hasExposure, process.distribution_date, process.created_at, expMin, expBase, expMax]);

  const latest = projections.length > 0 ? projections[projections.length - 1] : null;

  const getAccumulated = (p: MonthlySelicProjection, type: ExposureType) =>
    type === 'min' ? p.exposureMinAccumulated : type === 'base' ? p.exposureBaseAccumulated : p.exposureMaxAccumulated;

  const getCompound = (p: MonthlySelicProjection, type: ExposureType) =>
    type === 'min' ? p.exposureMinCompound : type === 'base' ? p.exposureBaseCompound : p.exposureMaxCompound;

  const getOriginal = (type: ExposureType) =>
    type === 'min' ? expMin : type === 'base' ? expBase : expMax;

  const exposureLabel = (type: ExposureType) =>
    type === 'min' ? 'Mínima' : type === 'base' ? 'Base' : 'Máxima';

  if (!hasExposure) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">Exposição financeira ainda não estimada. Execute a análise de IA primeiro.</p>
      </div>
    );
  }

  const futureLatest = futureProjections.length > 0 ? futureProjections[futureProjections.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Section toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('historical')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeSection === 'historical' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          <Calculator className="h-4 w-4" />
          Realizado
        </button>
        <button
          onClick={() => setActiveSection('projection')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeSection === 'projection' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          <CalendarClock className="h-4 w-4" />
          Simulação 48 Meses
        </button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Buscando dados do Banco Central...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && latest && activeSection === 'historical' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Planejamento Financeiro — Realizado</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Comparação entre Selic acumulada (simples) e Selic composta desde a distribuição
              ({new Date(process.distribution_date || process.created_at).toLocaleDateString('pt-BR')}) até o mês atual.
            </p>

            <Tabs value={activeExposure} onValueChange={v => setActiveExposure(v as ExposureType)}>
              <TabsList className="mb-4">
                <TabsTrigger value="min" className="text-xs">Exposição Mínima</TabsTrigger>
                <TabsTrigger value="base" className="text-xs">Exposição Base</TabsTrigger>
                <TabsTrigger value="max" className="text-xs">Exposição Máxima</TabsTrigger>
              </TabsList>

              {(['min', 'base', 'max'] as ExposureType[]).map(type => (
                <TabsContent key={type} value={type}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Valor Original ({exposureLabel(type)})</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(getOriginal(type))}</p>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Selic Acumulada (Simples)</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(getAccumulated(latest, type))}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <ArrowUpRight className="h-3 w-3 inline" /> {formatCurrencyFull(getAccumulated(latest, type) - getOriginal(type))} ({formatPercent(latest.accumulatedFactor)})
                      </p>
                    </div>
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Selic Composta</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(getCompound(latest, type))}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <ArrowUpRight className="h-3 w-3 inline" /> {formatCurrencyFull(getCompound(latest, type) - getOriginal(type))} ({formatPercent(latest.compoundFactor)})
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-accent/50 p-4 mb-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <TrendingUp className="h-4 w-4 text-accent-foreground" />
                      Diferença Selic Composta vs Acumulada:
                      <span className="font-bold">
                        {formatCurrencyFull(getCompound(latest, type) - getAccumulated(latest, type))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      A Selic composta gera {formatPercent(latest.compoundFactor / latest.accumulatedFactor)} a mais que a acumulada simples.
                    </p>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Mês</TableHead>
                          <TableHead className="text-xs text-right">Selic Acumulada</TableHead>
                          <TableHead className="text-xs text-right">Valor Simples</TableHead>
                          <TableHead className="text-xs text-right">Selic Composta</TableHead>
                          <TableHead className="text-xs text-right">Valor Composto</TableHead>
                          <TableHead className="text-xs text-right">Diferença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projections.map((p, i) => {
                          const accVal = getAccumulated(p, type);
                          const compVal = getCompound(p, type);
                          const diff = compVal - accVal;
                          const isLast = i === projections.length - 1;
                          return (
                            <TableRow key={p.month} className={isLast ? 'bg-primary/5 font-semibold' : ''}>
                              <TableCell className="text-xs">{p.monthLabel}</TableCell>
                              <TableCell className="text-xs text-right">{formatPercent(p.accumulatedFactor)}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(accVal)}</TableCell>
                              <TableCell className="text-xs text-right">{formatPercent(p.compoundFactor)}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(compVal)}</TableCell>
                              <TableCell className="text-xs text-right text-destructive">{diff > 0 ? '+' : ''}{formatCurrency(diff)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fonte: Banco Central do Brasil (Série 11). Selic acumulada = soma linear. Selic composta = capitalização mensal.
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}

        {/* 48-month future projection */}
        {!loading && !error && futureLatest && activeSection === 'projection' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Simulação — Projeção 48 Meses</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Projeção dos próximos 48 meses utilizando a taxa Selic média mensal observada no período histórico.
              Compara a evolução pela Selic acumulada (simples) vs Selic composta.
            </p>

            <Tabs value={activeExposure} onValueChange={v => setActiveExposure(v as ExposureType)}>
              <TabsList className="mb-4">
                <TabsTrigger value="min" className="text-xs">Exposição Mínima</TabsTrigger>
                <TabsTrigger value="base" className="text-xs">Exposição Base</TabsTrigger>
                <TabsTrigger value="max" className="text-xs">Exposição Máxima</TabsTrigger>
              </TabsList>

              {(['min', 'base', 'max'] as ExposureType[]).map(type => (
                <TabsContent key={type} value={type}>
                  {/* Current vs projected summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-xl border bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Valor Atual ({exposureLabel(type)})</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(getAccumulated(latest!, type))}</p>
                      <p className="text-[10px] text-muted-foreground">Selic acumulada hoje</p>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Projeção Acumulada (48m)</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(getAccumulated(futureLatest, type))}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatPercent(futureLatest.accumulatedFactor)}</p>
                    </div>
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Projeção Composta (48m)</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(getCompound(futureLatest, type))}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatPercent(futureLatest.compoundFactor)}</p>
                    </div>
                    <div className="rounded-xl border border-accent bg-accent/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Diferença em 48m</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrencyFull(getCompound(futureLatest, type) - getAccumulated(futureLatest, type))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Composta vs Acumulada</p>
                    </div>
                  </div>

                  {/* Projection table */}
                  <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Mês</TableHead>
                          <TableHead className="text-xs text-right">Fator Acumulado</TableHead>
                          <TableHead className="text-xs text-right">Valor Acumulado</TableHead>
                          <TableHead className="text-xs text-right">Fator Composto</TableHead>
                          <TableHead className="text-xs text-right">Valor Composto</TableHead>
                          <TableHead className="text-xs text-right">Diferença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {futureProjections.map((p, i) => {
                          const accVal = getAccumulated(p, type);
                          const compVal = getCompound(p, type);
                          const diff = compVal - accVal;
                          const isLast = i === futureProjections.length - 1;
                          const isYear = (i + 1) % 12 === 0;
                          return (
                            <TableRow key={p.month} className={isLast ? 'bg-primary/5 font-semibold' : isYear ? 'bg-muted/30' : ''}>
                              <TableCell className="text-xs">{p.monthLabel}</TableCell>
                              <TableCell className="text-xs text-right">{formatPercent(p.accumulatedFactor)}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(accVal)}</TableCell>
                              <TableCell className="text-xs text-right">{formatPercent(p.compoundFactor)}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(compVal)}</TableCell>
                              <TableCell className="text-xs text-right text-destructive">{diff > 0 ? '+' : ''}{formatCurrency(diff)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ Simulação baseada na taxa Selic média mensal observada. Valores futuros são estimativas e podem variar conforme decisões do COPOM.
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}

        {!loading && !error && projections.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Período insuficiente para projeção (menos de 1 mês desde a distribuição).</p>
        )}
      </div>
    </div>
  );
}
