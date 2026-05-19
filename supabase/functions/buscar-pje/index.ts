import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

// ── Inferir tribunal a partir do número CNJ ─────────────────────────────────
// Formato: NNNNNNN-DD.AAAA.J.TT.OOOO  (J=5 → Trabalhista)
function inferTribunal(processNumber: string): string | null {
  const clean = processNumber.replace(/\D/g, "");
  if (clean.length < 20) return null;
  const j = clean[13];
  const tt = clean.substring(14, 16);
  if (j === "5") {
    const num = parseInt(tt, 10);
    if (num === 0) return "tst";
    if (num >= 1 && num <= 24) return `trt${num}`;
  }
  return null;
}

// ── Buscar no DataJud (suporta grau G1 e G2) ────────────────────────────────
async function searchDatajud(tribunal: string, processNumber: string, grau?: string) {
  const url = `${DATAJUD_BASE}/api_publica_${tribunal}/_search`;

  const query: any = {
    bool: {
      must: [{ term: { "numeroProcesso.keyword": processNumber } }],
    },
  };

  if (grau) {
    query.bool.filter = [{ term: { grau } }];
  }

  const body = { query, size: 10, sort: [{ "dataHoraUltimaAtualizacao": { order: "desc" } }] };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `APIKey ${DATAJUD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`DataJud ${tribunal}/${grau || "any"} error: ${resp.status}`);
  }

  const data = await resp.json();
  const hits = data.hits?.hits || [];
  return hits.map((h: any) => h._source);
}

// ── Extrair fase processual a partir dos movimentos ─────────────────────────
function extractPhase(movimentos: any[]): string {
  if (!movimentos?.length) return "conhecimento";
  const sorted = [...movimentos].sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );
  const code = sorted[0]?.codigo;
  const execucaoCodes = [848, 849, 871, 234, 235, 22];
  const recursalCodes = [193, 197, 198, 201, 203, 507, 534, 11009, 11010];
  if (execucaoCodes.includes(code)) return "execucao";
  if (recursalCodes.includes(code)) return "recursal";
  return "conhecimento";
}

// ── Formatar movimentações para exibição ────────────────────────────────────
function formatMovimentos(movimentos: any[], limit = 30): any[] {
  return [...movimentos]
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
    .slice(0, limit)
    .map((m) => ({
      data: new Date(m.dataHora).toLocaleDateString("pt-BR"),
      dataISO: m.dataHora,
      codigo: m.codigo,
      nome: m.nome,
      complemento: m.complementosTabelados?.[0]?.nome || m.complemento || null,
    }));
}

// ── Extrair partes e advogados ───────────────────────────────────────────────
function extractPartes(partes: any[]) {
  const reclamantes = partes
    .filter((p) => p.polo === "ATIVO")
    .map((p) => ({
      nome: p.nome,
      tipo: p.tipo,
      advogados: (p.advogados || []).map((a: any) => ({
        nome: a.nome,
        oab: a.numeroOAB ? `${a.estadoOAB || ""}${a.numeroOAB}` : null,
      })),
    }));

  const reclamados = partes
    .filter((p) => p.polo === "PASSIVO")
    .map((p) => ({
      nome: p.nome,
      tipo: p.tipo,
      advogados: (p.advogados || []).map((a: any) => ({
        nome: a.nome,
        oab: a.numeroOAB ? `${a.estadoOAB || ""}${a.numeroOAB}` : null,
      })),
    }));

  return { reclamantes, reclamados };
}

// ── Montar resumo textual das movimentações ─────────────────────────────────
function buildMovimentosSummary(movimentos: any[], grauLabel: string): string {
  if (!movimentos.length) return `${grauLabel}: Sem movimentações registradas.`;
  return movimentos
    .slice(0, 10)
    .map((m) => `${m.data}: ${m.nome}${m.complemento ? ` (${m.complemento})` : ""}`)
    .join("\n");
}

// ── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { process_id, process_number, tribunal: tribunalHint } = body;

    if (!process_number) {
      return new Response(JSON.stringify({ error: "process_number é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tribunal = tribunalHint?.toLowerCase() || inferTribunal(process_number);

    if (!tribunal) {
      return new Response(JSON.stringify({
        error: "Não foi possível inferir o tribunal pelo número do processo",
        process_number,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Buscar em ambos os graus ───────────────────────────────────────────
    const results: Record<string, any> = {};
    const errors: string[] = [];

    for (const grau of ["G1", "G2"]) {
      try {
        const hits = await searchDatajud(tribunal, process_number, grau);
        if (hits.length > 0) {
          results[grau] = hits[0]; // mais recente primeiro
        }
      } catch (err: any) {
        errors.push(`${grau}: ${err.message}`);
      }
    }

    // Fallback: buscar sem filtro de grau se nenhum retornou
    if (Object.keys(results).length === 0) {
      try {
        const hits = await searchDatajud(tribunal, process_number);
        if (hits.length > 0) {
          const grau = hits[0].grau || "G1";
          results[grau] = hits[0];
        }
      } catch (err: any) {
        errors.push(`fallback: ${err.message}`);
      }
    }

    if (Object.keys(results).length === 0) {
      return new Response(JSON.stringify({
        status: "not_found",
        process_number,
        tribunal,
        errors,
        message: "Processo não encontrado no DataJud em nenhum grau",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Processar dados de cada grau ──────────────────────────────────────
    const grausEncontrados: string[] = [];
    let phaseGlobal = "conhecimento";
    let valorCausa = null;
    let orgaoJulgadorG1 = "";
    let orgaoJulgadorG2 = "";
    let assuntos = "";
    let classeProcessual = "";
    let advogadosReclamante = "";

    const documentosParaSalvar: any[] = [];

    for (const [grau, data] of Object.entries(results)) {
      const movimentos = data.movimentos || [];
      const partes = data.partes || [];
      const movimentosFormatados = formatMovimentos(movimentos);
      const { reclamantes, reclamados } = extractPartes(partes);
      const grauLabel = grau === "G1" ? "1º Grau (Vara do Trabalho)" : "2º Grau (TRT)";
      const phase = extractPhase(movimentos);

      if (grau === "G1") {
        phaseGlobal = phase;
        orgaoJulgadorG1 = data.orgaoJulgador?.nome || "";
        valorCausa = data.valorCausa || null;
        assuntos = (data.assuntos || []).map((a: any) => a.nome).join(", ");
        classeProcessual = data.classe?.nome || "";
        advogadosReclamante = reclamantes
          .flatMap((r) => r.advogados)
          .map((a: any) => a.nome + (a.oab ? ` (OAB ${a.oab})` : ""))
          .join(", ");
      }

      if (grau === "G2") {
        orgaoJulgadorG2 = data.orgaoJulgador?.nome || "";
        if (phase === "recursal" || phase === "execucao") phaseGlobal = phase;
      }

      grausEncontrados.push(grau);

      documentosParaSalvar.push({
        process_id: process_id || null,
        document_type: `pje_${grau.toLowerCase()}`,
        title: `PJe ${grauLabel} — ${process_number}`,
        content: JSON.stringify({
          source: "datajud",
          tribunal,
          grau,
          grauLabel,
          classeProcessual: data.classe?.nome || "",
          assuntos: (data.assuntos || []).map((a: any) => a.nome).join(", "),
          orgaoJulgador: data.orgaoJulgador?.nome || "",
          nivelSigilo: data.nivelSigilo || 0,
          valorCausa: data.valorCausa || null,
          lastUpdate: data.dataHoraUltimaAtualizacao || null,
          phase,
          reclamantes,
          reclamados,
          movimentosSummary: buildMovimentosSummary(movimentosFormatados, grauLabel),
          movimentos: movimentosFormatados,
          totalMovimentos: movimentos.length,
        }),
        fetched_at: new Date().toISOString(),
      });
    }

    // ── Salvar documentos no Supabase ──────────────────────────────────────
    if (process_id) {
      for (const doc of documentosParaSalvar) {
        const { error } = await supabase
          .from("process_documents")
          .upsert(doc, { onConflict: "process_id,document_type" });
        if (error) console.error(`Erro ao salvar ${doc.document_type}:`, error);
      }

      const updates: Record<string, any> = {
        datajud_last_sync: new Date().toISOString(),
        pje_graus_encontrados: grausEncontrados,
      };

      if (valorCausa && valorCausa > 0) updates.claim_value = valorCausa;
      if (phaseGlobal) updates.phase = phaseGlobal;
      if (orgaoJulgadorG1) updates.vara = orgaoJulgadorG1;
      if (orgaoJulgadorG2) updates.tribunal_orgao_g2 = orgaoJulgadorG2;
      if (assuntos) updates.subject_tags = assuntos.split(", ").filter(Boolean);
      if (classeProcessual) updates.subject_main = classeProcessual;

      const { error: procError } = await supabase
        .from("processes")
        .update(updates)
        .eq("id", process_id);

      if (procError) console.error("Erro ao atualizar processo:", procError);
    }

    return new Response(JSON.stringify({
      status: "success",
      process_number,
      tribunal,
      grausEncontrados,
      phaseGlobal,
      classeProcessual,
      assuntos,
      orgaoJulgadorG1,
      orgaoJulgadorG2,
      valorCausa,
      advogadosReclamante,
      totalGraus: grausEncontrados.length,
      movimentosPorGrau: Object.fromEntries(
        Object.entries(results).map(([g, d]) => [g, (d.movimentos || []).length])
      ),
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("buscar-pje error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
