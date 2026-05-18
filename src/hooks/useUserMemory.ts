import { useEffect, useState } from 'react';
import { getMemoria, type FeedbackDoc } from '@/lib/memoria';

/** Shape exibido pelo painel "Seu Assistente Jurídico". */
export interface UserMemoryView {
  teses_preferidas: string[];
  padroes_acordo: Array<{ pedido: string; faixa: string; frequencia: number }>;
  feedbacks_docs: FeedbackDoc[];
  casos_analisados: number;
  ultima_atualizacao: string | null;
}

function fmtFaixa(min: number, max: number): string {
  const f = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  return min === max ? f(min) : `${f(min)} – ${f(max)}`;
}

function adaptar(): UserMemoryView {
  const { individual, escritorio } = getMemoria();

  const teses_preferidas = (individual?.teses ?? [])
    .slice()
    .sort((a, b) => b.usos - a.usos)
    .map((t) => t.texto);

  // Agrupa acordos por tipo (pedido) calculando faixa de valor + frequência
  const grupos = new Map<string, { min: number; max: number; freq: number }>();
  for (const a of individual?.acordos ?? []) {
    const g = grupos.get(a.tipo);
    if (g) {
      g.min = Math.min(g.min, a.valor);
      g.max = Math.max(g.max, a.valor);
      g.freq += 1;
    } else {
      grupos.set(a.tipo, { min: a.valor, max: a.valor, freq: 1 });
    }
  }
  const padroes_acordo = Array.from(grupos.entries())
    .map(([pedido, g]) => ({ pedido, faixa: fmtFaixa(g.min, g.max), frequencia: g.freq }))
    .sort((a, b) => b.frequencia - a.frequencia);

  const feedbacks_docs = (individual?.feedback_docs ?? []).slice().reverse();

  // Casos analisados: contagem de eventos do tipo "analise_*" no escritório+individual
  const eventos = [
    ...(individual?.eventos ?? []),
    ...(escritorio?.eventos ?? []),
  ];
  const casos_analisados = new Set(
    eventos
      .filter((e) => typeof e.nome === 'string' && e.nome.startsWith('analise'))
      .map((e) => String(e.payload?.process_id ?? e.ts)),
  ).size;

  const tsList = [
    ...feedbacks_docs.map((f) => f.ts),
    ...(individual?.teses ?? []).map((t) => t.ultima_ts),
    ...(individual?.acordos ?? []).map((a) => a.ts),
    ...eventos.map((e) => e.ts),
  ];
  const ultima_atualizacao =
    tsList.length > 0 ? tsList.sort().slice(-1)[0] : null;

  return {
    teses_preferidas,
    padroes_acordo,
    feedbacks_docs,
    casos_analisados,
    ultima_atualizacao,
  };
}

/** Lê a memória do usuário atual e re-renderiza quando o localStorage muda. */
export function useUserMemory(): UserMemoryView {
  const [view, setView] = useState<UserMemoryView>(() => adaptar());

  useEffect(() => {
    const refresh = () => setView(adaptar());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return view;
}
