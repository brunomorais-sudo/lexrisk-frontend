import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FINAL_CONTEXT_CHARS = 120000;
const CHUNKS_PER_BATCH = 2;

const FINAL_OUTPUT_PROMPT = `Você é um dos maiores especialistas em Direito do Trabalho do Brasil, com profundo domínio de Súmulas do TST, OJs, CLT e Constituição Federal.

PERSPECTIVA OBRIGATÓRIA: Você atua como consultor jurídico do EMPREGADOR (reclamada/empresa).
- "pros" = argumentos FAVORÁVEIS ao empregador (teses de defesa, provas que beneficiam a empresa, precedentes favoráveis à reclamada)
- "cons" = argumentos DESFAVORÁVEIS ao empregador (riscos de condenação, provas contra a empresa, jurisprudência contrária)
- "risk_analysis" = risco de PERDA para o empregador (alto = grande chance de condenação)
- "financial_impact" = exposição financeira que o empregador pode ter que pagar
- Toda a análise, resumo executivo e recomendações devem ser direcionados ao empregador.

Analise INTEGRALMENTE o processo a partir das análises parciais de TODAS as páginas do PDF.

REGRAS:
1. JAMAIS invente informações. Use EXCLUSIVAMENTE o que consta nas análises por páginas.
2. Ao citar informações, preserve referências de páginas.
3. Fundamente juridicamente com base legal real apenas quando houver suporte no conteúdo.
4. Se não identificar um campo, use "Não identificado nos documentos".
5. Retorne EXCLUSIVAMENTE JSON válido, sem markdown, sem texto antes ou depois.

Formato obrigatório:
{
  "process_number": "string",
  "tribunal": "string",
  "foro": "string",
  "vara": "string",
  "phase": "conhecimento|recursal|execucao",
  "claimant_name": "string",
  "defendant_name": "string",
  "procedural_pole": "autor|reu",
  "subject_main": "string",
  "subject_tags": ["string"],
  "claim_value": 0,
  "distribution_date": "YYYY-MM-DD (data de distribuição/ajuizamento da ação, extraída do cabeçalho ou petição inicial)",
  "current_status": "string",
  "executive_summary": "Resumo detalhado com referências a páginas/documentos",
  "risk_analysis": {
    "risk_level": "alto|medio|baixo",
    "risk_score": 0,
    "justification": "Justificativa com Súmulas TST, CLT e provas",
    "confidence_level": "alta|media|baixa"
  },
  "pros": [{"title":"string","category":"juridico|probatorio|processual|estrategico","description":"string","legal_basis":"string","evidence_basis":"string","weight":8}],
  "cons": [{"title":"string","category":"string","description":"string","legal_basis":"string","evidence_basis":"string","weight":7}],
  "financial_impact": {"exposure_min":0,"exposure_base":0,"exposure_max":0,"summary":"string"},
  "next_steps": ["string"],
  "documents_identified": [{"title":"string","document_type":"peticao_inicial|contestacao|sentenca|recurso|ata_audiencia|prova_documental|laudo_pericial|acordo|outros","key_content":"string"}]
}`;

const PARTIAL_ANALYSIS_PROMPT = `Analise SOMENTE o trecho de páginas recebido e retorne JSON válido com extração estruturada dessas páginas.

PERSPECTIVA: Analise sob a ótica do EMPREGADOR (reclamada). Sinais de risco = riscos de condenação para a empresa.

REGRAS:
1. Não invente fatos.
2. Cite sempre as páginas quando possível.
3. Se algo não estiver claro, diga isso.
4. Foque em fatos, partes, pedidos, decisões, valores, documentos e sinais de risco.
5. Retorne EXCLUSIVAMENTE JSON válido, sem markdown, sem texto antes ou depois.

Formato obrigatório:
{
  "page_range": { "start": 1, "end": 1 },
  "summary": "string",
  "process_numbers": ["string"],
  "parties": [{"name":"string","role":"string","source_pages":[1]}],
  "documents": [{"title":"string","document_type":"string","source_pages":[1],"key_content":"string"}],
  "facts": [{"title":"string","description":"string","source_pages":[1]}],
  "requests": [{"title":"string","details":"string","source_pages":[1]}],
  "decisions": [{"title":"string","details":"string","source_pages":[1]}],
  "amounts": [{"label":"string","value_text":"string","source_pages":[1]}],
  "risk_signals": [{"title":"string","details":"string","source_pages":[1]}]
}`;

