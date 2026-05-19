import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

function inferTribunal(processNumber: string): string | null {
  const clean = processNumber.replace(/\D/g, "");
  if (clean.length < 20) return null;
  const j = clean[13];
  const tt = clean.substring(14, 16);
  if (j === "5") {
    const num = parseInt(tt, 10);
    if (num >= 1 && num <= 24) return `trt${num}`;
    if (num === 0) return "tst";
  } else if (j === "4") {
    const trf: Record<string, string> = { "01": "trf1", "02": "trf2", "03": "trf3", "04": "trf4", "05": "trf5", "06": "trf6" };
    return trf[tt] || null;
  } else if (j === "8") {
    const tjMap: Record<string, string> = {
      "01": "tjac", "02": "tjal", "03": "tjam", "04": "tjap", "05": "tjba", "06": "tjce",
      "07": "tjdf", "08": "tjes", "09": "tjgo", "10": "tjma", "11": "tjmt", "12": "tjms",
      "13": "tjmg", "14": "tjpa", "15": "tjpb", "16": "tjpr", "17": "tjpe", "18": "tjpi",
      "19": "tjrj", "20": "tjrn", "21": "tjrs", "22": "tjro", "23": "tjrr", "24": "tjsc",
      "25": "tjse", "26": "tjsp", "27": "tjto",
    };
    return tjMap[tt] || null;
  }
  return null;
}

async function searchDatajud(tribunal: string, processNumber: string) {
  const url = `${DATAJUD_BASE}/api_publica_${tribunal}/_search`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `APIKey ${DATAJUD_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { term: { "numeroProcesso.keyword": processNumber } } }),
  });
  if (!resp.ok) throw new Error(`DataJud ${tribunal}: ${resp.status}`);
  const data = await resp.json();
  return data.hits?.hits?.[0]?._source || null;
}

function extractPhase(movimentos: any[]): string {
  if (!movimentos?.length) return "conhecimento";
  const sorted = [...movimentos].sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  const lastMovCode = sorted[0]?.codigo;
  const execucaoCodes = [22, 871, 848, 849, 234, 235];
  const recursalCodes = [193, 197, 198, 201, 203, 507, 534];
  if (execucaoCodes.includes(lastMovCode)) return "execucao";
  if (recursalCodes.includes(lastMovCode)) return "recursal";
  return "conhecimento";
}

function summarizeMovimentos(movimentos: any[]): string {
  if (!movimentos?.length) return "Sem movimentações registradas.";
  const sorted = [...movimentos].sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  return sorted.slice(0, 5).map((m) => {
    const date = new Date(m.dataHora).toLocaleDateString("pt-BR");
    const complemento = m.complementosTabelados?.[0]?.nome;
    return `${date}: ${m.nome}${complemento ? ` (${complemento})` : ""}`;
  }).join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { process_id, process_number, tribunal: tribunalHint } = body;
    if (!process_number) {
      return new Response(JSON.stringify({ error: "process_number é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const tribunal = tribunalHint?.toLowerCase() || inferTribunal(process_number);
    if (!tribunal) {
      return new Response(JSON.stringify({ error: "Não foi possível inferir o tribunal", process_number }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let datajudData = null;
    try { datajudData = await searchDatajud(tribunal, process_number); } catch (e) { console.error(e); }
    if (!datajudData) {
      return new Response(JSON.stringify({ status: "not_found", process_number, tribunal }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const movimentos = datajudData.movimentos || [];
    const phase = extractPhase(movimentos);
    const movimentosSummary = summarizeMovimentos(movimentos);
    const assuntos = (datajudData.assuntos || []).map((a: any) => a.nome).join(", ");
    const classeProcessual = datajudData.classe?.nome || "";
    const valorCausa = datajudData.valorCausa || null;
    const lastUpdate = datajudData.dataHoraUltimaAtualizacao || null;
    const grau = datajudData.grau || "G1";
    const orgaoJulgador = datajudData.orgaoJulgador?.nome || "";
    const advogadosReclamante = (datajudData.partes || []).filter((p: any) => p.polo === "ATIVO").flatMap((p: any) => p.advogados || []).map((a: any) => `${a.nome} (OAB/${a.estadoOAB} ${a.numeroOAB})`).join(", ");
    if (process_id) {
      await supabase.from("process_documents").upsert({
        process_id, document_type: "datajud_enrichment",
        title: `DataJud — ${process_number}`,
        content: JSON.stringify({ source: "datajud", tribunal, grau, classeProcessual, assuntos, orgaoJulgador, valorCausa, lastUpdate, movimentosSummary, advogadosReclamante, movimentos: movimentos.slice(0, 20) }),
        fetched_at: new Date().toISOString(),
      }, { onConflict: "process_id,document_type" });
      const updates: Record<string, any> = { datajud_last_sync: new Date().toISOString() };
      if (valorCausa && valorCausa > 0) updates.claim_value = valorCausa;
      if (phase) updates.phase = phase;
      if (orgaoJulgador) updates.vara = orgaoJulgador;
      if (assuntos) updates.subject_tags = assuntos.split(", ");
      await supabase.from("processes").update(updates).eq("id", process_id);
    }
    return new Response(JSON.stringify({ status: "success", process_number, tribunal, grau, classeProcessual, assuntos, orgaoJulgador, phase, valorCausa, lastUpdate, movimentosSummary, advogadosReclamante, totalMovimentos: movimentos.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
