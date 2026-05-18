import { Badge } from '@/components/ui/badge';
import type { RiskLevel, ConfidenceLevel } from '@/types';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  className?: string;
}

const riskConfig = {
  alto: { label: 'Alto Risco', className: 'risk-badge-high' },
  medio: { label: 'Médio Risco', className: 'risk-badge-medium' },
  baixo: { label: 'Baixo Risco', className: 'risk-badge-low' },
};

export function RiskBadge({ level, score, className }: RiskBadgeProps) {
  const config = riskConfig[level] || riskConfig.medio;
  return (
    <Badge variant="outline" className={cn(config.className, 'px-3 py-1 text-xs border-0', className)}>
      {config.label}{score !== undefined && ` (${score}/100)`}
    </Badge>
  );
}

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  className?: string;
}

const confidenceConfig = {
  alta: { label: 'Confiança Alta', className: 'bg-risk-low-bg text-risk-low' },
  media: { label: 'Confiança Média', className: 'bg-risk-medium-bg text-risk-medium' },
  baixa: { label: 'Confiança Baixa', className: 'bg-risk-high-bg text-risk-high' },
};

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  const config = confidenceConfig[level];
  return (
    <Badge variant="outline" className={cn(config.className, 'px-3 py-1 text-xs border-0', className)}>
      {config.label}
    </Badge>
  );
}

interface PhaseBadgeProps {
  phase: string;
  className?: string;
}

export function PhaseBadge({ phase, className }: PhaseBadgeProps) {
  const labels: Record<string, string> = {
    conhecimento: 'Conhecimento',
    recursal: 'Recursal',
    execucao: 'Execução',
    arquivado: 'Arquivado',
  };
  return (
    <Badge variant="secondary" className={cn('px-3 py-1 text-xs', className)}>
      {labels[phase] || phase}
    </Badge>
  );
}
