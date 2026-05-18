import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Probabilidade = "PROVÁVEL" | "POSSÍVEL" | "IMPROVÁVEL" | "PROVAVEL" | "POSSIVEL" | "IMPROVAVEL";

export interface PedidoAnalise {
  descricao: string;
  probabilidade: Probabilidade;
  fundamentacao: string;
  estrategiaDefesa: string;
}

export interface AnalisarJuridicoInput {
  processoId?: string;
  textoProcesso?: string;
  documentos?: string[];
  cargo?: string;
  data_admissao?: string;
  salario_base?: number;
  regime_trabalho?: string;
  jornada_contratual?: string;
  pedidos?: string[];
  descricao_fatos?: string;
}

export interface AnalisarJuridicoResult {
  processoId?: string;
  resumoProcesso: string;
  pedidos: PedidoAnalise[];
  pontosFortes: string[];
  pontosFracos: string[];
  estrategiaGeral: string;
  recomendacao: string;
  parecerJuridico?: string;
  teseDefesa?: string;
}

export function useAnalisarJuridico() {
  const [data, setData] = useState<AnalisarJuridicoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analisar = useCallback(async (input: AnalisarJuridicoInput) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke<AnalisarJuridicoResult>(
        "analisar-juridico",
        { body: input }
      );
      if (fnErr) throw fnErr;
      if (!resp) throw new Error("Resposta vazia da função analisar-juridico");
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
