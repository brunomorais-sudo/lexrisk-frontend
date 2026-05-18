import { useState } from 'react';
import { Download, AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateProcessReportPDF } from '@/lib/pdf-report';
import { clientCompanies, users } from '@/data/mock-data';
import type { Process, ProcessAnalysis } from '@/types';

interface Props {
  process: Process;
  analysis?: ProcessAnalysis | null;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

// Tradutor: jurídico → linguagem simples
function plainRiskExplanation(level: string, score: number): string {
  if (level === 'alto') {
    return `Este processo apresenta risco ELEVADO de condenação. Com base nas evidências e na jurisprudência analisada, há grande probabilidade de a empresa ser obrigada a pagar a indenização pleiteada — total ou parcialmente. Recomenda-se atenção máxima e considerar estratégias para reduzir o impacto, como acordo.`;
  }
  if (level === 'medio') {
    return `O processo apresenta risco MODERADO. Há argumentos defensivos relevantes, mas também pontos vulneráveis. O resultado depende da instrução probatória e da jurisprudência aplicada. Recomenda-se monitoramento ativo e preparação criteriosa da defesa.`;
  }
  return `Este processo apresenta risco BAIXO. As chances de condenação significativa são reduzidas. Ainda assim, é importante manter o acompanhamento ativo até o trânsito em julgado.`;
}

function plainRecommendation(level: string): string {
  if (level === 'alto') return 'Avaliar proposta de acordo e reforçar produção de provas defensivas.';
  if (level === 'medio') return 'Acompanhar de perto e preparar bem testemunhas e documentos.';
  return 'Manter acompanhamento padrão e monitorar próximas movimentações.';
}

export function ClientExecutiveSummary({ process, analysis }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    try {
      setGenerating(true);
      const clientCompany = clientCompanies.find(c => c.id === process.client_company_id) || null;
      const lawyer = users.find(u => u.id === process.created_by);
      await generateProcessReportPDF({
        process,
        analysis,
        clientCompany,
        responsibleLawyer: lawyer
          ? { name: lawyer.full_name, email: lawyer.email, phone: '+55 (11) 4002-8922' }
          : null,
      });
      toast.success('Relatório PDF gerado com sucesso.');
    } catch (e: any) {
      toast.error('Não foi possível gerar o PDF.', { description: e?.message });
    } finally {
      setGenerating(false);
    }
  };

  if (!analysis) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h3 className="mt-3 text-lg font-semibold text-foreground">
          Análise em preparação
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Nossa equipe ainda está analisando este processo. Em breve você verá aqui um resumo claro sobre os riscos e recomendações.
        </p>
      </div>
    );
  }

  const score = analysis.risk_score_numeric || 0;
  const level = analysis.risk_level;

  const levelStyle =
    level === 'alto' ? { card: 'border-l-4 border-l-risk-high', text: 'text-risk-high', bg: 'bg-risk-high-bg', icon: AlertTriangle, label: 'Risco Alto' }
    : level === 'medio' ? { card: 'border-l-4 border-l-risk-medium', text: 'text-risk-medium', bg: 'bg-risk-medium-bg', icon: AlertTriangle, label: 'Risco Médio' }
    : { card: 'border-l-4 border-l-risk-low', text: 'text-risk-low', bg: 'bg-risk-low-bg', icon: CheckCircle2, label: 'Risco Baixo' };

  const Icon = levelStyle.icon;

  return (
    <div className="space-y-6">
      {/* Header com download */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Resumo Executivo</h2>
          <p className="text-sm text-muted-foreground">
            Em linguagem simples, sem termos técnicos
          </p>
        </div>
        <Button onClick={handleDownload} variant="outline" disabled={generating} className="gap-2 shrink-0">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {generating ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>

      {/* Banner de risco */}
      <div className={`rounded-xl border bg-card p-6 ${levelStyle.card}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${levelStyle.bg}`}>
            <Icon className={`h-6 w-6 ${levelStyle.text}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className={`text-lg font-bold ${levelStyle.text}`}>{levelStyle.label}</h3>
              <span className="text-sm text-muted-foreground">
                Score: <strong className="text-foreground">{score}/100</strong>
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {plainRiskExplanation(level, score)}
            </p>
          </div>
        </div>
      </div>

      {/* Sobre o que é o processo */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="section-title mb-3">O que está sendo discutido?</h3>
        <p className="text-sm leading-relaxed text-foreground">
          <strong>{process.claimant_name}</strong>, ex-funcionário(a), está
          processando a empresa pleiteando direitos relacionados a:{' '}
          <strong>{process.subject_main}</strong>.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Valor pedido</p>
            <p className="mt-1 font-semibold text-foreground">{formatCurrency(process.claim_value)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Exposição estimada</p>
            <p className="mt-1 font-semibold text-foreground">
              {formatCurrency(analysis.case_value_identified || process.estimated_financial_exposure_base || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Situação atual</p>
            <p className="mt-1 font-semibold text-foreground capitalize">{process.phase}</p>
          </div>
        </div>
      </div>

      {/* Recomendação */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="section-title mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Recomendação do escritório
        </h3>
        <p className="text-sm leading-relaxed text-foreground">
          {plainRecommendation(level)}
        </p>
        {analysis.next_steps && analysis.next_steps.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Próximas ações</p>
            <ul className="space-y-2">
              {analysis.next_steps.slice(0, 4).map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Impacto financeiro em linguagem simples */}
      {analysis.financial_impact_summary && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="section-title mb-3">Impacto financeiro estimado</h3>
          <p className="text-sm leading-relaxed text-foreground">
            {analysis.financial_impact_summary}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic text-center">
        Este resumo é uma análise preliminar baseada nas informações disponíveis até o momento.
        Para detalhes técnicos completos, fale com o advogado responsável.
      </p>
    </div>
  );
}
