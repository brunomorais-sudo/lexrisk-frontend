import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const resp = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Anthropic API error: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  return data.content[0].text;
}

// Step 1: Claude maps spreadsheet columns to known fields
async function mapColumns(headers: string[], sampleRows: Record<string, string>[]): Promise<Record<string, string>> {
  const system = `Você é um especialista em dados jurídicos brasileiros.
Sua tarefa: mapear colunas de uma planilha de processos trabalhistas para campos padronizados.

Campos padronizados disponíveis:
- process_number: número do processo (formato CNJ: NNNNNNN-NN.NNNN.N.NN.NNNN)
- claimant_name: nome do reclamante (trabalhador)
- defendant_name: nome do reclamado (empresa)
- claim_value: valor da causa em reais (número)
- distribution_date: data de distribuição/ajuizamento (ISO 8601)
- tribunal: tribunal (ex: TRT-2, TRT-4)
- vara: vara do trabalho
- phase: fase processual (conhecimento, recursal, execução)
- subject_main: assunto principal do processo
- current_status: situação atual
- IGNORAR: coluna não mapeável

Retorne APENAS um JSON válido, sem markdown, no formato:
{"coluna_original": "campo_padronizado", ...}`;

  const sampleText = sampleRows.slice(0, 3).map(r =>
    Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(" | ")
  ).join("\n");

  const user = `Colunas da planilha: ${headers.join(", ")}

Exemplos de dados:
${sampleText}

Mapeie cada coluna para o campo padronizado mais adequado. Use IGNORAR para colunas irrelevantes.`;

  const response = await callClaude(system, user);

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const match = response.match(/\{[\s\S]+\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse column mapping from Claude");
  }
}

// Step 2: Analyze risk for a single process row
async function analyzeRisk(row: Record<string, string>): Promise<{
  risk_level: string;
  risk_score: number;
  executive_summary: string;
  financial_exposure_base: number;
  financial_exposure_min: number;
  financial_exposure_max: number;
}> {
  const system = `Você é um especialista em risco trabalhista brasileiro com 30 anos de experiência.
Analise o processo trabalhista e retorne APENAS um JSON válido, sem markdown, com:
{
  "risk_level": "alto" | "medio" | "baixo",
  "risk_score": número de 0 a 100,
  "executive_summary": "resumo executivo em 2-3 frases",
  "financial_exposure_base": valor base estimado em reais (número),
  "financial_exposure_min": valor mínimo estimado em reais (número),
  "financial_exposure_max": valor máximo estimado em reais (número)
}

Regras:
- Se valor da causa informado, use-o como referência principal
- Exposição base = 50-70% do valor da causa para processos típicos
- Exposição mín = 30% do valor base, máx = 150% do valor base
- Risk score: alto=70-100, medio=40-69, baixo=0-39
- Considere fase processual (execução=risco maior, conhecimento=variável)`;

  const processInfo = Object.entries(row)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const response = await callClaude(system, `Processo trabalhista:\n${processInfo}`);

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const match = response.match(/\{[\s\S]+\}/);
    if (match) return JSON.parse(match[0]);
    const claimValue = parseFloat(row.claim_value?.replace(/[^\d.,]/g, "").replace(",", ".")) || 50000;
    return {
      risk_level: "medio",
      risk_score: 50,
      executive_summary: `Processo ${row.process_number || "sem número"} — análise pendente de dados adicionais.`,
      financial_exposure_base: claimValue * 0.6,
      financial_exposure_min: claimValue * 0.3,
      financial_exposure_max: claimValue * 1.2,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, headers, rows, jobId, rowIndex, columnMapping, userId } = body;

    // ACTION: map-columns — Claude identifies column semantics
    if (action === "map-columns") {
      if (!headers || !rows) {
        return new Response(JSON.stringify({ error: "headers e rows são obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mapping = await mapColumns(headers, rows.slice(0, 5));
      return new Response(JSON.stringify({ mapping }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: process-row — analyze a single row and save to DB
    if (action === "process-row") {
      if (!columnMapping || !rows || rowIndex === undefined) {
        return new Response(JSON.stringify({ error: "columnMapping, rows e rowIndex são obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawRow = rows[rowIndex];

      // Apply column mapping to normalize the row
      const normalizedRow: Record<string, string> = {};
      for (const [originalCol, standardField] of Object.entries(columnMapping as Record<string, string>)) {
        if (standardField !== "IGNORAR" && rawRow[originalCol]) {
          normalizedRow[standardField] = String(rawRow[originalCol]);
        }
      }

      // Parse numeric values
      const claimValueRaw = normalizedRow.claim_value || "0";
      const claimValue = parseFloat(
        claimValueRaw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".") || "0"
      ) || 0;

      // Get AI risk analysis
      const analysis = await analyzeRisk(normalizedRow);

      // Check for duplicate process number
      const processNumber = normalizedRow.process_number || `LOTE-${Date.now()}-${rowIndex}`;
      if (normalizedRow.process_number) {
        const { data: existing } = await supabase
          .from("processes")
          .select("id")
          .eq("process_number", processNumber)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({
            status: "duplicate",
            process_number: processNumber,
            process_id: existing.id,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Save process
      const { data: proc, error: procError } = await supabase
        .from("processes")
        .insert({
          process_number: processNumber,
          area: "trabalhista",
          tribunal: normalizedRow.tribunal || "",
          vara: normalizedRow.vara || "",
          phase: normalizedRow.phase || "conhecimento",
          claimant_name: normalizedRow.claimant_name || "Não identificado",
          defendant_name: normalizedRow.defendant_name || "Não identificado",
          procedural_pole: "reu",
          subject_main: normalizedRow.subject_main || "Importado via planilha",
          subject_tags: [],
          claim_value: claimValue,
          estimated_financial_exposure_min: analysis.financial_exposure_min,
          estimated_financial_exposure_base: analysis.financial_exposure_base,
          estimated_financial_exposure_max: analysis.financial_exposure_max,
          distribution_date: normalizedRow.distribution_date || null,
          current_status: normalizedRow.current_status || "Importado via planilha em lote",
          created_by: userId || null,
        })
        .select("id")
        .single();

      if (procError) throw new Error(`Erro ao salvar processo: ${procError.message}`);

      // Save analysis
      const { error: analysisError } = await supabase
        .from("process_analyses")
        .insert({
          process_id: proc.id,
          executive_summary: analysis.executive_summary,
          case_classification: normalizedRow.subject_main || "Trabalhista",
          case_value_identified: claimValue,
          financial_impact_summary: `Exposição estimada: R$ ${analysis.financial_exposure_base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          risk_level: analysis.risk_level,
          risk_score_numeric: analysis.risk_score,
          confidence_level: "media",
          justification_text: analysis.executive_summary,
          next_steps: ["Revisar documentação do processo", "Consultar advogado responsável"],
          missing_information: ["Peças processuais completas", "Histórico de audiências"],
        });

      if (analysisError) console.error("Analysis save error:", analysisError);

      // Update batch_import_jobs progress if jobId provided
      if (jobId) {
        await supabase.rpc("increment_batch_progress", { job_id: jobId });
      }

      // ── Disparar busca PJe em background (fire-and-forget) ──────────────
      // Busca automaticamente 1º e 2º grau no DataJud/PJe
      fetch(`${supabaseUrl}/functions/v1/buscar-pje`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          process_id: proc.id,
          process_number: processNumber,
        }),
      }).catch((err) => console.error("buscar-pje fire-and-forget error:", err));

      return new Response(JSON.stringify({
        status: "success",
        process_id: proc.id,
        process_number: processNumber,
        risk_level: analysis.risk_level,
        risk_score: analysis.risk_score,
        pje_sync: "iniciado",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use: map-columns, process-row" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("importacao-lote error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