type TextChunk = {
  startPage: number;
  endPage: number;
  content: string;
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function extractJson(text: string) {
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("Raw AI response (no JSON found):", text.slice(0, 2000));
    throw new Error("No JSON found in AI response");
  }
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("JSON parse error:", (e as Error).message, "Raw:", match[0].slice(0, 1000));
    throw new Error("Invalid JSON in AI response");
  }
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function callChatCompletion(lovableApiKey: string, messages: Array<Record<string, unknown>>, maxTokens = 6000, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          temperature: 1,
          max_completion_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`AI API error (attempt ${attempt + 1}):`, errText.slice(0, 500));
        // Don't retry on payment/auth errors - they won't resolve
        if (response.status === 402) {
          throw new Error("Créditos de IA insuficientes. Adicione créditos em Settings → Workspace → Usage.");
        }
        if (response.status === 429) {
          throw new Error("Limite de requisições de IA excedido. Aguarde alguns minutos e tente novamente.");
        }
        if (attempt < retries) continue;
        throw new Error(errText || "Erro na análise de IA");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      if (content && content.includes("{")) {
        return content;
      }

      console.warn(`Attempt ${attempt + 1}: No JSON. Finish: ${data.choices?.[0]?.finish_reason}. Len: ${content.length}`);
    } catch (e) {
      console.error(`AI call error (attempt ${attempt + 1}):`, (e as Error).message);
      if (attempt >= retries) throw e;
    }
  }

  throw new Error("AI failed to return valid content after retries");
}

