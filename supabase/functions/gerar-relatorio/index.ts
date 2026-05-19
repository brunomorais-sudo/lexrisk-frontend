import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callClaude(system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!resp.ok) throw new Error(`Anthropic error: ${resp.status}`);
  const data = await resp.json();
  return data.content[0].text;
}

function fmt(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { company_id } = await req.json();
    if (!company_id) return new Response(JSON.stringify({ error: "company_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: company, error: ce } = await supabase.from("client_companies").select("id,trade_name,business_name,cnpj,industry").eq("id", company_id).single();
    if (ce || !company) throw new Error("Empresa não encontrada");

    const { data: procs } = await supabase.from("processes").select("id,process_number,claimant_name,defendant_name,subject_main,subject_tags,phase,tribunal,vara,claim_value,distribution_date,current_status").eq("client_company_id", company_id);
    const procList = procs || [];
    if (!procList.length) throw new Error("Nenhum processo encontrado");

    const procIds = procList.map((p: any) => p.id);
    const { data: analyses } = await supabase.from("process_analyses").select("process_id,risk_level,risk_score_numeric,executive_summary,financial_impact_summary,estimated_financial_exposure_base,estimated_financial_exposure_min,estimated_financial_exposure_max").in("process_id", procIds).order("created_at", { ascending: false });

    const analysisMap: Record<string, any> = {};
    for (const a of (analyses || [])) { if (!analysisMap[a.process_id]) analysisMap[a.process_id] = a; }

    const analyzed = procList.filter((p: any) => analysisMap[p.id]);
    const byRisk = {
      alto: procList.filter((p: any) => analysisMap[p.id]?.risk_level === "alto"),
      medio: procList.filter((p: any) => analysisMap[p.id]?.risk_level === "medio"),
      baixo: procList.filter((p: any) => analysisMap[p.id]?.risk_level === "baixo"),
      sem_analise: procList.filter((p: any) => !analysisMap[p.id]),
    };

    const totalExposure = procList.reduce((s: number, p: any) => s + (p.claim_value || 0), 0);
    const exposureBase = analyzed.reduce((s: number, p: any) => s + (analysisMap[p.id]?.estimated_financial_exposure_base || p.claim_value * 0.6 || 0), 0);
    const exposureMin = analyzed.reduce((s: number, p: any) => s + (analysisMap[p.id]?.estimated_financial_exposure_min || p.claim_value * 0.3 || 0), 0);
    const exposureMax = analyzed.reduce((s: number, p: any) => s + (analysisMap[p.id]?.estimated_financial_exposure_max || p.claim_value * 1.2 || 0), 0);

    const byPhase: Record<string, number> = {};
    const byTribunal: Record<string, number> = {};
    const subjectCount: Record<string, number> = {};
    for (const p of procList) {
      byPhase[p.phase] = (byPhase[p.phase] || 0) + 1;
      if (p.tribunal) byTribunal[p.tribunal] = (byTribunal[p.tribunal] || 0) + 1;
      const tags = [...(p.subject_tags || []), p.subject_main].filter(Boolean);
      for (const t of tags) subjectCount[t] = (subjectCount[t] || 0) + 1;
    }

    const topSubjects = Object.entries(subjectCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([subject, count]) => ({ subject, count }));
    const avgRiskScore = analyzed.length > 0 ? analyzed.reduce((s: number, p: any) => s + (analysisMap[p.id]?.risk_score_numeric || 50), 0) / analyzed.length : 0;
    const execucaoProcesses = procList.filter((p: any) => p.phase === "execucao");

    const topRiskProcesses = byRisk.alto
      .map((p: any) => ({ ...p, analysis: analysisMap[p.id] }))
      .sort((a: any, b: any) => (b.claim_value || 0) - (a.claim_value || 0))
      .slice(0, 10);

    const statsText = `
EMPRESA: ${company.trade_name} (${company.cnpj}) — Setor: ${company.industry || "N/A"}
Total processos: ${procList.length} | Analisados: ${analyzed.length} | Alto risco: ${byRisk.alto.length} | Médio: ${byRisk.medio.length} | Baixo: ${byRisk.baixo.length} | Sem análise: ${byRisk.sem_analise.length}
Score médio: ${avgRiskScore.toFixed(1)}/100
Exposição total (causas): ${fmt(totalExposure)} | Base IA: ${fmt(exposureBase)} | Mín: ${fmt(exposureMin)} | Máx: ${fmt(exposureMax)}
Fases: ${Object.entries(byPhase).map(([f, c]) => `${f}: ${c}`).join(" | ")}
Tribunais top 5: ${Object.entries(byTribunal).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t,c])=>`${t}:${c}`).join(" | ")}
Em execução (penhora iminente): ${execucaoProcesses.length}
${execucaoProcesses.slice(0,5).map((p:any)=>`  - ${p.process_number} | ${p.claimant_name} | ${fmt(p.claim_value||0)}`).join("\n")}
Temas recorrentes: ${topSubjects.map(({subject,count})=>`${subject} (${count}x)`).join(", ")}
Top 10 maior valor: ${topRiskProcesses.map((p:any)=>`${p.process_number}|${p.claimant_name}|${fmt(p.claim_value||0)}|${p.analysis?.risk_level||"N/A"}|${p.tribunal||""}`).join("  /  ")}
`;

    const aiAnalysis = await callClaude(
      `Você é o Dr. Hélio Marques, ex-Ministro do TST com 35 anos de experiência trabalhista.
Produza um RELATÓRIO EXECUTIVO DE PASSIVO TRABALHISTA de altíssima qualidade para a Diretoria da empresa.
Use markdown com ### para seções. Seja direto, executivo, rico em insights estratégicos.
Seções obrigatórias:
### Sumário Executivo
### Análise Financeira do Passivo
### Mapa de Risco do Portfólio
### Temas e Teses Recorrentes
### Alertas Críticos
### Estratégia de Resolução Recomendada
### Próximos 90 Dias — Plano de Ação`,
      `Dados para o relatório:\n${statsText}`
    );

    return new Response(JSON.stringify({
      company: { trade_name: company.trade_name, business_name: company.business_name, cnpj: company.cnpj, industry: company.industry },
      generated_at: new Date().toISOString(),
      stats: {
        totalProcesses: procList.length, analyzed: analyzed.length,
        byRisk: { alto: byRisk.alto.length, medio: byRisk.medio.length, baixo: byRisk.baixo.length, sem_analise: byRisk.sem_analise.length },
        avgRiskScore: parseFloat(avgRiskScore.toFixed(1)),
        financeiro: { totalExposure, exposureBase, exposureMin, exposureMax },
        byPhase, byTribunal: Object.fromEntries(Object.entries(byTribunal).sort((a,b)=>b[1]-a[1]).slice(0,10)),
        topSubjects, execucaoCount: execucaoProcesses.length,
      },
      topRiskProcesses: topRiskProcesses.map((p: any) => ({
        process_number: p.process_number, claimant_name: p.claimant_name,
        claim_value: p.claim_value, risk_level: p.analysis?.risk_level,
        risk_score: p.analysis?.risk_score_numeric, tribunal: p.tribunal, phase: p.phase,
      })),
      aiAnalysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
