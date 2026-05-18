import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-pro";

// SELIC mensal aproximada (% a.m.). Para MVP usamos taxa média recente ~0.93% a.m. (~11.75% a.a.).
// Em produção, integrar com BCB SGS 4390.
const SELIC_MENSAL = 0.0093;

interface Verba {
  descricao: string;
  valor?: number;
  peso?: number; // 1-10, opcional
}

interface DadosProcesso {
  valorCausa: number;
  dataInicio: string; // ISO
  verbas: Verba[];
  reclamante?: string;
  reclamada?: string;
}

function normalizarEntrada(body: any): { processoId: string; dadosProcesso: DadosProcesso; valorProvisionado?: number } {
  const pedidos = body.pedidos ?? body.dadosProcesso?.verbas ?? [];
  const verbas = (pedidos as Array<string | Verba>).map((pedido) =>
    typeof pedido === "string" ? { descricao: pedido } : pedido
  );

  return {
    processoId: body.processoId ?? body.processo_id ?? "processo-sem-id",
    valorProvisionado: body.valor_provisionado,
    dadosProcesso: body.dadosProcesso ?? {
      valorCausa: body.valor_causa,
      dataInicio: body.data_ajuizamento,
      verbas,
      reclamante: body.reclamante,
      reclamada: body.reclamada,
    },
  };
}

function mesesEntre(dataInicio: Date, dataFim: Date): number {
  const anos = dataFim.getFullYear() - dataInicio.getFullYear();
  const meses = dataFim.getMonth() - dataInicio.getMonth();
  return Math.max(0, anos * 12 + meses);
}

function calcSelicAcumulada(meses: number): number {
  return Math.pow(1 + SELIC_MENSAL, meses) - 1;
}

function gerarProvisionamento(valorAtualizado: number, mesesAFrente = 12) {
  const linhas: Array<{
    mes: number;
    valorDivida: number;
    valorAplicacao: number;
    diferenca: number;
  }> = [];
  let divida = valorAtualizado;
  let aplicacao = valorAtualizado;
  for (let m = 1; m <= mesesAFrente; m++) {
    divida = divida * (1 + SELIC_MENSAL);
    aplicacao = aplicacao * (1 + SELIC_MENSAL);
    linhas.push({
      mes: m,
      valorDivida: Math.round(divida * 100) / 100,
      valorAplicacao: Math.round(aplicacao * 100) / 100,
      diferenca: Math.round((aplicacao - divida) * 100) / 100,
    });
  }
  return linhas;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processoId, dadosProcesso, valorProvisionado } = normalizarEntrada(await req.json());

    if (!dadosProcesso?.valorCausa || !dadosProcesso?.dataInicio) {
      return new Response(
        JSON.stringify({ error: "valorCausa e dataInicio são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Cálculo SELIC determinístico
    const inicio = new Date(dadosProcesso.dataInicio);
    const hoje = new Date();
    const meses = mesesEntre(inicio, hoje);
    const selicAcumulada = calcSelicAcumulada(meses);
    const valorAtualizado = dadosProcesso.valorCausa * (1 + selicAcumulada);

    // 2. Tabela de provisionamento (12 meses)
    const provisionamento = gerarProvisionamento(valorAtualizado, 12);

    // 3. Classificação de risco via IA com base nas verbas
    const systemPrompt = `Você é um analista de risco trabalhista para a defesa do empregador.
Receberá uma lista de verbas pleiteadas e deve classificar o risco GLOBAL do processo.
Considere: verbas de natureza salarial (horas extras, adicional noturno, equiparação), danos morais, multas (467, 477), FGTS, vínculo, e a probabilidade de procedência típica no TST.

Retorne EXCLUSIVAMENTE JSON válido (sem markdown) no formato:
{
  "risco": "ALTO" | "MEDIO" | "BAIXO",
  "score": número de 0 a 100 (quanto maior, mais arriscado para a reclamada),
  "nivelRiscoPorPedido": [{ "descricao": "string", "nivel": "ALTO" | "MEDIO" | "BAIXO", "justificativa": "string" }],
  "justificativaRisco": "texto técnico de 3-5 linhas explicando o score com base nas verbas"
}`;

    const userPayload = {
      valorCausa: dadosProcesso.valorCausa,
      valorAtualizado: Math.round(valorAtualizado * 100) / 100,
      mesesDesdeInicio: meses,
      verbas: dadosProcesso.verbas ?? [],
      valorProvisionado,
      reclamante: dadosProcesso.reclamante,
      reclamada: dadosProcesso.reclamada,
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { risco: string; score: number; justificativaRisco: string; nivelRiscoPorPedido?: unknown[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { risco: "MEDIO", score: 50, justificativaRisco: "Resposta IA inválida — fallback aplicado." };
    }

    return new Response(
      JSON.stringify({
        processoId,
        risco: parsed.risco,
        score: parsed.score,
        scoreFinanceiro: parsed.score,
        selicAcumulada: Math.round(selicAcumulada * 10000) / 10000,
        valorAtualizado: Math.round(valorAtualizado * 100) / 100,
        provisionamento,
        projecao12Meses: provisionamento,
        nivelRiscoPorPedido: parsed.nivelRiscoPorPedido ?? (dadosProcesso.verbas ?? []).map((verba) => ({
          descricao: verba.descricao,
          nivel: parsed.risco,
          justificativa: parsed.justificativaRisco,
        })),
        justificativaRisco: parsed.justificativaRisco,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analisar-risco error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
