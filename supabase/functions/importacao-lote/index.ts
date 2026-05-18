import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2048, system: systemPrompt, messages: [{ role: "user", content: userMessage }] }),
  });
  if (!resp.ok) throw new Error(\`Anthropic error: \${resp.status} \${await resp.text()}\`);
  const data = await resp.json();
  return data.content[0].text;
}

function parseJson(text: string): any {
  try { return JSON.parse(text.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`\\n?/g, "").trim()); }
  catch { const m = text.match(/\\{[\\s\\S]+\\}/); if (m) return JSON.parse(m[0]); throw new Error("JSON parse failed"); }
}

async function mapColumns(headers: string[], sampleRows: Record<string, string>[]): Promise<Record<string, string>> {
  const system = \`Você é especialista em dados jurídicos brasileiros. Mapeie colunas de planilha de processos trabalhistas para campos padronizados.

Campos disponíveis: process_number, claimant_name, defendant_name, claim_value, distribution_date, tribunal, vara, phase, subject_main, current_status, IGNORAR

Retorne APENAS JSON válido: {"coluna_original": "campo_padronizado"}\`;
  const user = \`Colunas: \${headers.join(", ")}\\n\\nExemplos:\\n\${sampleRows.slice(0,3).map(r => Object.entries(r).map(([k,v]) => \`\${k}: \${v}\`).join(" | ")).join("\\n")}\`;
  return parseJson(await callClaude(system, user));
}

async function analyzeRisk(row: Record<string, string>): Promise<{ risk_level: string; risk_score: number; executive_summary: string; financial_exposure_base: number; financial_exposure_min: number; financial_exposure_max: number }> {
  const system = \`Analise o processo trabalhista e retorne APENAS JSON:
{ "risk_level": "alto"|"medio"|"baixo", "risk_score": 0-100, "executive_summary": "2-3 frases", "financial_exposure_base": número, "financial_exposure_min": número, "financial_exposure_max": número }

Exposição base = 50-70% do valor da causa. Min = 30% da base, Max = 150% da base.\`;
  const info = Object.entries(row).filter(([,v]) => v?.toString().trim()).map(([k,v]) => \`\${k}: \${v}\`).join("\\n");
  try {
    return parseJson(await callClaude(system, \`Processo:\\n\${info}\`));
  } catch {
    const cv = parseFloat(row.claim_value?.replace(/[R$\\s.]/g,"").replace(",",".") || "0") || 50000;
    return { risk_level: "medio", risk_score: 50, executive_summary: \`Processo \${row.process_number||"sem número"} importado via planilha.\`, financial_exposure_base: cv*0.6, financial_exposure_min: cv*0.3, financial_exposure_max: cv*1.2 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, headers, rows, rowIndex, columnMapping, userId } = body;

    if (action === "map-columns") {
      if (!headers || !rows) return new Response(JSON.stringify({ error: "headers e rows obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const mapping = await mapColumns(headers, rows.slice(0, 5));
      return new Response(JSON.stringify({ mapping }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "process-row") {
      if (!columnMapping || !rows || rowIndex === undefined) return new Response(JSON.stringify({ error: "params obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const rawRow = rows[rowIndex];
      const normalized: Record<string, string> = {};
      for (const [orig, field] of Object.entries(columnMapping as Record<string, string>)) {
        if (field !== "IGNORAR" && rawRow[orig]) normalized[field] = String(rawRow[orig]);
      }
      const claimValue = parseFloat((normalized.claim_value||"0").replace(/[R$\\s]/g,"").replace(/\\./g,"").replace(",",".")) || 0;
      const analysis = await analyzeRisk(normalized);
      const processNumber = normalized.process_number || \`LOTE-\${Date.now()}-\${rowIndex}\`;

      if (normalized.process_number) {
        const { data: existing } = await supabase.from("processes").select("id").eq("process_number", processNumber).maybeSingle();
        if (existing) return new Response(JSON.stringify({ status: "duplicate", process_number: processNumber, process_id: existing.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: proc, error: procErr } = await supabase.from("processes").insert({
        process_number: processNumber, area: "trabalhista",
        tribunal: normalized.tribunal||"", vara: normalized.vara||"",
        phase: normalized.phase||"conhecimento",
        claimant_name: normalized.claimant_name||"Não identificado",
        defendant_name: normalized.defendant_name||"Não identificado",
        procedural_pole: "reu",
        subject_main: normalized.subject_main||"Importado via planilha",
        subject_tags: [], claim_value: claimValue,
        estimated_financial_exposure_min: analysis.financial_exposure_min,
        estimated_financial_exposure_base: analysis.financial_exposure_base,
        estimated_financial_exposure_max: analysis.financial_exposure_max,
        distribution_date: normalized.distribution_date||null,
        current_status: normalized.current_status||"Importado via planilha em lote",
        created_by: userId||null,
      }).select("id").single();

      if (procErr) throw new Error(\`Erro ao salvar: \${procErr.message}\`);

      await supabase.from("process_analyses").insert({
        process_id: proc.id,
        executive_summary: analysis.executive_summary,
        case_classification: normalized.subject_main||"Trabalhista",
        case_value_identified: claimValue,
        financial_impact_summary: \`Exposição estimada: R$ \${analysis.financial_exposure_base.toLocaleString("pt-BR",{minimumFractionDigits:2})}\`,
        risk_level: analysis.risk_level, risk_score_numeric: analysis.risk_score,
        confidence_level: "media", justification_text: analysis.executive_summary,
        next_steps: ["Revisar documentação do processo","Consultar advogado responsável"],
        missing_information: ["Peças processuais completas"],
      });

      return new Response(JSON.stringify({ status: "success", process_id: proc.id, process_number: processNumber, risk_level: analysis.risk_level, risk_score: analysis.risk_score }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("importacao-lote:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});