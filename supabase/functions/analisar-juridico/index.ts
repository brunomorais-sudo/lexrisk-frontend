import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "openai/gpt-5";

const SYSTEM_PROMPT = `Você é um Ministro aposentado do TST, com 38 anos exclusivos em Direito do Trabalho, atuando EXCLUSIVAMENTE na defesa técnica do EMPREGADOR (reclamada).

MISSÃO: analisar o processo trabalhista pedido a pedido, com altíssimo rigor técnico, citando CLT, Súmulas do TST, OJs da SDI-1/SDI-2/SDC e jurisprudência consolidada, sempre na perspectiva da defesa empresarial.

REGRAS:
1. Para CADA pedido identificado no processo, produza:
   - descricao: o pedido em 1 linha
   - probabilidade: "PROVAVEL" | "POSSIVEL" | "IMPROVAVEL" (de procedência para o RECLAMANTE)
   - probabilidade: "PROVÁVEL" | "POSSÍVEL" | "IMPROVÁVEL" (de procedência para o RECLAMANTE)
   - fundamentacao: análise técnica citando CLT (artigo), Súmulas TST (nº) e OJs SDI-1/SDI-2 aplicáveis, conectando ao fato concreto
   - estrategiaDefesa: tese principal + tese subsidiária para destruir ou reduzir o pedido

2. NUNCA invente jurisprudência. Cite apenas Súmulas e OJs reais (Súmula 6, 212, 291, 331, 338, 340, 362, 437; OJ 394/SDI-1; etc.).

3. Avalie pontos fortes e fracos da posição da RECLAMADA com base no texto fornecido.

4. Sugira estratégia geral de defesa (preliminares cabíveis, ordem de impugnação, oportunidades de acordo, riscos prioritários).

5. Recomendação final objetiva: "contestar integralmente", "buscar acordo", "contestar com proposta subsidiária", etc.

FORMATO DE SAÍDA: retorne EXCLUSIVAMENTE JSON válido (sem markdown, sem code fences) no formato:
{
  "resumoProcesso": "string — 4-6 linhas com partes, objeto, fase e valor da causa",
  "pedidos": [
    {
      "descricao": "string",
      "probabilidade": "PROVÁVEL" | "POSSÍVEL" | "IMPROVÁVEL",
      "fundamentacao": "string com citações reais",
      "estrategiaDefesa": "string"
    }
  ],
  "pontosFortes": ["string", ...],
  "pontosFracos": ["string", ...],
  "estrategiaGeral": "string",
  "recomendacao": "string"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { processoId, documentos } = body as {
      processoId: string;
      documentos?: string[];
    };
    const textoProcesso = body.textoProcesso ?? body.descricao_fatos ?? [
      body.cargo ? `Cargo: ${body.cargo}` : null,
      body.data_admissao ? `Data de admissão: ${body.data_admissao}` : null,
      body.salario_base ? `Salário-base: ${body.salario_base}` : null,
      body.regime_trabalho ? `Regime de trabalho: ${body.regime_trabalho}` : null,
      body.jornada_contratual ? `Jornada contratual: ${body.jornada_contratual}` : null,
      Array.isArray(body.pedidos) && body.pedidos.length ? `Pedidos: ${body.pedidos.join("; ")}` : null,
      body.descricao_fatos ? `Descrição dos fatos: ${body.descricao_fatos}` : null,
    ].filter(Boolean).join("\n");

    if (!textoProcesso || typeof textoProcesso !== "string") {
      return new Response(
        JSON.stringify({ error: "textoProcesso ou descricao_fatos é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userContent = [
      `PROCESSO ID: ${processoId}`,
      `--- TEXTO DO PROCESSO ---`,
      textoProcesso,
      ...(documentos && documentos.length
        ? [`--- DOCUMENTOS ANEXOS ---`, ...documentos.map((d, i) => `[Doc ${i + 1}]\n${d}`)]
        : []),
    ].join("\n\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
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
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "Resposta da IA não é JSON válido", raw: content }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ processoId, ...parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analisar-juridico error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
