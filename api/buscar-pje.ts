import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function inferTribunal(processNumber) {
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

async function searchDatajud(tribunal, processNumber, grau) {
  const url = `${DATAJUD_BASE}/api_publica_${tribunal}/_search`;
  const query = { bool: { must: [{ term: { "numeroProcesso.keyword": processNumber } }] } };
  if (grau) query.bool.filter = [{ term: { grau } }];
  const body = { query, size: 10, sort: [{ dataHoraUltimaAtualizacao: { order: "desc" } }] };
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `APIKey ${DATAJUD_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`DataJud ${tribunal}/${grau || "any"} error: ${resp.status}`);
  const data = await resp.json();
  return (data.hits?.hits || []).map((h) => h._source);
}

function extractPhase(movimentos) {
  if (!movimentos?.length) return "conhecimento";
  const sorted = [...movimentos].sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  const code = sorted[0]?.codigo;
  if ([848,849,871,234,235,22].includes(code)) return "execucao";
  if ([193,197,198,201,203,507,534,11009,11010].includes(code)) return "recursal";
  return "conhecimento";
}

function formatMovimentos(movimentos, limit = 30) {
  return [...movimentos]
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
    .slice(0, limit)
    .map((m) => ({ data: new Date(m.dataHora).toLocaleDateString("pt-BR"), dataISO: m.dataHora, codigo: m.codigo, nome: m.nome, complemento: m.complementosTabelados?.[0]?.nome || m.complemento || null }));
}

function extractPartes(partes) {
  const map = (polo) => partes.filter((p) => p.polo === polo).map((p) => ({ nome: p.nome, tipo: p.tipo, advogados: (p.advogados || []).map((a) => ({ nome: a.nome, oab: a.numeroOAB ? `${a.estadoOAB || ""}${a.numeroOAB}` : null })) }));
  return { reclamantes: map("ATIVO"), reclamados: map("PASSIVO") };
}

function buildMovimentosSummary(movimentos, grauLabel) {
  if (!movimentos.length) return `${grauLabel}: Sem movimentacoes registradas.`;
  return movimentos.slice(0, 10).map((m) => `${m.data}: ${m.nome}${m.complemento ? ` (${m.complemento})` : ""}`).join("\n");
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);
    res.setHeader("Access-Control-Allow-Methods", corsHeaders["Access-Control-Allow-Methods"]);
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo nao permitido" });
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { process_id, process_number, tribunal: tribunalHint } = req.body;
    if (!process_number) return res.status(400).json({ error: "process_number e obrigatorio" });
    const tribunal = tribunalHint?.toLowerCase() || inferTribunal(process_number);
    if (!tribunal) return res.status(422).json({ error: "Nao foi possivel inferir o tribunal", process_number });
    const results = {};
    const errors = [];
    for (const grau of ["G1", "G2"]) {
      try { const hits = await searchDatajud(tribunal, process_number, grau); if (hits.length > 0) results[grau] = hits[0]; }
      catch (err) { errors.push(`${grau}: ${err.message}`); }
    }
    if (Object.keys(results).length === 0) {
      try { const hits = await searchDatajud(tribunal, process_number); if (hits.length > 0) results[hits[0].grau || "G1"] = hits[0]; }
      catch (err) { errors.push(`fallback: ${err.message}`); }
    }
    if (Object.keys(results).length === 0) return res.status(200).json({ status: "not_found", process_number, tribunal, errors, message: "Processo nao encontrado no DataJud" });
    const grausEncontrados = [];
    let phaseGlobal = "conhecimento", valorCausa = null, orgaoJulgadorG1 = "", orgaoJulgadorG2 = "", assuntos = "", classeProcessual = "", advogadosReclamante = "";
    const docs = [];
    for (const [grau, data] of Object.entries(results)) {
      const movimentos = data.movimentos || [];
      const partes = data.partes || [];
      const movFmt = formatMovimentos(movimentos);
      const { reclamantes, reclamados } = extractPartes(partes);
      const grauLabel = grau === "G1" ? "1o Grau (Vara do Trabalho)" : "2o Grau (TRT)";
      const phase = extractPhase(movimentos);
      if (grau === "G1") { phaseGlobal = phase; orgaoJulgadorG1 = data.orgaoJulgador?.nome || ""; valorCausa = data.valorCausa || null; assuntos = (data.assuntos || []).map((a) => a.nome).join(", "); classeProcessual = data.classe?.nome || ""; advogadosReclamante = reclamantes.flatMap((r) => r.advogados).map((a) => a.nome + (a.oab ? ` (OAB ${a.oab})` : "")).join(", "); }
      if (grau === "G2") { orgaoJulgadorG2 = data.orgaoJulgador?.nome || ""; if (phase === "recursal" || phase === "execucao") phaseGlobal = phase; }
      grausEncontrados.push(grau);
      docs.push({ process_id: process_id || null, document_type: `pje_${grau.toLowerCase()}`, title: `PJe ${grauLabel} - ${process_number}`, content: JSON.stringify({ source: "datajud", tribunal, grau, grauLabel, classeProcessual: data.classe?.nome || "", assuntos: (data.assuntos || []).map((a) => a.nome).join(", "), orgaoJulgador: data.orgaoJulgador?.nome || "", nivelSigilo: data.nivelSigilo || 0, valorCausa: data.valorCausa || null, lastUpdate: data.dataHoraUltimaAtualizacao || null, phase, reclamantes, reclamados, movimentosSummary: buildMovimentosSummary(movFmt, grauLabel), movimentos: movFmt, totalMovimentos: movimentos.length }), fetched_at: new Date().toISOString() });
    }
    if (process_id) {
      for (const doc of docs) { const { error } = await supabase.from("process_documents").upsert(doc, { onConflict: "process_id,document_type" }); if (error) console.error(`Erro ao salvar ${doc.document_type}:`, error); }
      const updates = { datajud_last_sync: new Date().toISOString(), pje_graus_encontrados: grausEncontrados };
      if (valorCausa && valorCausa > 0) updates.claim_value = valorCausa;
      if (phaseGlobal) updates.phase = phaseGlobal;
      if (orgaoJulgadorG1) updates.vara = orgaoJulgadorG1;
      if (orgaoJulgadorG2) updates.tribunal_orgao_g2 = orgaoJulgadorG2;
      if (assuntos) updates.subject_tags = assuntos.split(", ").filter(Boolean);
      if (classeProcessual) updates.subject_main = classeProcessual;
      const { error: procError } = await supabase.from("processes").update(updates).eq("id", process_id);
      if (procError) console.error("Erro ao atualizar processo:", procError);
    }
    return res.status(200).json({ status: "success", process_number, tribunal, grausEncontrados, phaseGlobal, classeProcessual, assuntos, orgaoJulgadorG1, orgaoJulgadorG2, valorCausa, advogadosReclamante, totalGraus: grausEncontrados.length, movimentosPorGrau: Object.fromEntries(Object.entries(results).map(([g, d]) => [g, (d.movimentos || []).length])), errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("buscar-pje error:", err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}