async function updateJob(adminClient: ReturnType<typeof createClient>, importJobId: string, values: Record<string, unknown>) {
  const { error } = await adminClient.from("import_jobs").update({ ...values, updated_at: new Date().toISOString() }).eq("id", importJobId);
  if (error) console.error("Job update error:", error.message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, importJobId, fileType, textChunks, filePath } = body;

    if (!importJobId) {
      return new Response(JSON.stringify({ error: "importJobId é obrigatório" }), {
        status: 400, headers: jsonHeaders,
      });
    }

    // ==================== ACTION: START ====================
    // Saves chunks to DB, returns immediately
    if (action === "start") {
      const chunks = (textChunks || []) as TextChunk[];
      await updateJob(adminClient, importJobId, {
        status: "processing",
        phase: "analyzing_chunks",
        total_chunks: chunks.length,
        chunks_processed: 0,
        partial_results: [],
        text_chunks: chunks,
        error_message: null,
      });

      return new Response(JSON.stringify({
        success: true,
        jobId: importJobId,
        total_chunks: chunks.length,
        phase: "analyzing_chunks",
      }), { headers: jsonHeaders });
    }

    // ==================== ACTION: PROCESS-BATCH ====================
    // Processes next N chunks
    if (action === "process-batch") {
      const { data: job, error: jobErr } = await adminClient
        .from("import_jobs")
        .select("*")
        .eq("id", importJobId)
        .single();

      if (jobErr || !job) {
        return new Response(JSON.stringify({ error: "Job não encontrado" }), {
          status: 404, headers: jsonHeaders,
        });
      }

      if (job.phase === "completed" || job.phase === "failed") {
        return new Response(JSON.stringify({
          success: true,
          phase: job.phase,
          chunks_processed: job.chunks_processed,
          total_chunks: job.total_chunks,
        }), { headers: jsonHeaders });
      }

      const allChunks = (job.text_chunks || []) as TextChunk[];
      const processed = job.chunks_processed || 0;
      const partialResults = (job.partial_results || []) as unknown[];

      if (processed >= allChunks.length) {
        // All chunks done, move to consolidation
        await updateJob(adminClient, importJobId, { phase: "consolidating" });
        return new Response(JSON.stringify({
          success: true,
          phase: "consolidating",
          chunks_processed: processed,
          total_chunks: allChunks.length,
        }), { headers: jsonHeaders });
      }

      const batchEnd = Math.min(processed + CHUNKS_PER_BATCH, allChunks.length);
      const batchChunks = allChunks.slice(processed, batchEnd);
      const newPartials: unknown[] = [];

      for (const chunk of batchChunks) {
        try {
          const partialResponse = await callChatCompletion(lovableApiKey, [
            {
              role: "system",
              content: "Você é um especialista em Direito do Trabalho brasileiro. Responda SOMENTE com JSON válido, sem markdown, sem texto adicional.",
            },
            {
              role: "user",
              content: `${PARTIAL_ANALYSIS_PROMPT}\n\nPÁGINAS: ${chunk.startPage}-${chunk.endPage}\n\nCONTEÚDO:\n${chunk.content}`,
            },
          ], 6000);

          newPartials.push(extractJson(partialResponse));
        } catch (err) {
          console.error(`Chunk ${chunk.startPage}-${chunk.endPage} failed:`, (err as Error).message);
          // Store error but continue
          newPartials.push({
            page_range: { start: chunk.startPage, end: chunk.endPage },
            summary: `Erro na análise: ${(err as Error).message}`,
            error: true,
          });
        }
      }

      const updatedPartials = [...partialResults, ...newPartials];
      const newProcessed = batchEnd;
      const allDone = newProcessed >= allChunks.length;

      await updateJob(adminClient, importJobId, {
        chunks_processed: newProcessed,
        partial_results: updatedPartials,
        phase: allDone ? "consolidating" : "analyzing_chunks",
      });

      return new Response(JSON.stringify({
        success: true,
        phase: allDone ? "consolidating" : "analyzing_chunks",
        chunks_processed: newProcessed,
        total_chunks: allChunks.length,
      }), { headers: jsonHeaders });
    }

    // ==================== ACTION: CONSOLIDATE ====================
    if (action === "consolidate") {
      const { data: job, error: jobErr } = await adminClient
        .from("import_jobs")
        .select("*")
        .eq("id", importJobId)
        .single();

      if (jobErr || !job) {
        return new Response(JSON.stringify({ error: "Job não encontrado" }), {
          status: 404, headers: jsonHeaders,
        });
      }

      if (job.phase === "completed") {
        return new Response(JSON.stringify({
          success: true,
          phase: "completed",
          process_data: (job.result_json as any)?.process_data,
        }), { headers: jsonHeaders });
      }

      const allChunks = (job.text_chunks || []) as TextChunk[];
      const partialResults = (job.partial_results || []) as unknown[];
      const totalPages = allChunks.length > 0 ? allChunks[allChunks.length - 1].endPage : 0;

      await updateJob(adminClient, importJobId, { phase: "consolidating" });

      const finalContext = truncate(JSON.stringify({
        total_pages: totalPages,
        partial_analyses: partialResults,
      }), MAX_FINAL_CONTEXT_CHARS);

      const finalResponse = await callChatCompletion(lovableApiKey, [
        {
          role: "system",
          content: "Você é um especialista em Direito do Trabalho brasileiro. Responda SOMENTE com JSON válido, sem markdown, sem texto adicional.",
        },
        {
          role: "user",
          content: `${FINAL_OUTPUT_PROMPT}\n\nANÁLISES PARCIAIS DE TODAS AS PÁGINAS:\n${finalContext}`,
        },
      ], 8000);

      const processData = extractJson(finalResponse);

      await updateJob(adminClient, importJobId, {
        status: "completed",
        phase: "completed",
        result_json: {
          process_data: processData,
          files_count: 1,
          total_pages: totalPages,
          analysis_chunks: allChunks.length,
        },
        text_chunks: null, // Clean up stored text to save space
      });

      return new Response(JSON.stringify({
        success: true,
        phase: "completed",
        process_data: processData,
        files_count: 1,
        files: [{ name: job.file_name || "documento.pdf", type: "pdf" }],
      }), { headers: jsonHeaders });
    }

    // ==================== LEGACY: ZIP processing (single call, small files) ====================
    if (fileType === "zip" && filePath) {
      await updateJob(adminClient, importJobId, { status: "processing", phase: "analyzing_chunks" });

      const { data: fileData, error: downloadError } = await adminClient.storage.from("process-imports").download(filePath);
      if (downloadError || !fileData) {
        await updateJob(adminClient, importJobId, { status: "failed", phase: "failed", error_message: `Erro ao baixar ZIP: ${downloadError?.message}` });
        return new Response(JSON.stringify({ error: "Erro ao baixar arquivo" }), { status: 500, headers: jsonHeaders });
      }

      const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(await fileData.arrayBuffer());

      const textParts: string[] = [];
      let totalLen = 0;
      const MAX_TOTAL = 20000;

      for (const [fileName, zipEntry] of Object.entries(zipContent.files)) {
        if ((zipEntry as { dir?: boolean }).dir) continue;
        const lower = fileName.toLowerCase();
        if (lower.startsWith("__macosx") || lower.startsWith(".")) continue;
        if (totalLen >= MAX_TOTAL) break;

        let text = "";
        if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv") || lower.endsWith(".json")) {
          text = await (zipEntry as { async: (type: string) => Promise<string> }).async("string");
        } else if (lower.endsWith(".pdf")) {
          text = "[PDF dentro do ZIP — análise individual recomendada]";
        } else {
          continue;
        }

        const remaining = MAX_TOTAL - totalLen;
        const chunk = text.slice(0, remaining);
        totalLen += chunk.length;
        textParts.push(`--- ARQUIVO: ${fileName} ---\n${chunk}`);
      }

      const zipResponse = await callChatCompletion(lovableApiKey, [
        {
          role: "system",
          content: "Você é um especialista em Direito do Trabalho brasileiro. Responda SOMENTE com JSON válido, sem markdown, sem texto adicional.",
        },
        {
          role: "user",
          content: `${FINAL_OUTPUT_PROMPT}\n\nDOCUMENTOS:\n${textParts.join("\n\n")}`,
        },
      ]);

      const processData = extractJson(zipResponse);

      await updateJob(adminClient, importJobId, {
        status: "completed",
        phase: "completed",
        result_json: { process_data: processData, files_count: 1 },
      });

      return new Response(JSON.stringify({
        success: true,
        process_data: processData,
        files_count: 1,
        files: [{ name: filePath.split("/").pop() || "documento", type: fileType }],
      }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Ação não reconhecida. Use: start, process-batch, consolidate" }), {
      status: 400, headers: jsonHeaders,
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
