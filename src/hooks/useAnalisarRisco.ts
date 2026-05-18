import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VerbaInput {
  descricao: string;
  valor?: number;
  peso?: number;
}

export interface AnalisarRiscoInput {
  processoId?: string;
  dadosProcesso?: {
    valorCausa: number;
    dataInicio: string; // ISO
    verbas: VerbaInput[];
    reclamante?: string;
    reclamada?: string;
  };
  valor_causa?: number;
  data_ajuizamento?: string;
  pedidos?: Array<string | VerbaInput>;
  valor_provisionado?: number;
}

export interface ProvisionamentoLinha {
  mes: number;
  valorDivida: number;
  valorAplicacao: number;
  diferenca: number;
}

export interface AnalisarRiscoResult {
  processoId?: string;
  risco: "ALTO" | "MEDIO" | "BAIXO";
  score: number;
  scoreFinanceiro?: number;
  selicAcumulada: number;
  valorAtualizado: number;
  provisionamento: ProvisionamentoLinha[];
  projecao12Meses?: ProvisionamentoLinha[];
  nivelRiscoPorPedido?: Array<{ descricao: string; nivel: "ALTO" | "MEDIO" | "BAIXO"; justificativa?: string }>;
  justificativaRisco: string;
}

export function useAnalisarRisco() {
  const [data, setData] = useState<AnalisarRiscoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analisar = useCallback(async (input: AnalisarRiscoInput) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke<AnalisarRiscoResult>(
        "analisar-risco",
        { body: input }
      );
      if (fnErr) throw fnErr;
      if (!resp) throw new Error("Resposta vazia da função analisar-risco");
      setData(resp);
      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { analisar, data, loading, error, reset };
}
